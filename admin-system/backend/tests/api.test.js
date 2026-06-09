process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = '*';
process.env.SYNC_SECRET = 'test-sync-secret-at-least-32-chars';
process.env.ATTENDANCE_SERVICE_URL = 'http://attendance.test/api';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../app');
const env = require('../config/env');
const {
    AuditLog,
    Attendance,
    Department,
    Device,
    Employee,
    Overtime,
    Setting,
    Shift,
    ShiftAssignment,
    User,
} = require('../models');
const { hashDeviceToken } = require('../utils/deviceToken');

let mongoServer;
let adminToken;
let adminEmployeeId;
let employeeId;
let departmentId;
let shiftId;

async function createEmployee(code, overrides = {}) {
    return Employee.create({
        employee_code: code,
        full_name: `Employee ${code}`,
        date_of_birth: new Date('1995-01-01'),
        gender: 'Male',
        hire_date: new Date('2024-01-01'),
        face_data: [],
        ...overrides,
    });
}

function authHeader() {
    return { Authorization: `Bearer ${adminToken}` };
}

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const adminEmployee = await createEmployee('ADMIN001', {
        full_name: 'Admin User',
        face_data: [{ label: 'front', embedding: [0.1, 0.2, 0.3], image_path: '/faces/admin.jpg' }],
    });
    adminEmployeeId = adminEmployee._id.toString();
    const employee = await createEmployee('EMP001');
    employeeId = employee._id.toString();

    await User.create({
        employee_id: adminEmployee._id,
        username: 'admin',
        password_hash: await bcrypt.hash('secret123', 12),
        roles: ['Admin'],
    });
    await User.create({
        employee_id: employee._id,
        username: 'employee',
        password_hash: await bcrypt.hash('secret123', 12),
        roles: ['Employee'],
    });

    const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'secret123' })
        .expect(200);

    adminToken = login.body.data.token;
});

test.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

test('auth login rejects invalid credentials', async () => {
    const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'wrong-password' })
        .expect(401);

    assert.equal(response.body.success, false);
});

test('auth login sets HttpOnly cookies and writes audit logs', async () => {
    const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'secret123' })
        .expect(200);

    const cookies = response.headers['set-cookie'];
    assert.ok(cookies.some((cookie) => cookie.startsWith('accessToken=') && cookie.includes('HttpOnly')));
    assert.ok(cookies.some((cookie) => cookie.startsWith('refreshToken=') && cookie.includes('HttpOnly')));

    const auditLog = await AuditLog.findOne({ action: 'AUTH_LOGIN' });
    assert.ok(auditLog);
});

test('refresh token rotation rejects reused refresh tokens', async () => {
    const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'secret123' })
        .expect(200);

    const oldRefreshCookie = login.headers['set-cookie'].find((cookie) => cookie.startsWith('refreshToken='));

    await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldRefreshCookie)
        .expect(200);

    await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldRefreshCookie)
        .expect(401);
});

