const LocalEmployee = require('../models/LocalEmployee');
const axios = require('axios');
const { cosineSimilarity, validateEmbedding, CONFIDENCE_THRESHOLD } = require('../utils/faceMatching');
const env = require('../config/env');

// @desc    Đăng ký khuôn mặt cho nhân viên tại thiết bị
// @route   POST /api/registration/enroll
exports.enrollFace = async (req, res) => {
    try {
        const { employee_id, full_name, embedding } = req.body;

        // Validate required fields
        if (!employee_id) {
            return res.status(400).json({
                success: false,
                message: 'Missing employee_id'
            });
        }

        if (!embedding) {
            return res.status(400).json({
                success: false,
                message: 'Missing embedding'
            });
        }

        // Validate embedding format and quality
        try {
            validateEmbedding(embedding);
        } catch (validationErr) {
            return res.status(400).json({
                success: false,
                message: `Invalid embedding: ${validationErr.message}`
            });
        }

        // 1. Lưu vào Database cục bộ của Hệ thống Chấm công (Tách biệt)
        const employee = await LocalEmployee.findOneAndUpdate(
            { employee_id },
            {
                full_name,
                face_embedding: embedding,
                last_sync: Date.now()
            },
            { upsert: true, new: true }
        );

        console.log(`[Registration] Face enrolled for employee ${employee_id}`);

        // 2. Thông báo ngược lại cho hệ thống Admin (Kết nối)
        if (env.adminUrl && env.nodeEnv !== 'test') {
            try {
                console.log(
                    `[Registration] Notifying Admin: ${employee_id} via device ${req.body.device_id}`
                );

                const adminApiUrl = String(env.adminUrl)
                    .replace(/\/+$/, '')
                    .includes('/api/v1')
                    ? String(env.adminUrl).replace(/\/+$/, '')
                    : `${String(env.adminUrl).replace(/\/+$/, '')}/api/v1`;

                const notifyHeaders = {};
                if (env.syncSecret) {
                    notifyHeaders['x-sync-secret'] = env.syncSecret;
                }

                const response = await axios.patch(
                    `${adminApiUrl}/employees/${employee_id}/confirm-biometrics`,
                    {
                        status: 'registered',
                        device_id: req.body.device_id,
                        embedding,
                    },
                    {
                        headers: notifyHeaders
                    }
                );
                console.log('[Registration] Admin notification success:', response.data.message);
            } catch (adminError) {
                console.error('Failed to notify Admin system:', adminError.message);
                if (adminError.response) {
                    console.error('Admin Response Data:', adminError.response.data);
                    console.error('Admin Response Status:', adminError.response.status);
                }
                // Don't fail enrollment if admin notification fails
                // The embedding is already saved in attendance service
            }
        }

        res.status(200).json({
            success: true,
            message: 'Face registered successfully in Attendance System',
            data: {
                employee_id: employee.employee_id,
                full_name: employee.full_name
            }
        });
    } catch (err) {
        console.error('[enrollFace] Error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Face registration failed: ' + err.message
        });
    }
};

/**
 * @desc    Match face embedding against enrolled employees
 * @route   POST /api/registration/match
 * @query   ?confidence_threshold=0.6
 * @access  Public (Device/Mobile, should add auth in production)
 */
exports.matchFace = async (req, res) => {
    try {
        const { embedding } = req.body;
        const threshold = Number(req.query.confidence_threshold || CONFIDENCE_THRESHOLD);

        // Validate embedding input
        if (!embedding) {
            return res.status(400).json({
                success: false,
                message: 'Missing embedding in request body'
            });
        }

        // Validate embedding format and quality
        try {
            validateEmbedding(embedding);
        } catch (validationErr) {
            return res.status(400).json({
                success: false,
                message: `Invalid embedding: ${validationErr.message}`
            });
        }

        // Validate threshold
        if (threshold < 0 || threshold > 1) {
            return res.status(400).json({
                success: false,
                message: 'Confidence threshold must be between 0 and 1'
            });
        }

        // Get all enrolled employees with valid face embeddings
        const employees = await LocalEmployee.find({
            'face_embedding.0': { $exists: true }
        }).lean();

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No enrolled employees in system'
            });
        }

        // Calculate similarity scores
        const results = employees
            .map((emp) => {
                try {
                    const similarity = cosineSimilarity(embedding, emp.face_embedding);
                    return {
                        employee_id: emp.employee_id,
                        full_name: emp.full_name,
                        confidence: parseFloat(similarity.toFixed(4)),
                        matched: similarity >= threshold
                    };
                } catch (err) {
                    console.error(`[matchFace] Error matching against ${emp.employee_id}:`, err.message);
                    return null;
                }
            })
            .filter((r) => r !== null);

        if (results.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Error calculating face similarities'
            });
        }

        // Find best match
        const bestMatch = results.reduce((best, curr) =>
            curr.confidence > best.confidence ? curr : best
        );

        // Check if best match meets threshold
        if (!bestMatch.matched) {
            return res.status(404).json({
                success: false,
                message: 'No matching face found above threshold',
                top_match: {
                    employee_id: bestMatch.employee_id,
                    confidence: bestMatch.confidence,
                    full_name: bestMatch.full_name
                }
            });
        }

        // Success - return matched employee
        console.log(
            `[matchFace] Match found: ${bestMatch.full_name} (${bestMatch.employee_id}) ` +
            `with confidence ${bestMatch.confidence}`
        );

        res.status(200).json({
            success: true,
            message: 'Face match found',
            data: {
                employee_id: bestMatch.employee_id,
                full_name: bestMatch.full_name,
                confidence: bestMatch.confidence
            }
        });
    } catch (err) {
        console.error('[matchFace] Unexpected error:', err);
        res.status(500).json({
            success: false,
            message: 'Face matching failed: ' + err.message
        });
    }
};
