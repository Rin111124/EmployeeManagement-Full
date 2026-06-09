const Attendance = require('../models/Attendance');
const LocalEmployee = require('../models/LocalEmployee');
const LocalDevice = require('../models/LocalDevice');
const { pushAttendanceToAdmin } = require('../services/adminSync.service');
const { cosineSimilarity } = require('../utils/faceMatching');

/**
 * Ngưỡng độ tương đồng tối thiểu để xác nhận nhận dạng khuôn mặt.
 * Hạ xuống 0.45 để phù hợp với môi trường thực tế (ánh sáng, góc chụp khác nhau).
 * 0.82 là quá khắt khe đối với InsightFace buffalo_l trong thực tế.
 */
const CONFIDENCE_THRESHOLD = 0.45;

const axios = require('axios');
const env = require('../config/env');

// @desc    Nhận diện khuôn mặt và chấm công tự động
// @route   POST /api/attendance/recognize
exports.recognize = async (req, res) => {
    try {
        const { embedding, device_id } = req.body;

        if (!Array.isArray(embedding) || embedding.length === 0 || !device_id) {
            return res.status(400).json({
                success: false,
                message: 'embedding and device_id are required'
            });
        }

        const employees = await LocalEmployee.find({
            status: 'Active',
            face_embedding: { $exists: true, $not: { $size: 0 } }
        });

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
            // Chuẩn bị dữ liệu cho AI service
            const candidates = employees.map(emp => ({
                id: emp.employee_id,
                embedding: emp.face_embedding
            }));

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
                    const similarity = cosineSimilarity(embedding, emp.face_embedding);
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

        // BUG-6 FIX: query bằng khoảng thời gian work_date (0h → 23:59:59)
        // thay vì check_in >= today để tránh sai ngày khi làm ca đêm qua 0h.
        let attendance = await Attendance.findOne({
            employee_id: bestMatch.employee_id,
            $or: [{ check_out: { $exists: false } }, { check_out: null }],
        }).sort({ check_in: -1 });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const completedToday = attendance ? null : await Attendance.findOne({
            employee_id: bestMatch.employee_id,
            check_in: { $gte: todayStart, $lte: todayEnd },
            check_out: { $ne: null },
        });

        const confidence = Math.min(1, Math.max(0, maxSimilarity));

        let action = 'check-in';
        if (attendance) {
            if (!attendance.check_out) {
                attendance.check_out = new Date();
                attendance.status = 'present';
                await attendance.save();

                // Push update to admin (fire-and-forget, không block response)
                pushAttendanceToAdmin(attendance).catch(console.error);

                action = 'check-out';
            } else {
                return res.status(200).json({
                    success: true,
                    message: 'Bạn đã hoàn tất chấm công ngày hôm nay',
                    employee: bestMatch
                });
            }
        } else if (completedToday) {
            return res.status(200).json({
                success: true,
                message: 'Ban da hoan tat cham cong ngay hom nay',
                employee: bestMatch
            });
        } else {
            attendance = await Attendance.create({
                employee_id: bestMatch.employee_id,
                device_id: device_id,
                check_in: new Date(),
                confidence,
                status: 'present'
            });

            // Push check-in to admin (fire-and-forget)
            pushAttendanceToAdmin(attendance).catch(console.error);
        }

        res.status(200).json({
            success: true,
            message: `Xác nhận ${action} thành công`,
            action,
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

        const payload = {
            employee_id: req.body.employee_id,
            device_id: req.body.device_id,
            check_in: req.body.check_in ? new Date(req.body.check_in) : new Date(),
            status: req.body.status || 'present',
        };

        if (typeof req.body.confidence === 'number') {
            payload.confidence = req.body.confidence;
        }

        const attendance = await Attendance.create(payload);
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
                { check_out: Date.now() },
                { new: true }
            );
        } else if (req.body.employee_id) {
            attendance = await Attendance.findOneAndUpdate(
                {
                    employee_id: req.body.employee_id,
                    $or: [{ check_out: { $exists: false } }, { check_out: null }],
                },
                { check_out: Date.now() },
                { new: true, sort: { check_in: -1 } }
            );
        } else {
            return res.status(400).json({ success: false, message: 'id or employee_id is required' });
        }

        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' });
        }

        res.status(200).json({ success: true, data: attendance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