test('expired access tokens return 401 instead of server error', async () => {
    const expiredToken = jwt.sign(
        {
            sub: new mongoose.Types.ObjectId().toString(),
            roles: ['Employee'],
            type: 'access',
            exp: Math.floor(Date.now() / 1000) - 60,
        },
        env.jwtSecret,
    );

    const response = await request(app)
        .get(`/api/v1/employees/${employeeId}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

    assert.equal(response.body.message, 'Authentication token has expired');
});

test('chatbot finds employees without attendance when question uses Vietnamese accents', async () => {
    await createEmployee('ABSENT001', {
        full_name: 'Nhân viên chưa chấm công',
        department: 'Production',
        position: 'Operator',
    });

    const response = await request(app)
        .post('/api/v1/chatbot/ask')
        .set(authHeader())
        .send({ question: 'Tìm nhân viên không đi làm trong ngày hôm nay' })
        .expect(200);

    assert.equal(response.body.data.intent, 'attendance_stats');
    assert.equal(response.body.data.provider, 'database');
    assert.match(response.body.data.answer, /ABSENT001/);
});

test('chatbot handles broader Vietnamese attendance and department questions', async () => {
    const presentEmployee = await createEmployee('PRESENT001', {
        full_name: 'Nhân viên đã chấm công',
        department: 'Production',
        position: 'Operator',
    });
    const now = new Date();
    const workDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    await Attendance.create({
        employee_id: presentEmployee._id,
        work_date: workDate,
        check_in: new Date(),
        status: 'CheckedIn',
        method: 'manual',
    });

    const presentResponse = await request(app)
        .post('/api/v1/chatbot/ask')
        .set(authHeader())
        .send({ question: 'Ai đã đi làm hôm nay?' })
        .expect(200);

    assert.equal(presentResponse.body.data.intent, 'attendance_stats');
    assert.match(presentResponse.body.data.answer, /PRESENT001/);

    const departmentResponse = await request(app)
        .post('/api/v1/chatbot/ask')
        .set(authHeader())
        .send({ question: 'Bộ phận Production có bao nhiêu nhân viên?' })
        .expect(200);

    assert.equal(departmentResponse.body.data.intent, 'department_stats');
    assert.equal(departmentResponse.body.data.data.department, 'Production');
});

test('chatbot lists employees assigned to night shift today', async () => {
    const nightEmployee = await createEmployee('NIGHT001', {
        full_name: 'Nhân viên ca đêm',
        department: 'Operations',
        position: 'Night Operator',
    });
    const nightShift = await Shift.create({
        shift_name: 'Night Shift',
        start_time: '20:00',
        end_time: '08:00',
        is_night_shift: true,
        standard_hours: 12,
    });
    const now = new Date();
    const workDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    await ShiftAssignment.create({
        employee_id: nightEmployee._id,
        shift_id: nightShift._id,
        work_date: workDate,
    });

    const response = await request(app)
        .post('/api/v1/chatbot/ask')
        .set(authHeader())
        .send({ question: 'night shift hôm nay có những nhân viên nào đi làm' })
        .expect(200);

    assert.equal(response.body.data.intent, 'attendance_stats');
    assert.equal(response.body.data.provider, 'database');
    assert.match(response.body.data.answer, /NIGHT001/);
    assert.match(response.body.data.answer, /Night Shift/);
});

test('chatbot lists employees assigned to day shift today', async () => {
    const dayEmployee = await createEmployee('DAY001', {
        full_name: 'Nhân viên ca ngày',
        department: 'Operations',
        position: 'Day Operator',
    });
    const dayShift = await Shift.create({
        shift_name: 'Day Shift',
        start_time: '08:00',
        end_time: '17:00',
        is_night_shift: false,
        standard_hours: 8,
    });
    const now = new Date();
    const workDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    await ShiftAssignment.create({
        employee_id: dayEmployee._id,
        shift_id: dayShift._id,
        work_date: workDate,
    });

    const response = await request(app)
        .post('/api/v1/chatbot/ask')
        .set(authHeader())
        .send({ question: 'ca ngày hôm nay có những nhân viên nào đi làm' })
        .expect(200);

    assert.equal(response.body.data.intent, 'attendance_stats');
    assert.equal(response.body.data.provider, 'database');
    assert.match(response.body.data.answer, /DAY001/);
    assert.match(response.body.data.answer, /Day Shift/);
    assert.match(response.body.data.answer, /ca ngày/);
});

test('approved device can fetch its token and use protected device endpoints', async () => {
    const deviceInfo = {
        device_name: 'CAM-TEST-001',
        ip_address: '192.168.99.10',
        port: 8080,
        location: 'Test Gate',
        device_type: 'face',
    };

    const accessRequest = await request(app)
        .post('/api/v1/devices/request-access')
        .send(deviceInfo)
        .expect(201);

    assert.equal(accessRequest.body.device.status, 'pending');
    assert.equal(accessRequest.body.device.device_token, undefined);
    assert.ok(accessRequest.body.claim_code);

    const device = await Device.findOne({ device_name: deviceInfo.device_name });
    assert.ok(device);

    const approval = await request(app)
        .patch(`/api/v1/devices/${device._id}/approve`)
        .set(authHeader())
        .expect(200);

    assert.equal(approval.body.status, 'success');

    const approvedAccessRequest = await request(app)
        .post('/api/v1/devices/request-access')
        .send(deviceInfo)
        .expect(200);

    assert.equal(approvedAccessRequest.body.device.status, 'approved');

    const claim = await request(app)
        .post('/api/v1/devices/claim-token')
        .send({
            device_id: device._id.toString(),
            device_name: deviceInfo.device_name,
            claim_code: accessRequest.body.claim_code,
        })
        .expect(200);

    assert.ok(claim.body.device_token);

    const employees = await request(app)
        .get('/api/v1/devices/unregistered-employees')
        .set('x-device-token', claim.body.device_token)
        .expect(200);

    assert.equal(employees.body.status, 'success');
    assert.ok(Array.isArray(employees.body.data));
});

test('approved device with claim code can claim a token', async () => {
    const deviceInfo = {
        device_name: 'CAM-LEGACY-001',
        ip_address: '192.168.99.11',
        port: 8080,
        location: 'Legacy Gate',
        device_type: 'face',
    };

    const device = await Device.create({
        ...deviceInfo,
        status: 'approved',
        can_access_db: true,
        claim_code_hash: hashDeviceToken('test-claim-code'),
    });

    await request(app)
        .post('/api/v1/devices/claim-token')
        .send({
            device_id: device._id.toString(),
            device_name: deviceInfo.device_name,
            claim_code: 'wrong-claim-code',
        })
        .expect(403);

    const claim = await request(app)
        .post('/api/v1/devices/claim-token')
        .send({
            device_id: device._id.toString(),
            device_name: deviceInfo.device_name,
            claim_code: 'test-claim-code',
        })
        .expect(200);

    assert.ok(claim.body.device_token);

    const storedDevice = await Device.findOne({ device_name: deviceInfo.device_name }).select('+device_token +device_token_hash');
    assert.equal(storedDevice.device_token, undefined);
    assert.equal(storedDevice.device_token_hash, hashDeviceToken(claim.body.device_token));
});

test('confirm biometrics stores kiosk embedding in admin database', async () => {
    const employee = await createEmployee('EMP-BIO-001');
    const embedding = [0.1, 0.2, 0.3, 0.4];

    await request(app)
        .patch(`/api/v1/employees/${employee._id}/confirm-biometrics`)
        .set('x-sync-secret', process.env.SYNC_SECRET)
        .send({
            status: 'registered',
            device_id: 'CAM-TEST-001',
            embedding,
        })
        .expect(200);

    const updated = await Employee.findById(employee._id).lean();
    const latestFace = updated.face_data[updated.face_data.length - 1];
    assert.deepEqual(latestFace.embedding, embedding);
    assert.equal(latestFace.provider, 'kiosk');
});

test('admin device sync pushes employees and face embeddings to attendance service', async () => {
    const device = await Device.create({
        device_name: 'CAM-SYNC-001',
        ip_address: '192.168.99.12',
        port: 8080,
        location: 'Sync Gate',
        device_type: 'face',
        status: 'approved',
        can_access_db: true,
    });

    const syncEmployee = await createEmployee('EMP-SYNC-001', {
        face_data: [{ label: 'front', provider: 'kiosk', embedding: [0.5, 0.6, 0.7] }],
    });

    const originalFetch = global.fetch;
    let capturedRequest;
    global.fetch = async (url, options) => {
        capturedRequest = { url, options };
        return {
            ok: true,
            status: 200,
            json: async () => ({ success: true, message: 'Synced' }),
        };
    };

    try {
        const response = await request(app)
            .post(`/api/v1/devices/${device._id}/sync`)
            .set(authHeader())
            .expect(200);

        assert.equal(response.body.status, 'success');
        assert.equal(capturedRequest.url, 'http://attendance.test/api/sync/employees');
        assert.equal(capturedRequest.options.headers['x-sync-secret'], process.env.SYNC_SECRET);

        const body = JSON.parse(capturedRequest.options.body);
        const synced = body.employees.find((employee) => employee.employee_id === syncEmployee._id.toString());
        assert.ok(synced);
        assert.deepEqual(synced.face_embedding, [0.5, 0.6, 0.7]);
    } finally {
        global.fetch = originalFetch;
    }
});

test('pending device cannot claim a token', async () => {
    const device = await Device.create({
        device_name: 'CAM-PENDING-001',
        status: 'pending',
        ip_address: '192.168.1.100',
        location: 'Pending Gate',
    });

    await request(app)
        .post('/api/v1/devices/claim-token')
        .send({
            device_id: device._id.toString(),
            device_name: 'CAM-PENDING-001',
            claim_code: 'any-claim-code',
        })
        .expect(403);
});

test('contract validation prevents overlapping and handle missing fields', async () => {
    const headers = authHeader();
    const tempEmployee = await createEmployee('TEMP-VAL-001');
    const tempId = tempEmployee._id.toString();

    // Missing fields
    await request(app)
        .post('/api/v1/contracts')
        .set(headers)
        .send({ employee_id: tempId })
        .expect(400);

    // Initial contract
    await request(app)
        .post('/api/v1/contracts')
        .set(headers)
        .send({
            employee_id: tempId,
            type: 'Full-time',
            start_date: '2026-01-01',
            end_date: '2026-06-30',
            base_salary: 1000,
        })
        .expect(201);

    // Overlapping contract
    await request(app)
        .post('/api/v1/contracts')
        .set(headers)
        .send({
            employee_id: tempId,
            type: 'Full-time',
            start_date: '2026-03-01',
            base_salary: 1200,
        })
        .expect(409);
});

test('contract security guards signed contracts and sanitizes generated template html', async () => {
    const headers = authHeader();
    const tempEmployee = await createEmployee('TEMP-CONTRACT-SEC-001');
    const tempId = tempEmployee._id.toString();

    const template = await request(app)
        .post('/api/v1/contract-templates')
        .set(headers)
        .send({
            name: 'Unsafe Contract Template',
            html_content: '<html><body><h1>{{EMPLOYEE_NAME}}</h1><script>alert("xss")</script><img src=x onerror=alert(1)></body></html>',
            contract_type_match: 'All',
        })
        .expect(201);

    const contract = await request(app)
        .post('/api/v1/contracts')
        .set(headers)
        .send({
            employee_id: tempId,
            type: 'Full-time',
            start_date: '2027-01-01',
            base_salary: 1000,
            template_id: template.body.data._id,
        })
        .expect(201);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}/status`)
        .set(headers)
        .send({ status: 'Signed' })
        .expect(400);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ status: 'Pending' })
        .expect(200);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ status: 'Approved' })
        .expect(200);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ status: 'Signed' })
        .expect(200);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ base_salary: 2000 })
        .expect(409);

    await request(app)
        .delete(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .expect(409);

    const html = await request(app)
        .get(`/api/v1/contracts/${contract.body.data._id}/generate-html`)
        .set(headers)
        .expect(200);

    assert.equal(html.text.includes('<script>'), false);
    assert.equal(html.text.includes('onerror'), false);
});

