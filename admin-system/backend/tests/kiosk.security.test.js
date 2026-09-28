/**
 * kiosk.security.test.js
 *
 * Security regression tests for:
 * 1. P0 Device takeover vulnerability:
 *    - Ensure approved device claim_code is never re-issued via requestAccess
 * 2. Challenge-response enrollment:
 *    - Request challenge, verify proof using timingSafeEqual, prevent replay attacks
 * 3. Instant token revocation:
 *    - Reject/Revoke device disables token access immediately
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-ok';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const supertest = require('supertest');

const app = require('../app');
const Device = require('../models/device.model');
const { hashDeviceToken, computeProof } = require('../utils/deviceToken');

let mongoServer;
let request;

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    request = supertest(app);
});

test.after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
});

test.beforeEach(async () => {
    await Device.deleteMany({});
});

test('P0 Regression: Approved device does NOT leak or reissue claim_code on duplicate requestAccess', async () => {
    // 1. Initial registration
    const initialRes = await request
        .post('/api/v1/devices/request-access')
        .send({
            device_name: 'Main-Kiosk-Terminal',
            ip_address: '192.168.1.100',
            location: 'Front Gate',
            device_type: 'face',
        });

    assert.equal(initialRes.status, 201);
    const deviceId = initialRes.body.device.id;
    assert.ok(initialRes.body.claim_code, 'Initial registration should provide claim_code');

    // 2. Admin approves device
    await Device.findByIdAndUpdate(deviceId, { status: 'approved', can_access_db: true });

    // 3. Attacker discovers/guesses device_name and calls request-access
    const attackRes = await request
        .post('/api/v1/devices/request-access')
        .send({
            device_name: 'Main-Kiosk-Terminal',
            ip_address: '10.0.0.99',
            location: 'Attacker Location',
            device_type: 'face',
        });

    assert.equal(attackRes.status, 200);
    assert.equal(attackRes.body.status, 'success');
    assert.equal(attackRes.body.claim_code, undefined, 'CRITICAL: Must NEVER return claim_code to existing approved device!');
});

test('Challenge-Response Enrollment: Verifies HMAC proof and blocks replay attacks', async () => {
    const rawBootstrapSecret = 'super-secret-random-bootstrap-key-256-bit-long';
    const bootstrapHash = crypto.createHash('sha256').update(rawBootstrapSecret).digest('hex');
    const deviceUuid = 'kiosk-hardware-uuid-999';

    // 1. Register device with bootstrap_hash
    const regRes = await request
        .post('/api/v1/devices/request-access')
        .send({
            device_name: 'Secure-Kiosk',
            device_id: deviceUuid,
            bootstrap_hash: bootstrapHash,
            ip_address: '192.168.1.50',
            location: 'Secure Area',
            device_type: 'face',
        });

    assert.equal(regRes.status, 201);
    assert.equal(regRes.body.claim_code, undefined, 'No claim_code should be issued when bootstrap_hash is provided');

    // 2. Admin approves the device
    await Device.findOneAndUpdate({ device_id: deviceUuid }, { status: 'approved', can_access_db: true });

    // 3. Request challenge
    const challengeRes = await request
        .post('/api/v1/devices/enroll/challenge')
        .send({ device_id: deviceUuid });

    assert.equal(challengeRes.status, 200);
    assert.ok(challengeRes.body.challenge);
    const challenge = challengeRes.body.challenge;

    // 4. Try claiming with forged/wrong proof -> 403 Forbidden
    const fakeProof = crypto.createHmac('sha256', 'wrong-key').update(challenge).digest('hex');
    const fakeClaimRes = await request
        .post('/api/v1/devices/claim-token')
        .send({
            device_id: deviceUuid,
            challenge,
            proof: fakeProof,
        });

    assert.equal(fakeClaimRes.status, 403);

    // 5. Claim with valid proof: HMAC-SHA256(bootstrapHash, challenge)
    const validProof = computeProof(bootstrapHash, challenge);
    const validClaimRes = await request
        .post('/api/v1/devices/claim-token')
        .send({
            device_id: deviceUuid,
            challenge,
            proof: validProof,
        });

    assert.equal(validClaimRes.status, 200);
    assert.ok(validClaimRes.body.device_token, 'Should issue device_token on valid challenge-response');
    const deviceToken = validClaimRes.body.device_token;

    // 6. Replay Attack: Using the exact same challenge and proof must fail (one-time use)
    const replayRes = await request
        .post('/api/v1/devices/claim-token')
        .send({
            device_id: deviceUuid,
            challenge,
            proof: validProof,
        });

    assert.equal(replayRes.status, 400); // Challenge was consumed/cleared

    // 7. Verify device can use the issued token
    const reportRes = await request
        .post('/api/v1/devices/report-log')
        .set('x-device-token', deviceToken)
        .send({});

    assert.equal(reportRes.status, 200);
});

test('Instant Revocation: Revoking device token immediately blocks API calls', async () => {
    const rawBootstrapSecret = 'another-secret-key-12345';
    const bootstrapHash = crypto.createHash('sha256').update(rawBootstrapSecret).digest('hex');
    const deviceUuid = 'kiosk-hardware-uuid-888';

    // 1. Create and approve device
    const device = await Device.create({
        device_name: 'Revokable-Kiosk',
        device_id: deviceUuid,
        bootstrap_hash: bootstrapHash,
        ip_address: '192.168.1.60',
        location: 'Branch 1',
        status: 'approved',
        can_access_db: true,
    });

    // 2. Challenge and claim token
    const chRes = await request
        .post('/api/v1/devices/enroll/challenge')
        .send({ device_id: deviceUuid });
    const proof = computeProof(bootstrapHash, chRes.body.challenge);

    const claimRes = await request
        .post('/api/v1/devices/claim-token')
        .send({
            device_id: deviceUuid,
            challenge: chRes.body.challenge,
            proof,
        });

    const token = claimRes.body.device_token;
    assert.ok(token);

    // 3. Authenticated call succeeds
    const call1 = await request
        .post('/api/v1/devices/report-log')
        .set('x-device-token', token)
        .send({});
    assert.equal(call1.status, 200);

    // 4. Revoke the device
    device.status = 'rejected';
    device.revoked_at = new Date();
    device.can_access_db = false;
    device.device_token_hash = undefined;
    await device.save();

    // 5. Subsequent call with same token must fail immediately
    const call2 = await request
        .post('/api/v1/devices/report-log')
        .set('x-device-token', token)
        .send({});
    assert.equal(call2.status, 403);
});

test('Device Enrollment: Validates input schemas and rejects malformed payloads', async () => {
    // 1. Missing device_name
    const res1 = await request
        .post('/api/v1/devices/request-access')
        .send({ location: 'Gate A', ip_address: '192.168.1.1' });
    assert.equal(res1.status, 400);

    // 2. Invalid IP address format
    const res2 = await request
        .post('/api/v1/devices/request-access')
        .send({ device_name: 'Valid-Name', location: 'Gate A', ip_address: 'not-an-ip' });
    assert.equal(res2.status, 400);

    // 3. Invalid port (> 65535)
    const res3 = await request
        .post('/api/v1/devices/request-access')
        .send({ device_name: 'Valid-Name', location: 'Gate A', ip_address: '192.168.1.1', port: 70000 });
    assert.equal(res3.status, 400);

    // 4. Invalid challenge format in claimToken
    const res4 = await request
        .post('/api/v1/devices/claim-token')
        .send({ device_id: 'some-id', challenge: 'not-hex!!', proof: 'abcdef' });
    assert.equal(res4.status, 400);
});

test('Device Lifecycle: Writes audit logs for enrollment and credential issuance', async () => {
    const AuditLog = require('../models/auditLog');
    const uniqueName = `Audit-Kiosk-${Date.now()}`;

    // 1. Request access
    const enrollRes = await request
        .post('/api/v1/devices/request-access')
        .send({
            device_name: uniqueName,
            ip_address: '192.168.1.55',
            location: 'Main Gate',
            device_type: 'face',
        });
    assert.equal(enrollRes.status, 201);

    const enrollAudit = await AuditLog.findOne({
        action: 'DEVICE_ENROLLMENT_REQUESTED',
        'metadata.device_name': uniqueName,
    });
    assert.ok(enrollAudit, 'Audit log for DEVICE_ENROLLMENT_REQUESTED must be created');
});
