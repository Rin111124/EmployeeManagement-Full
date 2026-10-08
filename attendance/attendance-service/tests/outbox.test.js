process.env.NODE_ENV = 'test';
process.env.SYNC_SECRET = 'test-sync-secret-at-least-32-chars';
process.env.ADMIN_URL = 'http://mock-admin:5000/api/v1';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const axios = require('axios');
const AttendanceOutbox = require('../src/models/AttendanceOutbox');
const {
    enqueueAttendanceEvent,
    processOutboxBatch,
} = require('../src/services/outbox.service');

let mongo;

test.before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
});

test.afterEach(async () => {
    await AttendanceOutbox.deleteMany({});
});

test.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});

test('Outbox: enqueueAttendanceEvent persists record locally with unique event_id', async () => {
    const checkIn = new Date();
    const event = await enqueueAttendanceEvent({
        employee_id: 'EMP-OUTBOX-001',
        check_in: checkIn,
        device_id: 'KIOSK-01',
        confidence: 0.95,
        method: 'face',
    });

    assert.ok(event.event_id, 'Must generate event_id');
    assert.equal(event.status, 'pending');
    assert.equal(event.event_type, 'attendance.checked_in');
    assert.equal(event.payload.employee_id, 'EMP-OUTBOX-001');
    assert.equal(event.retry_count, 0);

    const saved = await AttendanceOutbox.findOne({ event_id: event.event_id });
    assert.ok(saved);
    assert.equal(saved.status, 'pending');
});

test('Outbox: processOutboxBatch marks event completed on successful transmission', async () => {
    const originalPost = axios.post;
    let sentPayload = null;

    axios.post = async (url, data, config) => {
        sentPayload = { url, data, config };
        return { status: 200, data: { success: true } };
    };

    try {
        const event = await enqueueAttendanceEvent({
            employee_id: 'EMP-OUTBOX-002',
            check_in: new Date(),
            device_id: 'KIOSK-02',
        });

        const result = await processOutboxBatch();
        assert.equal(result.processed, 1);
        assert.equal(result.errors, 0);

        assert.ok(sentPayload);
        assert.equal(sentPayload.data.event_id, event.event_id);
        assert.ok(sentPayload.config.headers['x-sync-timestamp'], 'Must include HMAC timestamp');
        assert.ok(sentPayload.config.headers['x-sync-signature'], 'Must include HMAC signature');

        const updated = await AttendanceOutbox.findOne({ event_id: event.event_id });
        assert.equal(updated.status, 'completed');
        assert.ok(updated.processed_at);
        assert.equal(updated.last_error, null);
    } finally {
        axios.post = originalPost;
    }
});

test('Outbox: retry with exponential backoff on failure and transitions to dead_letter', async () => {
    const originalPost = axios.post;

    axios.post = async () => {
        throw new Error('Network Connection Refused');
    };

    try {
        const event = await enqueueAttendanceEvent({
            employee_id: 'EMP-OUTBOX-003',
            check_in: new Date(),
            device_id: 'KIOSK-03',
        });

        // 1st Failure
        const res1 = await processOutboxBatch();
        assert.equal(res1.errors, 1);

        let record = await AttendanceOutbox.findOne({ event_id: event.event_id });
        assert.equal(record.status, 'failed');
        assert.equal(record.retry_count, 1);
        assert.ok(record.last_error.includes('Network Connection Refused'));
        assert.ok(record.next_retry_at > new Date(Date.now() + 1000));

        // Simulate reaching max retries (e.g. 4 retries already, this is the 5th)
        record.retry_count = 4;
        record.next_retry_at = new Date(Date.now() - 1000); // Ready for retry
        await record.save();

        const res2 = await processOutboxBatch();
        assert.equal(res2.errors, 1);

        record = await AttendanceOutbox.findOne({ event_id: event.event_id });
        assert.equal(record.status, 'dead_letter');
        assert.equal(record.retry_count, 5);
    } finally {
        axios.post = originalPost;
    }
});

test('Outbox API: Protected endpoints return DLQ list, stats, and allow manual replay', async () => {
    const request = require('supertest');
    const app = require('../src/app');

    // Create 1 dead letter event and 1 pending event
    await AttendanceOutbox.create({
        event_id: 'DLQ-EVENT-001',
        event_type: 'attendance.checked_in',
        payload: { employee_id: 'EMP-FAIL', check_in: new Date() },
        status: 'dead_letter',
        retry_count: 5,
        max_retries: 5,
        last_error: 'Connection timeout after 5 attempts',
    });

    await AttendanceOutbox.create({
        event_id: 'PENDING-EVENT-002',
        event_type: 'attendance.checked_in',
        payload: { employee_id: 'EMP-OK', check_in: new Date() },
        status: 'pending',
    });

    // 1. Unauthenticated request rejected
    await request(app)
        .get('/api/outbox/stats')
        .expect(401);

    // 2. Authenticated request gets stats
    const statsRes = await request(app)
        .get('/api/outbox/stats')
        .set('x-sync-secret', process.env.SYNC_SECRET)
        .expect(200);

    assert.equal(statsRes.body.data.dead_letter, 1);
    assert.equal(statsRes.body.data.pending, 1);

    // 3. Authenticated request gets DLQ list
    const dlqRes = await request(app)
        .get('/api/outbox/dlq')
        .set('x-sync-secret', process.env.SYNC_SECRET)
        .expect(200);

    assert.equal(dlqRes.body.data.total, 1);
    assert.equal(dlqRes.body.data.events[0].event_id, 'DLQ-EVENT-001');

    // 4. Replay dead-letter event
    const replayRes = await request(app)
        .post('/api/outbox/dlq/DLQ-EVENT-001/retry')
        .set('x-sync-secret', process.env.SYNC_SECRET)
        .expect(200);

    assert.equal(replayRes.body.success, true);
    assert.equal(replayRes.body.data.status, 'pending');
    assert.equal(replayRes.body.data.retry_count, 0);

    const reloaded = await AttendanceOutbox.findOne({ event_id: 'DLQ-EVENT-001' });
    assert.equal(reloaded.status, 'pending');
    assert.equal(reloaded.retry_count, 0);
});