test('logout blacklists the access token', async () => {
    const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'secret123' })
        .expect(200);

    const accessToken = login.body.data.access_token;
    await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', login.headers['set-cookie'])
        .expect(200);

    await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
});

test('account is locked after five failed logins', async () => {
    const lockEmployee = await createEmployee('LOCK001');
    await User.create({
        employee_id: lockEmployee._id,
        username: 'locked-user',
        password_hash: await bcrypt.hash('secret123', 12),
        roles: ['Employee'],
    });

    for (let i = 0; i < 5; i += 1) {
        await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'locked-user', password: 'wrong-password' })
            .expect(401);
    }

    await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'locked-user', password: 'secret123' })
        .expect(423);
});

test('employee users can only read their own employee profile', async () => {
    const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'employee', password: 'secret123' })
        .expect(200);

    const employeeToken = login.body.data.access_token;
    assert.deepEqual(login.body.data.user.roles, ['Employee']);

    await request(app)
        .get(`/api/v1/employees/${employeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

    await request(app)
        .get(`/api/v1/employees/${adminEmployeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

    await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
});

test('employee users can list only their assigned assets', async () => {
    const headers = authHeader();
    const otherEmployee = await createEmployee('EMP-ASSET-OTHER-001');

    await request(app)
        .post('/api/v1/assets')
        .set(headers)
        .send({
            asset_name: 'Employee Laptop',
            category: 'Laptop',
            serial_number: 'EMP-LAP-001',
            status: 'Assigned',
            assigned_to: employeeId,
        })
        .expect(201);

    await request(app)
        .post('/api/v1/assets')
        .set(headers)
        .send({
            asset_name: 'Other Laptop',
            category: 'Laptop',
            serial_number: 'OTHER-LAP-001',
            status: 'Assigned',
            assigned_to: otherEmployee._id.toString(),
        })
        .expect(201);

    const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'employee', password: 'secret123' })
        .expect(200);

    const employeeToken = login.body.data.access_token;
    const response = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

    assert.deepEqual(response.body.data.items.map((item) => item.asset_name), ['Employee Laptop']);
});

