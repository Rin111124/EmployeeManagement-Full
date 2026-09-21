/**
 * auth.service.test.js
 *
 * Unit/integration tests for auth.service.js focusing on:
 * - login() with locked account
 * - refresh() with expired token
 * - refresh() with reused token (token family detection)
 * - logout() blacklists access token
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-ok';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CORS_ORIGIN = '*';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const authService = require('../services/auth.service');
const { Employee, RefreshToken, TokenBlacklist, User } = require('../models');
const env = require('../config/env');

let mongoServer;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createUserWithEmployee(overrides = {}) {
    const employee = await Employee.create({
        employee_code: `EMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        full_name: 'Test User',
        date_of_birth: new Date('1990-01-01'),
        gender: 'Male',
        hire_date: new Date('2024-01-01'),
        face_data: [],
    });

    const user = await User.create({
        employee_id: employee._id,
        username: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        password_hash: await bcrypt.hash('password123', 12),
        roles: ['Employee'],
        ...overrides,
    });

    return { user, employee };
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test('login() rejects invalid username', async () => {
    await assert.rejects(
        () => authService.login({ username: 'nonexistent', password: 'any' }),
        (err) => {
            assert.equal(err.statusCode, 401);
            return true;
        },
    );
});

test('login() rejects wrong password', async () => {
    const { user } = await createUserWithEmployee();

    await assert.rejects(
        () => authService.login({ username: user.username, password: 'wrongpassword' }),
        (err) => {
            assert.equal(err.statusCode, 401);
            return true;
        },
    );
});

test('login() rejects locked account', async () => {
    const { user } = await createUserWithEmployee({
        failed_login_attempts: 5,
        lock_until: new Date(Date.now() + 10 * 60 * 1000), // locked for 10 more minutes
    });

    await assert.rejects(
        () => authService.login({ username: user.username, password: 'password123' }),
        (err) => {
            assert.equal(err.statusCode, 423);
            assert.match(err.message, /locked/i);
            return true;
        },
    );
});

test('login() returns access + refresh token on success', async () => {
    const { user } = await createUserWithEmployee();

    const result = await authService.login({ username: user.username, password: 'password123' });

    assert.ok(result.access_token, 'should return access_token');
    assert.ok(result.refresh_token, 'should return refresh_token');
    assert.ok(result.refresh_expires_at, 'should return refresh_expires_at');
    assert.ok(result.user, 'should return sanitized user');
    assert.equal(result.user.password_hash, undefined, 'password_hash must be stripped');
});

test('login() increments failed_login_attempts on wrong password', async () => {
    const { user } = await createUserWithEmployee();

    try {
        await authService.login({ username: user.username, password: 'wrong' });
    } catch (_e) { /* expected */ }

    const updated = await User.findById(user._id).select('+failed_login_attempts');
    assert.equal(updated.failed_login_attempts, 1);
});

test('login() locks account after 5 failed attempts', async () => {
    const { user } = await createUserWithEmployee();

    for (let i = 0; i < 5; i++) {
        try {
            await authService.login({ username: user.username, password: 'wrong' });
        } catch (_e) { /* expected */ }
    }

    const updated = await User.findById(user._id).select('+failed_login_attempts +lock_until');
    assert.ok(updated.lock_until, 'lock_until should be set');
    assert.ok(updated.lock_until > new Date(), 'lock should be in the future');
});

test('refresh() returns new token pair', async () => {
    const { user } = await createUserWithEmployee();
    const loginResult = await authService.login({ username: user.username, password: 'password123' });

    const refreshResult = await authService.refresh(loginResult.refresh_token);

    assert.ok(refreshResult.access_token);
    assert.ok(refreshResult.refresh_token);
    // New token should differ from old token
    assert.notEqual(refreshResult.refresh_token, loginResult.refresh_token);
});

test('refresh() detects and invalidates reused refresh token (token family detection)', async () => {
    const { user } = await createUserWithEmployee();
    const loginResult = await authService.login({ username: user.username, password: 'password123' });
    const originalRefreshToken = loginResult.refresh_token;

    // First use — should succeed
    await authService.refresh(originalRefreshToken);

    // Second use of SAME token — should detect reuse and revoke entire family
    await assert.rejects(
        () => authService.refresh(originalRefreshToken),
        (err) => {
            assert.equal(err.statusCode, 401);
            assert.match(err.message, /reuse/i);
            return true;
        },
    );

    // The new tokens from first refresh should also be revoked (family invalidated)
    const familyTokens = await RefreshToken.find({ revoked_at: { $ne: null } });
    assert.ok(familyTokens.length >= 2, 'Both tokens in the family should be revoked');
});

test('refresh() rejects expired refresh token', async () => {
    // Sign an already-expired refresh JWT
    const fakePayload = { sub: new mongoose.Types.ObjectId().toString(), type: 'refresh', jti: 'test-jti', family_id: 'test-family' };
    const expiredToken = jwt.sign(fakePayload, env.jwtRefreshSecret, { expiresIn: -1 });

    await assert.rejects(
        () => authService.refresh(expiredToken),
        (err) => {
            assert.equal(err.statusCode, 401);
            return true;
        },
    );
});

test('refresh() rejects missing refresh token', async () => {
    await assert.rejects(
        () => authService.refresh(null),
        (err) => {
            assert.equal(err.statusCode, 401);
            return true;
        },
    );
});

test('logout() blacklists the access token so it cannot be reused', async () => {
    const { user } = await createUserWithEmployee();
    const loginResult = await authService.login({ username: user.username, password: 'password123' });
    const { access_token, refresh_token } = loginResult;

    await authService.logout({ accessToken: access_token, refreshToken: refresh_token });

    // Decode to get jti
    const decoded = jwt.decode(access_token);
    const blacklisted = await TokenBlacklist.exists({ token_id: decoded.jti });
    assert.ok(blacklisted, 'access token jti should be in blacklist after logout');
});

test('logout() revokes the refresh token', async () => {
    const { user } = await createUserWithEmployee();
    const loginResult = await authService.login({ username: user.username, password: 'password123' });
    const { access_token, refresh_token } = loginResult;

    await authService.logout({ accessToken: access_token, refreshToken: refresh_token });

    // Refresh should fail after logout
    await assert.rejects(
        () => authService.refresh(refresh_token),
        (err) => {
            assert.equal(err.statusCode, 401);
            return true;
        },
    );
});
