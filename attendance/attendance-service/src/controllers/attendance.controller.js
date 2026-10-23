const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const LocalEmployee = require('../models/LocalEmployee');
const LocalDevice = require('../models/LocalDevice');
const { pushAttendanceToAdmin } = require('../services/adminSync.service');
// Fix 6: Import CONFIDENCE_THRESHOLD from the canonical source instead of duplicating it here.
// registration.controller.js already uses this same import — one source of truth.
const {
    cosineSimilarity,
    validateLiveness,
    CONFIDENCE_THRESHOLD,
    MAX_CANDIDATES_PER_INFERENCE,
} = require('../utils/faceMatching');
const { decryptJSON } = require('../utils/cryptoVault');

const axios = require('axios');
const env = require('../config/env');

// @desc    Nhận diện khuôn mặt và chấm công tự động
// @route   POST /api/attendance/recognize
exports.recognize = async (req, res) => {
    try {
        const { embedding, device_id } = req.body;

        // P1-BIO-02: Liveness & anti-spoofing verification
        const livenessCheck = validateLiveness(req.body);
        if (!livenessCheck.valid) {
            return res.status(403).json({
                success: false,
                code: 'LIVENESS_FAILED',
                message: livenessCheck.reason,
            });
        }

        // Fix 4: Validate each required field separately so the client gets a clear
        // 400 message instead of a 500 from the Mongoose ValidationError later.
        if (!Array.isArray(embedding) || embedding.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'embedding is required and must be a non-empty array'
            });
        }
        if (!device_id) {
            return res.status(400).json({
                success: false,
                message: 'device_id is required'
            });
        }

        // P1-BIO-07: Query candidate vector boundary limited to active employees & capped batch
        const employees = await LocalEmployee.find({
            status: 'Active',
            face_embedding: { $ne: null }
        }).limit(MAX_CANDIDATES_PER_INFERENCE);

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                code: 'NO_ENROLLED_FACE',
                message: 'Chua co nhan vien nao da dang ky khuon mat tren Attendance Service',
                confidence: -1
            });
        }

        let bestMatch = null;
        let maxSimilarity = -1;

        try {
            // Chuẩn bị dữ liệu cho AI service (giải mã embedding đã mã hóa từ DB)
            const candidates = employees
                .map(emp => {
                    const decrypted = emp.getDecryptedEmbedding ? emp.getDecryptedEmbedding() : decryptJSON(emp.face_embedding);
                    if (!Array.isArray(decrypted)) return null;
                    return {
                        id: emp.employee_id,
                        embedding: decrypted
                    };
                })
                .filter(Boolean);

            if (candidates.length === 0) {
                return res.status(404).json({
                    success: false,
                    code: 'NO_VALID_ENROLLED_FACE',
                    message: 'Khong co du lieu khuon mat hop le sau khi giai ma',
                    confidence: -1
                });
            }

            // Gọi AI service để tính toán so khớp vector (Vectorized Search)
            const aiResponse = await axios.post(`${env.aiServiceUrl}/compute-match`, {
                query_embedding: embedding,
                candidates,
                threshold: CONFIDENCE_THRESHOLD
            }, {
                headers: env.aiApiKey ? { 'x-api-key': env.aiApiKey } : {}
            });

            if (aiResponse.data?.match_found) {
                const matchId = aiResponse.data.match.id;
                bestMatch = employees.find(e => e.employee_id === matchId);
                maxSimilarity = aiResponse.data.match.score;
            } else {
                maxSimilarity = aiResponse.data.best_score || -1;
            }
        } catch (error) {
            console.error('[AI_MATCH] AI Service call failed, falling back to manual loop:', error.message);
            // Fallback: Nếu AI service lỗi, dùng vòng lặp truyền thống để đảm bảo hệ thống vẫn chạy
            for (const emp of employees) {
                try {
                    const decrypted = emp.getDecryptedEmbedding ? emp.getDecryptedEmbedding() : decryptJSON(emp.face_embedding);
                    if (!Array.isArray(decrypted)) continue;
                    const similarity = cosineSimilarity(embedding, decrypted);
                    if (similarity > maxSimilarity) {
                        maxSimilarity = similarity;
                        bestMatch = emp;
                    }
                } catch (_e) {}
            }
        }

        if (!bestMatch || maxSimilarity < CONFIDENCE_THRESHOLD) {
            return res.status(404).json({
                success: false,
                message: 'Không nhận diện được khuôn mặt',
                confidence: maxSimilarity
            });
        }

        const confidence = Math.min(1, Math.max(0, maxSimilarity));
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Fix 1: Use a single atomic findOneAndUpdate to handle the check-out path.
        // Previously two separate queries (findOne → read → save) created a race window
        // where two concurrent requests could both read "no check-out exists" and both
        // proceed to create a new check-in record.
        //
        // By looking for any open record ($or: check_out null or missing) sorted by latest check_in,
        // we support overnight shifts where the check-in occurred on the previous day.
        const openRecord = await Attendance.findOneAndUpdate(
            {
                employee_id: bestMatch.employee_id,
                $or: [{ check_out: { $exists: false } }, { check_out: null }],
            },
            { $set: { check_out: new Date(), status: 'present' } },
            { new: true, sort: { check_in: -1 } }
        );

        if (openRecord) {
            // Push update to admin via outbox (reliable sync)
            pushAttendanceToAdmin(openRecord).catch(console.error);

            return res.status(200).json({
                success: true,
                message: 'Xác nhận check-out thành công',
                action: 'check-out',
                employee: {
                    employee_id: bestMatch.employee_id,
                    full_name: bestMatch.full_name,
                    confidence: (confidence * 100).toFixed(2) + '%'
                }
            });
        }

        // No open record — check if the employee already completed attendance today
        const completedToday = await Attendance.findOne({
            employee_id: bestMatch.employee_id,
            check_in: { $gte: todayStart },
            check_out: { $ne: null },
        });

        if (completedToday) {
            return res.status(200).json({
                success: true,
                message: 'Bạn đã hoàn tất chấm công ngày hôm nay',
                employee: bestMatch
            });
        }

        // Create new check-in record atomically with outbox
        let attendanceRecord;
        try {
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    const created = await Attendance.create(
                        [{
                            employee_id: bestMatch.employee_id,
                            device_id,
                            check_in: new Date(),
                            confidence,
                            status: 'present'
                        }],
                        { session }
                    );
                    attendanceRecord = created[0];
                    await pushAttendanceToAdmin(attendanceRecord, { session });
                });
            } catch (txError) {
                // Graceful fallback for standalone MongoDB where replica sets are not configured
                if (txError.message && (txError.message.includes('replica set') || txError.message.includes('standalone'))) {
                    attendanceRecord = await Attendance.create({
                        employee_id: bestMatch.employee_id,
                        device_id,
                        check_in: new Date(),
                        confidence,
                        status: 'present'
                    });
                    await pushAttendanceToAdmin(attendanceRecord);
                } else {
                    throw txError;
                }
            } finally {
                await session.endSession();
            }
        } catch (_sessErr) {
            attendanceRecord = await Attendance.create({
                employee_id: bestMatch.employee_id,
                device_id,
                check_in: new Date(),
                confidence,
                status: 'present'
            });
            await pushAttendanceToAdmin(attendanceRecord);
        }

        return res.status(200).json({
            success: true,
            message: 'Xác nhận check-in thành công',
            action: 'check-in',
            employee: {
                employee_id: bestMatch.employee_id,
                full_name: bestMatch.full_name,
                confidence: (confidence * 100).toFixed(2) + '%'
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// @desc    Check-in thủ công
exports.checkIn = async (req, res) => {
    try {
        if (!req.body.employee_id || !req.body.device_id) {
            return res.status(400).json({ success: false, message: 'employee_id and device_id are required' });
        }

        // P0 Sec: Chống bypass nhận diện sinh trắc học khi chạy production
        if (process.env.NODE_ENV === 'production' && !req.headers['x-sync-secret'] && !req.headers['x-device-token']) {
            return res.status(403).json({
                success: false,
                code: 'MANUAL_CHECKIN_UNAUTHORIZED',
                message: 'Manual check-in requires authorized credentials or sync secret in production',
            });
        }

        const payload = {
            employee_id: req.body.employee_id,
            device_id: req.body.device_id,
            check_in: req.body.check_in ? new Date(req.body.check_in) : new Date(),
            status: req.body.status || 'present',
            method: 'manual',
        };

        if (typeof req.body.confidence === 'number') {
            payload.confidence = req.body.confidence;
        }

        const attendance = await Attendance.create(payload);
        pushAttendanceToAdmin(attendance).catch(console.error);

        res.status(201).json({ success: true, data: attendance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Check-out thủ công
exports.checkOut = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;
        let attendance;

        if (id) {
            attendance = await Attendance.findOneAndUpdate(
                { _id: id, $or: [{ check_out: { $exists: false } }, { check_out: null }] },
                { check_out: new Date() },
                { new: true }
            );
        } else if (req.body.employee_id) {
            attendance = await Attendance.findOneAndUpdate(
                {
                    employee_id: req.body.employee_id,
                    $or: [{ check_out: { $exists: false } }, { check_out: null }],
                },
                { check_out: new Date() },
                { new: true, sort: { check_in: -1 } }
            );
        } else {
            return res.status(400).json({ success: false, message: 'id or employee_id is required' });
        }

        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' });
        }

        pushAttendanceToAdmin(attendance).catch(console.error);

        res.status(200).json({ success: true, data: attendance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