test('employee users can list only their own payroll records', async () => {
    const headers = authHeader();
    const otherEmployee = await createEmployee('EMP-PAYROLL-OTHER-001');

    await request(app)
        .post('/api/v1/payroll')
        .set(headers)
        .send({
            employee_id: employeeId,
            month: 5,
            year: 2026,
            total_work_hours: 160,
            total_overtime_hours: 0,
            basic_salary: 12000000,
            overtime_salary: 0,
            allowance: 500000,
            deduction: 0,
            net_salary: 12500000,
            status: 'Draft',
        })
        .expect(201);

    await request(app)
        .post('/api/v1/payroll')
        .set(headers)
        .send({
            employee_id: otherEmployee._id.toString(),
            month: 5,
            year: 2026,
            total_work_hours: 160,
            total_overtime_hours: 0,
            basic_salary: 9000000,
            overtime_salary: 0,
            allowance: 0,
            deduction: 0,
            net_salary: 9000000,
            status: 'Draft',
        })
        .expect(201);

    const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'employee', password: 'secret123' })
        .expect(200);

    const employeeToken = login.body.data.access_token;
    const response = await request(app)
        .get('/api/v1/payroll')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

    assert.deepEqual(response.body.data.items.map((item) => item.employee_id._id || item.employee_id), [employeeId.toString()]);
});

test('employee CRUD works for admin users', async () => {
    const headers = authHeader();

    const created = await request(app)
        .post('/api/v1/employees')
        .set(headers)
        .send({
            employee_code: 'EMP002',
            full_name: 'Nguyen Van B',
            date_of_birth: '1996-02-02',
            gender: 'Male',
            hire_date: '2024-02-01',
            contact: { email: 'b@example.com' },
        })
        .expect(201);

    const id = created.body.data._id;

    await request(app)
        .get(`/api/v1/employees/${id}`)
        .set(headers)
        .expect(200);

    const updated = await request(app)
        .patch(`/api/v1/employees/${id}`)
        .set(headers)
        .send({ position: 'Backend Developer' })
        .expect(200);

    assert.equal(updated.body.data.position, 'Backend Developer');

    await request(app)
        .delete(`/api/v1/employees/${id}`)
        .set(headers)
        .expect(204);
});

test('admin can create employee with login account', async () => {
    const headers = authHeader();

    const response = await request(app)
        .post('/api/v1/employees')
        .set(headers)
        .send({
            employee_code: 'EMP-ACCOUNT-001',
            full_name: 'Employee With Account',
            date_of_birth: '1995-01-01',
            gender: 'Female',
            hire_date: '2026-05-01',
            contact: { email: 'employee.account@example.com' },
            account: {
                username: 'employee.account',
                password: 'secret123',
                roles: ['Employee'],
            },
        })
        .expect(201);

    const user = await User.findOne({ username: 'employee.account' }).select('+password_hash').lean();
    assert.ok(user);
    assert.equal(user.employee_id.toString(), response.body.data._id);
    assert.notEqual(user.password_hash, 'secret123');
});

test('employee creation rolls back when account creation fails', async () => {
    const headers = authHeader();

    const response = await request(app)
        .post('/api/v1/employees')
        .set(headers)
        .send({
            employee_code: 'EMP-ACCOUNT-DUP',
            full_name: 'Duplicate Account Employee',
            date_of_birth: '1995-01-01',
            gender: 'Female',
            hire_date: '2026-05-01',
            account: {
                username: 'employee',
                password: 'secret123',
                roles: ['Employee'],
            },
        })
        .expect(409);

    assert.equal(response.body.message, 'Duplicate value');
    const employee = await Employee.findOne({ employee_code: 'EMP-ACCOUNT-DUP' }).lean();
    assert.equal(employee, null);
});

test('attendance check-in and check-out work with employee id', async () => {
    const headers = authHeader();

    const checkIn = await request(app)
        .post('/api/v1/attendance/check-in')
        .set(headers)
        .send({ employee_id: employeeId })
        .expect(201);

    assert.equal(checkIn.body.data.status, 'CheckedIn');
    const attendanceId = checkIn.body.data._id;

    const checkOut = await request(app)
        .post('/api/v1/attendance/check-out')
        .set(headers)
        .send({ employee_id: employeeId })
        .expect(200);

    assert.equal(checkOut.body.data.status, 'CheckedOut');

    await request(app)
        .get(`/api/v1/attendance/${attendanceId}`)
        .set(headers)
        .expect(200);

    const updated = await request(app)
        .patch(`/api/v1/attendance/${attendanceId}`)
        .set(headers)
        .send({ worked_hours: 8 })
        .expect(200);

    assert.equal(updated.body.data.worked_hours, 8);
});

