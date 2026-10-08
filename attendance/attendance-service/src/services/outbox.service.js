const crypto = require('crypto');

/**
 * Tính HMAC-SHA256(secret, message) — dùng để ký request gửi sang admin-service.
 * Format message: `timestamp:sha256(body_json)`
 */
function buildSyncHeaders(syncSecret, body) {
    const timestamp = Date.now().toString();
    const bodyStr = JSON.stringify(body);
    const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    const message = `${timestamp}:${bodyHash}`;
    const signature = crypto
        .createHmac('sha256', String(syncSecret))
        .update(message)
        .digest('hex');
    return {
        'x-sync-timestamp': timestamp,
        'x-sync-signature': signature,
    };
}
const axios = require('axios');
const env = require('../config/env');
const AttendanceOutbox = require('../models/AttendanceOutbox');

const getAdminUrl = () => process.env.ADMIN_URL || env.adminUrl || 'http://localhost:5000/api/v1';
const getSyncSecret = () => process.env.SYNC_SECRET || env.syncSecret;

/**
 * Enqueue attendance event into outbox table.
 * Zero data loss guarantee: record is persisted locally before network transmission.
 */
async function enqueueAttendanceEvent(payload) {
    const eventId = crypto.randomUUID();
    const eventType = payload.check_out ? 'attendance.checked_out' : 'attendance.checked_in';

    const outboxRecord = await AttendanceOutbox.create({
        event_id: eventId,
        event_type: eventType,
        payload: {
            employee_id: payload.employee_id,
            check_in: payload.check_in,
            check_out: payload.check_out || null,
            device_id: payload.device_id || null,
            confidence: payload.confidence ?? null,
            method: payload.method || 'face',
        },
        status: 'pending',
        retry_count: 0,
        max_retries: 5,
        next_retry_at: new Date(),
    });

    return outboxRecord;
}

/**
 * Process a batch of pending/retryable outbox events.
 */
async function processOutboxBatch(batchSize = 10) {
    const adminUrl = getAdminUrl();
    const syncSecret = getSyncSecret();
    if (!adminUrl || !syncSecret) {
        return { processed: 0, errors: 0 };
    }

    // Fix 3: Recover events stuck in 'processing' state.
    // If the process crashed or was restarted while an event was mid-flight,
    // it stays in 'processing' forever because the worker only queries
    // 'pending' and 'failed'. Reset any stale 'processing' records (older
    // than 60 s) back to 'failed' so they are picked up on the next cycle.
    const stuckThreshold = new Date(Date.now() - 60_000);
    const recovered = await AttendanceOutbox.updateMany(
        { status: 'processing', updated_at: { $lt: stuckThreshold } },
        {
            $set: {
                status: 'failed',
                last_error: 'Recovered from stuck processing state (process crash or restart)',
            },
        }
    );
    if (recovered.modifiedCount > 0) {
        console.warn(`[OUTBOX_WORKER] Recovered ${recovered.modifiedCount} stuck 'processing' event(s) → 'failed'`);
    }

    const now = new Date();
    const pendingEvents = await AttendanceOutbox.find({
        status: { $in: ['pending', 'failed'] },
        next_retry_at: { $lte: now },
    })
        .sort({ next_retry_at: 1 })
        .limit(batchSize);

    if (!pendingEvents.length) {
        return { processed: 0, errors: 0 };
    }


    let processedCount = 0;
    let errorCount = 0;

    for (const event of pendingEvents) {
        event.status = 'processing';
        await event.save();

        try {
            const requestBody = {
                event_id: event.event_id,
                event_type: event.event_type,
                ...event.payload,
            };

            // P0-TLS-04: Sign request with HMAC timestamp to prevent replay attacks
            const syncHeaders = syncSecret
                ? buildSyncHeaders(syncSecret, requestBody)
                : {};

            await axios.post(
                `${adminUrl}/attendance/sync-from-device`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...syncHeaders,
                    },
                    timeout: 5000,
                }
            );

            event.status = 'completed';
            event.processed_at = new Date();
            event.last_error = null;
            await event.save();
            processedCount++;
        } catch (err) {
            errorCount++;
            event.retry_count = (event.retry_count || 0) + 1;
            event.last_error = err.message || 'Unknown sync error';

            if (event.retry_count >= event.max_retries) {
                event.status = 'dead_letter';
                console.error(`[OUTBOX] Event ${event.event_id} moved to DEAD_LETTER after ${event.retry_count} retries: ${err.message}`);
            } else {
                event.status = 'failed';
                // Exponential backoff: 2s, 4s, 8s, 16s...
                const backoffSeconds = Math.pow(2, event.retry_count);
                event.next_retry_at = new Date(Date.now() + backoffSeconds * 1000);
                console.warn(`[OUTBOX] Event ${event.event_id} sync failed (attempt ${event.retry_count}/${event.max_retries}). Next retry in ${backoffSeconds}s`);
            }
            await event.save();
        }
    }

    return { processed: processedCount, errors: errorCount };
}

let _workerTimer = null;

function startOutboxWorker(intervalMs = 4000) {
    if (_workerTimer) return;

    _workerTimer = setInterval(async () => {
        try {
            await processOutboxBatch();
        } catch (err) {
            console.error('[OUTBOX_WORKER] Error in outbox processing loop:', err.message);
        }
    }, intervalMs);

    if (_workerTimer.unref) {
        _workerTimer.unref();
    }
    console.log(`[OUTBOX_WORKER] Reliable attendance outbox worker started (interval: ${intervalMs}ms)`);
}

function stopOutboxWorker() {
    if (_workerTimer) {
        clearInterval(_workerTimer);
        _workerTimer = null;
        console.log('[OUTBOX_WORKER] Outbox worker stopped');
    }
}

async function getDeadLetterEvents({ limit = 50, page = 1 } = {}) {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
        AttendanceOutbox.find({ status: 'dead_letter' })
            .sort({ updated_at: -1 })
            .skip(skip)
            .limit(limit),
        AttendanceOutbox.countDocuments({ status: 'dead_letter' }),
    ]);
    return { events, total, page, limit };
}

async function replayDeadLetterEvent(eventId) {
    const event = await AttendanceOutbox.findOne({ event_id: eventId, status: 'dead_letter' });
    if (!event) {
        return null;
    }
    event.status = 'pending';
    event.retry_count = 0;
    event.next_retry_at = new Date();
    event.last_error = null;
    await event.save();
    return event;
}

async function getOutboxStats() {
    const counts = await AttendanceOutbox.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0, dead_letter: 0 };
    counts.forEach(c => {
        if (stats[c._id] !== undefined) stats[c._id] = c.count;
    });
    return stats;
}

module.exports = {
    enqueueAttendanceEvent,
    processOutboxBatch,
    startOutboxWorker,
    stopOutboxWorker,
    getDeadLetterEvents,
    replayDeadLetterEvent,
    getOutboxStats,
};
