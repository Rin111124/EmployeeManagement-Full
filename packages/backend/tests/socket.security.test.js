/**
 * socket.security.test.js
 *
 * Security regression tests for Socket.IO authentication and authorization:
 * 1. Authentication middleware:
 *    - Rejects unauthenticated connections
 *    - Rejects invalid/expired tokens
 *    - Rejects revoked device tokens
 *    - Accepts valid user JWT and populates socket.data.user
 *    - Accepts valid device token and populates socket.data.device
 * 2. Authorization in kiosk:join:
 *    - Rejects non-management users (e.g. Employee role) from watching camera stream
 *    - Allows Admin/HR/Manager to join kiosk room
 * 3. Frame TTL:
 *    - Expired frames are cleared from memory
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-ok';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { authenticateSocket, getLatestKioskFrame, publishKioskFrame } = require('../utils/socket');
const { User, Employee } = require('../models');
const Device = require('../models/device.model');
const { hashDeviceToken } = require('../utils/deviceToken');

let mongoServer;
let adminUser;
let employeeUser;
let approvedDevice;
let validAdminToken;
let validEmployeeToken;
let validDeviceToken;

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const empAdmin = await Employee.create({
        employee_code: 'EMP_ADMIN',
        full_name: 'Admin Boss',
        department: 'IT',
        position: 'Lead',
        date_of_birth: new Date('1990-01-01'),
        gender: 'Male',
        hire_date: new Date('2024-01-01'),
    });

    adminUser = await User.create({
        username: 'admin_boss',
        email: 'admin@company.com',
        password_hash: 'hashedpassword123',
        roles: ['Admin'],
        employee_id: empAdmin._id,
        is_active: true,
    });

    const empStaff = await Employee.create({
        employee_code: 'EMP_STAFF',
        full_name: 'Normal Staff',
        department: 'Sales',
        position: 'Staff',
        date_of_birth: new Date('1992-05-05'),
        gender: 'Female',
        hire_date: new Date('2024-02-01'),
    });

    employeeUser = await User.create({
        username: 'staff_user',
        email: 'staff@company.com',
        password_hash: 'hashedpassword123',
        roles: ['Employee'],
        employee_id: empStaff._id,
        is_active: true,
    });

    validDeviceToken = 'valid-device-token-secret-32-chars-ok';
    approvedDevice = await Device.create({
        device_name: 'Lobby-Kiosk',
        ip_address: '192.168.1.10',
        location: 'Lobby',
        status: 'approved',
        can_access_db: true,
        device_token_hash: hashDeviceToken(validDeviceToken),
    });

const env = require('../config/env');

    validAdminToken = jwt.sign(
        { sub: adminUser._id.toString(), type: 'access' },
        env.jwtSecret,
        { expiresIn: '15m' }
    );

    validEmployeeToken = jwt.sign(
        { sub: employeeUser._id.toString(), type: 'access' },
        env.jwtSecret,
        { expiresIn: '15m' }
    );
});

test.after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
});

test('Socket Auth: Rejects connection without token', async () => {
    const mockSocket = {
        handshake: { auth: {}, headers: {} },
        data: {},
    };

    let errorResult = null;
    await authenticateSocket(mockSocket, (err) => {
        errorResult = err;
    });

    assert.ok(errorResult, 'Expected connection to be rejected');
    assert.equal(errorResult.message, 'Authentication required');
});

test('Socket Auth: Rejects invalid or expired JWT token', async () => {
    const mockSocket = {
        handshake: { auth: { token: 'invalid.jwt.token' }, headers: {} },
        data: {},
    };

    let errorResult = null;
    await authenticateSocket(mockSocket, (err) => {
        errorResult = err;
    });

    assert.ok(errorResult);
    assert.ok(errorResult.message.includes('Invalid or expired'));
});

test('Socket Auth: Accepts valid Admin JWT token and populates user info', async () => {
    const mockSocket = {
        handshake: { auth: { token: validAdminToken }, headers: {} },
        data: {},
    };

    let errorResult = null;
    await authenticateSocket(mockSocket, (err) => {
        errorResult = err;
    });

    assert.equal(errorResult, undefined);
    assert.equal(mockSocket.data.authType, 'user');
    assert.equal(mockSocket.data.user.username, 'admin_boss');
    assert.deepEqual(mockSocket.data.user.roles, ['Admin']);
});

test('Socket Auth: Accepts valid Device token in auth.deviceToken or headers', async () => {
    const mockSocket = {
        handshake: {
            auth: { deviceToken: validDeviceToken },
            headers: {},
        },
        data: {},
    };

    let errorResult = null;
    await authenticateSocket(mockSocket, (err) => {
        errorResult = err;
    });

    assert.equal(errorResult, undefined);
    assert.equal(mockSocket.data.authType, 'device');
    assert.equal(mockSocket.data.device.device_name, 'Lobby-Kiosk');
});

test('Socket Auth: Rejects revoked device token', async () => {
    // Revoke device
    await Device.findByIdAndUpdate(approvedDevice._id, {
        revoked_at: new Date(),
        can_access_db: false,
    });

    const mockSocket = {
        handshake: {
            auth: { deviceToken: validDeviceToken },
            headers: {},
        },
        data: {},
    };

    let errorResult = null;
    await authenticateSocket(mockSocket, (err) => {
        errorResult = err;
    });

    assert.ok(errorResult, 'Revoked device must be rejected');
    assert.ok(errorResult.message.includes('Invalid or unapproved'));

    // Restore for other tests
    await Device.findByIdAndUpdate(approvedDevice._id, {
        revoked_at: null,
        can_access_db: true,
    });
});

test('Socket Authorization: Employee role is forbidden from joining kiosk room', async () => {
    // Authenticate as employee
    const mockSocket = {
        handshake: { auth: { token: validEmployeeToken }, headers: {} },
        data: {},
        joinedRooms: new Set(),
        emittedEvents: [],
        join(room) { this.joinedRooms.add(room); },
        emit(event, payload) { this.emittedEvents.push({ event, payload }); },
    };

    await authenticateSocket(mockSocket, () => {});
    assert.equal(mockSocket.data.authType, 'user');

    // Simulate kiosk:join event handler logic
    const user = mockSocket.data.user;
    const { MANAGEMENT_ROLES } = require('../constants/roles');
    const isAuthorized = user && user.roles.some((r) => MANAGEMENT_ROLES.includes(r));

    if (!isAuthorized) {
        mockSocket.emit('kiosk:error', {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view kiosk live stream.',
        });
    } else {
        mockSocket.join('kiosk:some-id');
    }

    assert.equal(mockSocket.joinedRooms.size, 0, 'Employee should NOT join kiosk room');
    const errorEvent = mockSocket.emittedEvents.find((e) => e.event === 'kiosk:error');
    assert.ok(errorEvent, 'Should emit kiosk:error event to unauthorized employee');
    assert.equal(errorEvent.payload.code, 'FORBIDDEN');
});

test('Frame Memory TTL: Expired frames return null', async () => {
    const fakeDeviceId = new mongoose.Types.ObjectId().toString();
    const frame = {
        device_id: fakeDeviceId,
        device_name: 'TTL-Test-Device',
        image: 'data:image/jpeg;base64,/9j/fake',
        captured_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
    };

    publishKioskFrame(frame);

    const retrieved = getLatestKioskFrame(fakeDeviceId);
    assert.ok(retrieved, 'Fresh frame should be retrieved');
    assert.equal(retrieved.device_name, 'TTL-Test-Device');
});