test('manual attendance calculates overnight worked hours when checkout time is earlier than check-in', async () => {
    const headers = authHeader();
    const overnightEmployee = await createEmployee('EMP-NIGHT-MANUAL-001');
    const checkIn = new Date(2026, 4, 14, 20, 10, 0, 0);
    const checkOutSameDate = new Date(2026, 4, 14, 8, 10, 0, 0);

    const created = await request(app)
        .post('/api/v1/attendance')
        .set(headers)
        .send({
            employee_id: overnightEmployee._id.toString(),
            work_date: '2026-05-14',
            check_in: checkIn.toISOString(),
            check_out: checkOutSameDate.toISOString(),
            method: 'manual',
        })
        .expect(201);

    assert.equal(created.body.data.status, 'CheckedOut');
    assert.ok(created.body.data.worked_hours > 0);
    assert.ok(new Date(created.body.data.check_out) > new Date(created.body.data.check_in));
});

test('device sync resolves assigned shift and calculates late minutes on check-in', async () => {
    const lateEmployee = await createEmployee('EMP-LATE-001');
    const lateShift = await Shift.create({
        shift_name: 'Late Test Office',
        start_time: '08:00',
        end_time: '17:00',
        standard_hours: 8,
    });

    await ShiftAssignment.create({
        employee_id: lateEmployee._id,
        shift_id: lateShift._id,
        work_date: '2026-05-12',
    });

    const checkIn = new Date(2026, 4, 12, 8, 10, 0, 0);
    const checkOut = new Date(2026, 4, 12, 17, 0, 0, 0);

    const syncedCheckIn = await request(app)
        .post('/api/v1/attendance/sync-from-device')
        .set('x-sync-secret', process.env.SYNC_SECRET)
        .send({
            employee_id: lateEmployee._id.toString(),
            check_in: checkIn.toISOString(),
            device_id: 'CAM-LATE-001',
            confidence: 0.91,
            method: 'face',
        })
        .expect(200);

    assert.equal(syncedCheckIn.body.data.shift_id, lateShift._id.toString());
    assert.equal(syncedCheckIn.body.data.late_minutes, 10);

    await request(app)
        .post('/api/v1/attendance/sync-from-device')
        .set('x-sync-secret', process.env.SYNC_SECRET)
        .send({
            employee_id: lateEmployee._id.toString(),
            check_in: checkIn.toISOString(),
            check_out: checkOut.toISOString(),
            device_id: 'CAM-LATE-001',
            confidence: 0.91,
            method: 'face',
        })
        .expect(200);

    const attendance = await Attendance.findOne({ employee_id: lateEmployee._id }).lean();
    assert.equal(attendance.shift_id.toString(), lateShift._id.toString());
    assert.equal(attendance.late_minutes, 10);
    assert.equal(attendance.status, 'CheckedOut');
    assert.ok(attendance.worked_hours > 0);
});

test('admin can list audit logs', async () => {
    const response = await request(app)
        .get('/api/v1/audit-logs?action=AUTH_LOGIN')
        .set(authHeader())
        .expect(200);

    assert.ok(response.body.data.pagination.total >= 1);
});

test('admin can download a system data backup', async () => {
    const response = await request(app)
        .get('/api/v1/settings/backup')
        .set(authHeader())
        .expect(200);

    assert.match(response.headers['content-disposition'], /employee-management-backup-/);
    assert.ok(response.body.metadata.generated_at);
    assert.ok(response.body.data.employees);
    assert.ok(response.body.data.attendance);
    assert.equal(response.body.data.users.some((user) => user.password_hash), false);
});

test('admin can restore a system data backup file', async () => {
    const backup = {
        metadata: {
            app: 'EmployeeManagement',
            generated_at: new Date().toISOString(),
        },
        data: {
            departments: [
                {
                    _id: new mongoose.Types.ObjectId().toString(),
                    department_name: 'Restored Department',
                    department_code: 'RESTORED',
                    description: 'Imported from backup',
                },
            ],
        },
    };

    const response = await request(app)
        .post('/api/v1/settings/restore')
        .set(authHeader())
        .attach('backup', Buffer.from(JSON.stringify(backup)), {
            filename: 'employee-management-backup-test.json',
            contentType: 'application/json',
        })
        .expect(200);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.summary.departments.created, 1);

    const restored = await Department.findOne({ department_name: 'Restored Department' }).lean();
    assert.ok(restored);
});

test('department CRUD works', async () => {
    const headers = authHeader();

    const created = await request(app)
        .post('/api/v1/departments')
        .set(headers)
        .send({ department_name: 'Engineering' })
        .expect(201);

    departmentId = created.body.data._id;

    const list = await request(app)
        .get('/api/v1/departments?search=engineer')
        .set(headers)
        .expect(200);

    assert.equal(list.body.data.pagination.total, 1);

    await request(app)
        .patch(`/api/v1/departments/${departmentId}`)
        .set(headers)
        .send({ department_name: 'Platform Engineering' })
        .expect(200);
});

