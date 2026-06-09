process.env.NODE_ENV = 'test';
process.env.SYNC_SECRET = 'test-sync-secret-at-least-32-chars';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Attendance = require('../src/models/Attendance');
const LocalEmployee = require('../src/models/LocalEmployee');

let mongo;

test.before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
});

test.afterEach(async () => {
    await Attendance.deleteMany({});
    await LocalEmployee.deleteMany({});
});

test.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});

function unitEmbedding(seed = 1) {
    const vector = Array.from({ length: 512 }, (_, index) => ((index + seed) % 17) - 8);
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return vector.map((value) => value / norm);
}

test('enroll stores face embedding and recognition creates check-in/check-out', async () => {
    const embedding = unitEmbedding();

    const enroll = await request(app)
        .post('/api/registration/enroll')
        .send({
            employee_id: 'emp-001',
            full_name: 'Test Employee',
            embedding,
            device_id: 'CAM-001',
        })
        .expect(200);

    assert.equal(enroll.body.success, true);

    const checkIn = await request(app)
        .post('/api/attendance/recognize')
        .send({ embedding, device_id: 'CAM-001' })
        .expect(200);

    assert.equal(checkIn.body.success, true);
    assert.equal(checkIn.body.action, 'check-in');
    assert.equal(checkIn.body.employee.employee_id, 'emp-001');

    const checkOut = await request(app)
        .post('/api/attendance/recognize')
        .send({ embedding, device_id: 'CAM-001' })
        .expect(200);

    assert.equal(checkOut.body.success, true);
    assert.equal(checkOut.body.action, 'check-out');

    const record = await Attendance.findOne({ employee_id: 'emp-001' });
    assert.ok(record.check_in);
    assert.ok(record.check_out);
    assert.equal(record.device_id, 'CAM-001');
});

test('recognition closes latest open record even when check-in was on previous day', async () => {
    const embedding = unitEmbedding(8);

    await request(app)
        .post('/api/registration/enroll')
        .send({
            employee_id: 'emp-night-001',
            full_name: 'Night Shift Employee',
            embedding,
            device_id: 'CAM-001',
        })
        .expect(200);

    await request(app)
        .post('/api/attendance/recognize')
        .send({ embedding, device_id: 'CAM-001' })
        .expect(200);

    const record = await Attendance.findOne({ employee_id: 'emp-night-001' });
    record.check_in = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await record.save();

    const checkOut = await request(app)
        .post('/api/attendance/recognize')
        .send({ embedding, device_id: 'CAM-001' })
        .expect(200);

    assert.equal(checkOut.body.action, 'check-out');

    const records = await Attendance.find({ employee_id: 'emp-night-001' });
    assert.equal(records.length, 1);
    assert.ok(records[0].check_out);
});

test('recognition rejects invalid payload and unknown embeddings', async () => {
    await request(app)
        .post('/api/attendance/recognize')
        .send({ embedding: [], device_id: 'CAM-001' })
        .expect(400);

    await LocalEmployee.create({
        employee_id: 'emp-002',
        full_name: 'Other Employee',
        face_embedding: unitEmbedding(2),
    });

    const response = await request(app)
        .post('/api/attendance/recognize')
        .send({ embedding: unitEmbedding(9), device_id: 'CAM-001' })
        .expect(404);

    assert.equal(response.body.success, false);
});

test('recognition reports when no employee faces are enrolled', async () => {
    const response = await request(app)
        .post('/api/attendance/recognize')
        .send({ embedding: unitEmbedding(), device_id: 'CAM-001' })
        .expect(404);

    assert.equal(response.body.success, false);
    assert.equal(response.body.code, 'NO_ENROLLED_FACE');
    assert.equal(response.body.confidence, -1);
});

test('employee sync restores face embeddings from admin payload', async () => {
    const embedding = unitEmbedding(4);

    await request(app)
        .post('/api/sync/employees')
        .set('x-sync-secret', process.env.SYNC_SECRET)
        .send({
            employees: [{
                employee_id: 'emp-sync-001',
                employee_code: 'EMP-SYNC-001',
                full_name: 'Synced Employee',
                status: 'Active',
                face_embedding: embedding,
            }],
        })
        .expect(200);

    const synced = await LocalEmployee.findOne({ employee_id: 'emp-sync-001' });
    assert.ok(synced);
    assert.equal(synced.face_embedding.length, 512);
});
