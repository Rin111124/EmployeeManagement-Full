require('dotenv').config();
const axios = require('axios');
const env = require('../config/env');

const ADMIN_URL = env.adminUrl;
const SYNC_SECRET = env.syncSecret;

// Warn once at startup if sync is disabled
if (!SYNC_SECRET) {
    console.warn(
        '[SYNC] WARNING: SYNC_SECRET env var is not set. ' +
        'Attendance records will NOT be pushed to the Admin system. ' +
        'Set SYNC_SECRET in your .env file to enable sync.'
    );
}

/**
 * Push một attendance record từ attendance-service về admin.
 * Fire-and-forget: caller should .catch() any errors.
 */
async function pushAttendanceToAdmin(record) {
    if (process.env.NODE_ENV === 'test') {
        return;
    }

    if (!ADMIN_URL || !SYNC_SECRET) {
        // Already warned at startup — no need to spam per-request logs
        return;
    }

    try {
        await axios.post(`${ADMIN_URL}/attendance/sync-from-device`, {
            employee_id: record.employee_id,
            check_in: record.check_in,
            check_out: record.check_out,
            device_id: record.device_id,
            confidence: record.confidence,
            method: 'face',
        }, {
            headers: { 'x-sync-secret': SYNC_SECRET },
            timeout: 5000,
        });
        console.log('[SYNC] Attendance pushed to Admin successfully');
    } catch (err) {
        // Không fail khi sync lỗi — local đã lưu rồi
        console.error('[SYNC] Failed to push to Admin:', err.message);
        if (err.response && err.response.data) {
            console.error('[SYNC] Admin Response:', JSON.stringify(err.response.data));
        }
    }
}

module.exports = { pushAttendanceToAdmin };