test('shift and shift assignment CRUD works', async () => {
    const headers = authHeader();

    const shift = await request(app)
        .post('/api/v1/shifts')
        .set(headers)
        .send({
            shift_name: 'Office',
            start_time: '08:00',
            end_time: '17:00',
            standard_hours: 8,
        })
        .expect(201);

    shiftId = shift.body.data._id;

    const assignment = await request(app)
        .post('/api/v1/shift-assignments')
        .set(headers)
        .send({
            employee_id: employeeId,
            shift_id: shiftId,
            work_date: '2026-04-28',
        })
        .expect(201);

    assert.equal(assignment.body.data.shift_id._id, shiftId);

    await request(app)
        .get(`/api/v1/shift-assignments?employee_id=${employeeId}`)
        .set(headers)
        .expect(200);

    const bulk = await request(app)
        .post('/api/v1/shift-assignments/bulk')
        .set(headers)
        .send({
            employee_ids: [employeeId],
            shift_id: shiftId,
            start_date: '2026-04-28',
            end_date: '2026-04-29',
            days_of_week: [2, 3],
        })
        .expect(201);

    assert.equal(bulk.body.data.requested, 2);
    assert.equal(bulk.body.data.created, 1);
    assert.equal(bulk.body.data.skipped, 1);

    const duplicateBulk = await request(app)
        .post('/api/v1/shift-assignments/bulk')
        .set(headers)
        .send({
            employee_ids: [employeeId],
            shift_id: shiftId,
            start_date: '2026-04-28',
            end_date: '2026-04-29',
            days_of_week: [2, 3],
        })
        .expect(201);

    assert.equal(duplicateBulk.body.data.created, 0);
    assert.equal(duplicateBulk.body.data.skipped, 2);

    await Setting.findOneAndUpdate(
        { key: 'time_config' },
        { value: { holidays: [{ date: '2026-04-30', name: 'Reunification Day' }] } },
        { upsert: true },
    );

    const holidayBulk = await request(app)
        .post('/api/v1/shift-assignments/bulk')
        .set(headers)
        .send({
            employee_ids: [employeeId],
            shift_id: shiftId,
            start_date: '2026-04-30',
            end_date: '2026-04-30',
            days_of_week: [4],
            create_holiday_overtime: true,
        })
        .expect(201);

    assert.equal(holidayBulk.body.data.created, 0);
    assert.equal(holidayBulk.body.data.holiday_skipped, 1);
    assert.equal(holidayBulk.body.data.holiday_overtime_created, 1);

    const overtimeRecord = await Overtime.findOne({
        employee_id: employeeId,
        work_date: new Date('2026-04-30T00:00:00.000Z'),
        type: 'Holiday',
    }).lean();
    assert.ok(overtimeRecord);
    assert.equal(overtimeRecord.status, 'Approved');
    assert.equal(overtimeRecord.hours, 8);

    await request(app)
        .post('/api/v1/shift-assignments')
        .set(headers)
        .send({
            employee_id: employeeId,
            shift_id: shiftId,
            work_date: '2026-04-29T12:30:00.000Z',
        })
        .expect(409);
});

test('employee position CRUD works', async () => {
    const headers = authHeader();

    const response = await request(app)
        .post('/api/v1/employee-positions')
        .set(headers)
        .send({
            employee_id: employeeId,
            department_id: departmentId,
            position_name: 'Developer',
            start_date: '2026-04-01',
        })
        .expect(201);

    assert.equal(response.body.data.position_name, 'Developer');
});

test('leave request and overtime CRUD works', async () => {
    const headers = authHeader();

    const leave = await request(app)
        .post('/api/v1/leave-requests')
        .set(headers)
        .send({
            employee_id: employeeId,
            type: 'Annual',
            start_date: '2026-05-01',
            end_date: '2026-05-02',
            total_days: 2,
        })
        .expect(201);

    assert.equal(leave.body.data.status, 'Pending');

    const overtime = await request(app)
        .post('/api/v1/overtime')
        .set(headers)
        .send({
            employee_id: employeeId,
            work_date: '2026-05-03',
            hours: 2,
            type: 'Weekday',
        })
        .expect(201);

    assert.equal(overtime.body.data.status, 'Pending');
});

test('employee can submit requests and HR/Admin can review them', async () => {
    const employeeLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'employee', password: 'secret123' })
        .expect(200);
    const employeeToken = employeeLogin.body.data.access_token;

    const leave = await request(app)
        .post('/api/v1/leave-requests/mine')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
            type: 'Annual',
            start_date: '2026-07-01',
            end_date: '2026-07-01',
            total_days: 1,
            reason: 'Family event',
        })
        .expect(201);

    assert.equal(leave.body.data.employee_id._id, employeeId);
    assert.equal(leave.body.data.status, 'Pending');

    const approvedLeave = await request(app)
        .post(`/api/v1/leave-requests/${leave.body.data._id}/approve`)
        .set(authHeader())
        .send({ review_note: 'Approved for coverage' })
        .expect(200);

    assert.equal(approvedLeave.body.data.status, 'Approved');

    const overtime = await request(app)
        .post('/api/v1/overtime/mine')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
            work_date: '2026-04-29',
            hours: 3,
            type: 'Weekday',
            reason: 'Release support',
        })
        .expect(201);

    await request(app)
        .post(`/api/v1/overtime/${overtime.body.data._id}/approve`)
        .set(authHeader())
        .send({ review_note: 'Approved' })
        .expect(200);
});

