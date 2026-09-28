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

const { enqueueAttendanceEvent, processOutboxBatch } = require('./outbox.service');

/**
 * Push một attendance record từ attendance-service về admin thông qua Outbox Pattern.
 * Đảm bảo dữ liệu được lưu bền vững tại local trước, không bị mất khi mạng lỗi.
 *
 * Fix 2: No longer wraps in try-catch. If enqueueAttendanceEvent fails (e.g. DB is down),
 * the error now propagates to the caller (.catch(console.error) in the controller),
 * making the failure visible instead of silently losing the outbox event.
 */
async function pushAttendanceToAdmin(record) {
    const outboxEvent = await enqueueAttendanceEvent({
        employee_id: record.employee_id,
        check_in: record.check_in,
        check_out: record.check_out,
        device_id: record.device_id,
        confidence: record.confidence,
        method: record.method || 'face',
    });

    // Trigger immediate sync asynchronously
    processOutboxBatch().catch((err) => {
        console.error('[SYNC_OUTBOX] Immediate sync trigger failed:', err.message);
    });

    return outboxEvent;
}

module.exports = { pushAttendanceToAdmin };

