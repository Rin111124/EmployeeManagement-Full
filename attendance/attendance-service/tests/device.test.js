process.env.NODE_ENV = 'test';
process.env.SYNC_SECRET = 'test-sync-secret-at-least-32-chars';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const LocalDevice = require('../src/models/LocalDevice');
const { hashDeviceToken } = require('../src/utils/deviceToken');

let mongo;

test.before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
});

test.afterEach(async () => {
    await LocalDevice.deleteMany({});
});

test.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});

test('device registry endpoints require sync secret', async () => {
    await request(app)
        .post('/api/devices/register')
        .send({ device_id: 'CAM-001', device_name: 'Camera 1' })
        .expect(401);

    await request(app)
        .get('/api/devices')
        .expect(401);
});

test('device registration ignores body token and does not self-grant db access', async () => {
    const response = await request(app)
        .post('/api/devices/register')
        .set('x-sync-secret', process.env.SYNC_SECRET)
        .send({
            device_id: 'CAM-001',
            device_name: 'Camera 1',
            device_token: 'attacker-controlled-token',
        })
        .expect(200);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.can_access_db, false);

    const device = await LocalDevice.findOne({ device_id: 'CAM-001' }).select('+device_token +device_token_hash');
    assert.equal(device.device_token, null);
    assert.equal(device.device_token_hash, null);
    assert.equal(device.can_access_db, false);
});

test('device list excludes stored device token hashes', async () => {
    await request(app)
        .post('/api/devices/register')
        .set('x-sync-secret', process.env.SYNC_SECRET)
        .set('x-device-token', 'trusted-token-from-admin')
        .send({ device_id: 'CAM-001', device_name: 'Camera 1' })
        .expect(200);

    const response = await request(app)
        .get('/api/devices')
        .set('x-sync-secret', process.env.SYNC_SECRET)
        .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].device_token, undefined);
    assert.equal(response.body.data[0].device_token_hash, undefined);

    const device = await LocalDevice.findOne({ device_id: 'CAM-001' }).select('+device_token +device_token_hash');
    assert.equal(device.device_token, null);
    assert.equal(device.device_token_hash, hashDeviceToken('trusted-token-from-admin'));
});
