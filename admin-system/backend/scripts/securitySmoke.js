process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'security-smoke-access-secret-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'security-smoke-refresh-secret-at-least-32-chars';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.LOGIN_RATE_LIMIT_MAX = '50';

const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../app');
const {
    AuditLog,
    Department,
    Employee,
    User,
} = require('../models');

let mongoServer;

async function createEmployee(code, overrides = {}) {
    return Employee.create({
        employee_code: code,
        full_name: `Security Smoke ${code}`,
        date_of_birth: new Date('1995-01-01'),
        gender: 'Other',
        hire_date: new Date('2024-01-01'),
        ...overrides,
    });
}

async function createUser({ username, password = 'secret123', roles, employeeId }) {
    return User.create({
        employee_id: employeeId,
        username,
        password_hash: await bcrypt.hash(password, 12),
        roles,
    });
}

function pass(message) {
    console.log(`[PASS] ${message}`);
}

async function main() {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const adminEmployee = await createEmployee('SECADMIN');
    const employee = await createEmployee('SECEMP');
    const lockedEmployee = await createEmployee('SECLOCK');

    await createUser({ username: 'admin', roles: ['Admin'], employeeId: adminEmployee._id });
    await createUser({ username: 'employee', roles: ['Employee'], employeeId: employee._id });
    await createUser({ username: 'locked-user', roles: ['Employee'], employeeId: lockedEmployee._id });

    const health = await request(app).get('/health').expect(200);
    assert.equal(health.headers['x-content-type-options'], 'nosniff');
    pass('Helmet security headers are enabled');

    const login = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000')
        .send({ username: 'admin', password: 'secret123' })
        .expect(200);

    assert.equal(login.headers['access-control-allow-origin'], 'http://localhost:3000');
    assert.equal(login.headers['access-control-allow-credentials'], 'true');
    pass('CORS allows configured frontend origin with credentials');

    const cookies = login.headers['set-cookie'] || [];
    assert.ok(cookies.some((cookie) => cookie.startsWith('accessToken=') && cookie.includes('HttpOnly')));
    assert.ok(cookies.some((cookie) => cookie.startsWith('refreshToken=') && cookie.includes('HttpOnly')));
    pass('Login sets HttpOnly access and refresh token cookies');

    const adminToken = login.body.data.access_token;
    assert.ok(adminToken);
    assert.equal(login.body.data.user.password_hash, undefined);
    pass('API does not expose password hash');

    const oldRefreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));
    await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldRefreshCookie)
        .expect(200);
    await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldRefreshCookie)
        .expect(401);
    pass('Refresh token rotation rejects reused refresh tokens');

    const employeeLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'employee', password: 'secret123' })
        .expect(200);
    const employeeToken = employeeLogin.body.data.access_token;

    await request(app)
        .get(`/api/v1/employees/${employee._id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);
    await request(app)
        .get(`/api/v1/employees/${adminEmployee._id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    pass('Employee ownership checks block access to other employee data');

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
    pass('Account locks after five failed login attempts');

    await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ department_name: '<script>alert(1)</script>Security' })
        .expect(201);
    const department = await Department.findOne({ department_name: /Security/ });
    assert.ok(department);
    assert.equal(department.department_name.includes('<script>'), false);
    pass('Request sanitizer neutralizes XSS payloads');

    await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Cookie', cookies)
        .expect(200);
    await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(401);
    pass('Logout blacklists access token');

    const auditLog = await AuditLog.findOne({ action: 'AUTH_LOGIN' });
    assert.ok(auditLog);
    pass('Audit log is written for security-sensitive actions');

    console.log('Security smoke test passed.');
}

main()
    .catch((error) => {
        console.error('Security smoke test failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    });