test('payroll can be generated from contract, attendance, and approved overtime', async () => {
    const headers = authHeader();

    const contract = await request(app)
        .post('/api/v1/contracts')
        .set(headers)
        .send({
            employee_id: employeeId,
            type: 'Full-time',
            start_date: '2026-04-01',
            base_salary: 1760,
            allowances: [{ name: 'Lunch', amount: 100 }],
        })
        .expect(201);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ status: 'Pending' })
        .expect(200);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ status: 'Approved' })
        .expect(200);

    await Promise.all(Array.from({ length: 22 }, (_, index) => {
        const day = index + 1;
        return Attendance.create({
            employee_id: employeeId,
            work_date: new Date(2026, 3, day),
            check_in: new Date(2026, 3, day, 8, 0, 0, 0),
            check_out: new Date(2026, 3, day, 16, 0, 0, 0),
            worked_hours: 8,
            status: 'CheckedOut',
            method: 'manual',
        });
    }));

    const overtime = await request(app)
        .post('/api/v1/overtime')
        .set(headers)
        .send({
            employee_id: employeeId,
            work_date: '2026-04-30',
            hours: 2,
            type: 'Weekday',
            status: 'Pending',
        })
        .expect(201);

    await request(app)
        .post(`/api/v1/overtime/${overtime.body.data._id}/approve`)
        .set(headers)
        .send({ review_note: 'Payroll eligible' })
        .expect(200);

    const payroll = await request(app)
        .post('/api/v1/payroll/generate')
        .set(headers)
        .send({
            employee_id: employeeId,
            month: 4,
            year: 2026,
            standard_month_hours: 176,
            overtime_rate: 1.5,
            deduction: 10,
        })
        .expect(201);

    assert.equal(payroll.body.data.basic_salary, 1760);
    assert.equal(payroll.body.data.allowance, 100);
    assert.equal(payroll.body.data.calculation_details.contract_snapshot.id, contract.body.data._id);
    assert.equal(payroll.body.data.calculation_details.contract_snapshot.status, 'Approved');
    assert.ok(payroll.body.data.total_overtime_hours >= 2);
    assert.ok(payroll.body.data.net_salary > 0);
});

test('payroll prorates salary from effective contract and blocks finalized regeneration', async () => {
    const headers = authHeader();
    const payrollEmployee = await createEmployee('EMP-PAY-CONTRACT-001');
    const payrollEmployeeId = payrollEmployee._id.toString();

    const draftContract = await request(app)
        .post('/api/v1/contracts')
        .set(headers)
        .send({
            employee_id: payrollEmployeeId,
            type: 'Full-time',
            start_date: '2026-04-16',
            base_salary: 3000,
            allowances: [{ name: 'Lunch', amount: 300 }],
        })
        .expect(201);

    await request(app)
        .post('/api/v1/payroll/generate')
        .set(headers)
        .send({
            employee_id: payrollEmployeeId,
            month: 4,
            year: 2026,
        })
        .expect(409);

    await request(app)
        .patch(`/api/v1/contracts/${draftContract.body.data._id}`)
        .set(headers)
        .send({ status: 'Pending' })
        .expect(200);

    await request(app)
        .patch(`/api/v1/contracts/${draftContract.body.data._id}`)
        .set(headers)
        .send({ status: 'Approved' })
        .expect(200);

    await Promise.all(Array.from({ length: 11 }, (_, index) => {
        const day = index + 16;
        return Attendance.create({
            employee_id: payrollEmployeeId,
            work_date: new Date(2026, 3, day),
            check_in: new Date(2026, 3, day, 8, 0, 0, 0),
            check_out: new Date(2026, 3, day, 16, 0, 0, 0),
            worked_hours: 8,
            status: 'CheckedOut',
            method: 'manual',
        });
    }));

    const payroll = await request(app)
        .post('/api/v1/payroll/generate')
        .set(headers)
        .send({
            employee_id: payrollEmployeeId,
            month: 4,
            year: 2026,
            finalize: true,
        })
        .expect(201);

    assert.equal(payroll.body.data.status, 'Finalized');
    assert.equal(payroll.body.data.basic_salary, 1500);
    assert.equal(payroll.body.data.allowance, 150);
    assert.equal(payroll.body.data.calculation_details.contract_snapshot.coverage.covered_days, 15);

    await request(app)
        .post('/api/v1/payroll/generate')
        .set(headers)
        .send({
            employee_id: payrollEmployeeId,
            month: 4,
            year: 2026,
        })
        .expect(409);
});

test('payroll does not pay base salary or allowance when employee has no work hours', async () => {
    const headers = authHeader();
    const noWorkEmployee = await createEmployee('EMP-PAY-NO-WORK-001');
    const noWorkEmployeeId = noWorkEmployee._id.toString();

    const contract = await request(app)
        .post('/api/v1/contracts')
        .set(headers)
        .send({
            employee_id: noWorkEmployeeId,
            type: 'Full-time',
            start_date: '2026-05-01',
            base_salary: 18500000,
            allowances: [{ name: 'Lunch', amount: 1200000 }],
        })
        .expect(201);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ status: 'Pending' })
        .expect(200);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ status: 'Approved' })
        .expect(200);

    const payroll = await request(app)
        .post('/api/v1/payroll/generate')
        .set(headers)
        .send({
            employee_id: noWorkEmployeeId,
            month: 5,
            year: 2026,
            standard_month_hours: 176,
        })
        .expect(201);

    assert.equal(payroll.body.data.total_work_hours, 0);
    assert.equal(payroll.body.data.basic_salary, 0);
    assert.equal(payroll.body.data.allowance, 0);
    assert.equal(payroll.body.data.net_salary, 0);
    assert.equal(payroll.body.data.calculation_details.payable_regular_hours, 0);
});

test('payroll ignores overtime requests that are not approved', async () => {
    const headers = authHeader();
    const overtimeEmployee = await createEmployee('EMP-PAY-PENDING-OT-001');
    const overtimeEmployeeId = overtimeEmployee._id.toString();

    const contract = await request(app)
        .post('/api/v1/contracts')
        .set(headers)
        .send({
            employee_id: overtimeEmployeeId,
            type: 'Full-time',
            start_date: '2026-06-01',
            base_salary: 1760,
        })
        .expect(201);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ status: 'Pending' })
        .expect(200);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ status: 'Approved' })
        .expect(200);

    await Attendance.create({
        employee_id: overtimeEmployeeId,
        work_date: new Date(2026, 5, 1),
        check_in: new Date(2026, 5, 1, 8, 0, 0, 0),
        check_out: new Date(2026, 5, 1, 16, 0, 0, 0),
        worked_hours: 8,
        status: 'CheckedOut',
        method: 'manual',
    });

    await request(app)
        .post('/api/v1/overtime')
        .set(headers)
        .send({
            employee_id: overtimeEmployeeId,
            work_date: '2026-06-15',
            hours: 4,
            type: 'Weekday',
            status: 'Pending',
        })
        .expect(201);

    const payroll = await request(app)
        .post('/api/v1/payroll/generate')
        .set(headers)
        .send({
            employee_id: overtimeEmployeeId,
            month: 6,
            year: 2026,
            standard_month_hours: 8,
        })
        .expect(201);

    assert.equal(payroll.body.data.basic_salary, 1760);
    assert.equal(payroll.body.data.total_overtime_hours, 0);
    assert.equal(payroll.body.data.overtime_salary, 0);
    assert.equal(payroll.body.data.net_salary, 1760);
});

test('payroll rejects deductions greater than total income', async () => {
    const headers = authHeader();
    const deductionEmployee = await createEmployee('EMP-PAY-DEDUCTION-001');
    const deductionEmployeeId = deductionEmployee._id.toString();

    const contract = await request(app)
        .post('/api/v1/contracts')
        .set(headers)
        .send({
            employee_id: deductionEmployeeId,
            type: 'Full-time',
            start_date: '2026-07-01',
            base_salary: 1760,
        })
        .expect(201);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ status: 'Pending' })
        .expect(200);

    await request(app)
        .patch(`/api/v1/contracts/${contract.body.data._id}`)
        .set(headers)
        .send({ status: 'Approved' })
        .expect(200);

    await Attendance.create({
        employee_id: deductionEmployeeId,
        work_date: new Date(2026, 6, 1),
        check_in: new Date(2026, 6, 1, 8, 0, 0, 0),
        check_out: new Date(2026, 6, 1, 16, 0, 0, 0),
        worked_hours: 8,
        status: 'CheckedOut',
        method: 'manual',
    });

    await request(app)
        .post('/api/v1/payroll/generate')
        .set(headers)
        .send({
            employee_id: deductionEmployeeId,
            month: 7,
            year: 2026,
            standard_month_hours: 176,
            deduction: 1000,
        })
        .expect(400);
});

test('contract, payroll, asset, training, and face log CRUD works', async () => {
    const headers = authHeader();
    const contractEmployee = await createEmployee('EMP-CONTRACT-001');
    const contractEmployeeId = contractEmployee._id.toString();

    await request(app)
        .post('/api/v1/contracts')
        .set(headers)
        .send({
            employee_id: contractEmployeeId,
            type: 'Full-time',
            start_date: '2026-01-01',
            base_salary: 1000,
            allowances: [{ name: 'Lunch', amount: 50 }],
        })
        .expect(201);

    await request(app)
        .post('/api/v1/payroll')
        .set(headers)
        .send({
            employee_id: contractEmployeeId,
            month: 5,
            year: 2026,
            basic_salary: 1000,
            net_salary: 1100,
            allowance: 100,
        })
        .expect(201);

    await request(app)
        .post('/api/v1/assets')
        .set(headers)
        .send({
            asset_name: 'Laptop Dell',
            category: 'Laptop',
            serial_number: 'LAP-001',
            status: 'Assigned',
            assigned_to: contractEmployeeId,
            assigned_date: '2026-04-28',
            purchase_date: '2026-01-10',
            purchase_cost: 15000000,
            location: 'Hanoi Office',
        })
        .expect(201);

    const assetList = await request(app)
        .get(`/api/v1/assets?employee_id=${contractEmployeeId}&category=Laptop&search=LAP-001`)
        .set(headers)
        .expect(200);

    assert.equal(assetList.body.data.items.length, 1);
    assert.equal(assetList.body.data.items[0].asset_name, 'Laptop Dell');
    assert.equal(assetList.body.data.items[0].assigned_to._id, contractEmployeeId);

    await request(app)
        .post('/api/v1/training')
        .set(headers)
        .send({
            course_name: 'Security Basics',
            sessions: [{
                start_date: '2026-06-01',
                end_date: '2026-06-01',
                employees: [{ employee_id: contractEmployeeId, status: 'Completed', score: 90 }],
            }],
        })
        .expect(201);

    await request(app)
        .post('/api/v1/face-logs')
        .set(headers)
        .send({
            employee_id: contractEmployeeId,
            confidence: 0.95,
            captured_image: '/captures/emp001.jpg',
            detected_at: '2026-04-28T08:00:00.000Z',
            status: 'Matched',
        })
        .expect(201);
});

test('generic bulk endpoint returns controlled error when unsupported', async () => {
    const response = await request(app)
        .post('/api/v1/training/bulk')
        .set(authHeader())
        .send({ course_name: 'Unsupported Bulk Course' })
        .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Bulk create not implemented for this resource');
});
