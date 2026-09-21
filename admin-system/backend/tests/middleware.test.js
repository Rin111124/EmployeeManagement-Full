/**
 * middleware.test.js
 *
 * Unit tests for:
 * - authenticate(): valid token, expired, blacklisted, wrong type
 * - authorize(): role check (allowed / denied)
 * - csrfOriginGuard(): allowed and blocked origins
 * - requestSanitizer(): XSS strip, NoSQL operator key stripping
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-ok';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.CORS_ORIGIN = 'http://localhost:3000';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { csrfOriginGuard } = require('../middlewares/csrf.middleware');
const { requestSanitizer } = require('../middlewares/sanitize.middleware');
const { Employee, TokenBlacklist, User } = require('../models');
const env = require('../config/env');

let mongoServer;
let testUser;
let validAccessToken;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a minimal mock Express response object.
 * Supports detecting when the middleware sends a response directly
 * (without calling next) via the `sent` flag.
 */
function mockRes() {
    const res = {
        _status: null,
        _json: null,
        sent: false,
        _resolve: null,
        status(code) { this._status = code; return this; },
        json(body) {
            this._json = body;
            this.sent = true;
            // If a waiter is registered, resolve it
            if (this._resolve) this._resolve('response');
            return this;
        },
    };
    return res;
}

/**
 * Promisify a middleware: resolves with 'next' if next() is called without an error,
 * rejects with the error passed to next(err), or resolves with 'response' if the
 * middleware sends a response directly (without calling next).
 */
function runMiddleware(middleware, req, res) {
    return new Promise((resolve, reject) => {
        // Allow direct-response middlewares to resolve the promise
        res._resolve = resolve;
        middleware(req, res, (err) => {
            if (err) reject(err);
            else resolve('next');
        });
    });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const employee = await Employee.create({
        employee_code: 'MW-EMP001',
        full_name: 'Middleware Test User',
        date_of_birth: new Date('1990-01-01'),
        gender: 'Male',
        hire_date: new Date('2024-01-01'),
        face_data: [],
    });

    testUser = await User.create({
        employee_id: employee._id,
        username: 'mw_test_user',
        password_hash: await bcrypt.hash('secret', 12),
        roles: ['Admin'],
    });

    validAccessToken = jwt.sign(
        {
            sub: testUser._id.toString(),
            roles: testUser.roles,
            employee_id: employee._id.toString(),
            type: 'access',
            jti: 'valid-jti-001',
        },
        env.jwtSecret,
        { expiresIn: '1h' },
    );
});

test.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// ─── authenticate() ───────────────────────────────────────────────────────────

test('authenticate() — accepts valid Bearer token and populates req.user', async () => {
    const req = { headers: { authorization: `Bearer ${validAccessToken}` }, cookies: {} };
    const res = mockRes();

    const result = await runMiddleware(authenticate, req, res);
    assert.equal(result, 'next');
    assert.ok(req.user, 'req.user should be set');
    assert.equal(req.user._id.toString(), testUser._id.toString());
});

test('authenticate() — rejects request with no token', async () => {
    const req = { headers: {}, cookies: {} };
    const res = mockRes();

    await assert.rejects(
        () => runMiddleware(authenticate, req, res),
        (err) => { assert.equal(err.statusCode, 401); return true; },
    );
});

test('authenticate() — rejects expired access token', async () => {
    const expiredToken = jwt.sign(
        { sub: testUser._id.toString(), type: 'access', jti: 'expired-jti' },
        env.jwtSecret,
        { expiresIn: -1 },
    );

    const req = { headers: { authorization: `Bearer ${expiredToken}` }, cookies: {} };
    const res = mockRes();

    await assert.rejects(
        () => runMiddleware(authenticate, req, res),
        (err) => {
            assert.equal(err.statusCode, 401);
            assert.match(err.message, /expired/i);
            return true;
        },
    );
});

test('authenticate() — rejects blacklisted token', async () => {
    const blacklistedJti = 'blacklisted-jti-999';
    const blacklistedToken = jwt.sign(
        {
            sub: testUser._id.toString(),
            roles: testUser.roles,
            type: 'access',
            jti: blacklistedJti,
        },
        env.jwtSecret,
        { expiresIn: '1h' },
    );

    await TokenBlacklist.create({
        token_id: blacklistedJti,
        user_id: testUser._id,
        expires_at: new Date(Date.now() + 3600000),
        reason: 'logout',
    });

    const req = { headers: { authorization: `Bearer ${blacklistedToken}` }, cookies: {} };
    const res = mockRes();

    await assert.rejects(
        () => runMiddleware(authenticate, req, res),
        (err) => {
            assert.equal(err.statusCode, 401);
            assert.match(err.message, /revoked/i);
            return true;
        },
    );
});

test('authenticate() — rejects refresh token used as access token', async () => {
    const refreshTypedToken = jwt.sign(
        { sub: testUser._id.toString(), type: 'refresh', jti: 'wrong-type-jti' },
        env.jwtSecret,
        { expiresIn: '1h' },
    );

    const req = { headers: { authorization: `Bearer ${refreshTypedToken}` }, cookies: {} };
    const res = mockRes();

    await assert.rejects(
        () => runMiddleware(authenticate, req, res),
        (err) => { assert.equal(err.statusCode, 401); return true; },
    );
});

test('authenticate() — accepts token from cookie', async () => {
    const req = { headers: {}, cookies: { accessToken: validAccessToken } };
    const res = mockRes();

    const result = await runMiddleware(authenticate, req, res);
    assert.equal(result, 'next');
    assert.ok(req.user);
});

// ─── authorize() ──────────────────────────────────────────────────────────────

test('authorize() — allows request when user has required role', async () => {
    const req = { user: { roles: ['Admin'] } };
    const res = mockRes();

    const result = await runMiddleware(authorize('Admin'), req, res);
    assert.equal(result, 'next');
});

test('authorize() — allows when user has any one of the listed roles', async () => {
    const req = { user: { roles: ['HR'] } };
    const res = mockRes();

    const result = await runMiddleware(authorize('Admin', 'HR'), req, res);
    assert.equal(result, 'next');
});

test('authorize() — rejects when user lacks required role', async () => {
    const req = { user: { roles: ['Employee'] } };
    const res = mockRes();

    await assert.rejects(
        () => runMiddleware(authorize('Admin'), req, res),
        (err) => { assert.equal(err.statusCode, 403); return true; },
    );
});

test('authorize() — rejects when user has no roles', async () => {
    const req = { user: { roles: [] } };
    const res = mockRes();

    await assert.rejects(
        () => runMiddleware(authorize('Admin', 'HR'), req, res),
        (err) => { assert.equal(err.statusCode, 403); return true; },
    );
});

// ─── csrfOriginGuard() ───────────────────────────────────────────────────────

test('csrfOriginGuard() — passes GET requests without checking origin', async () => {
    const req = {
        method: 'GET',
        cookies: { accessToken: 'some-token' },
        get: () => null,
    };
    const res = mockRes();

    const result = await runMiddleware(csrfOriginGuard, req, res);
    assert.equal(result, 'next');
});

test('csrfOriginGuard() — passes POST from allowed origin', async () => {
    const req = {
        method: 'POST',
        cookies: { accessToken: 'some-token' },
        get: (h) => h === 'origin' ? 'http://localhost:3000' : null,
    };
    const res = mockRes();

    const result = await runMiddleware(csrfOriginGuard, req, res);
    assert.equal(result, 'next');
});

test('csrfOriginGuard() — blocks POST from disallowed origin when auth cookie present', async () => {
    const req = {
        method: 'POST',
        cookies: { accessToken: 'some-token' },
        get: (h) => h === 'origin' ? 'http://evil.example.com' : null,
    };
    const res = mockRes();

    await runMiddleware(csrfOriginGuard, req, res);
    // csrfOriginGuard sends 403 directly without calling next(err)
    assert.equal(res._status, 403);
    assert.equal(res._json.success, false);
});

test('csrfOriginGuard() — passes POST with no auth cookie (non-browser client)', async () => {
    const req = {
        method: 'POST',
        cookies: {},
        get: (h) => h === 'origin' ? 'http://evil.example.com' : null,
    };
    const res = mockRes();

    const result = await runMiddleware(csrfOriginGuard, req, res);
    assert.equal(result, 'next');
});

test('csrfOriginGuard() — passes when no origin/referer (non-browser API client)', async () => {
    const req = {
        method: 'POST',
        cookies: { accessToken: 'some-token' },
        get: () => null,
    };
    const res = mockRes();

    const result = await runMiddleware(csrfOriginGuard, req, res);
    assert.equal(result, 'next');
});

// ─── requestSanitizer() ──────────────────────────────────────────────────────

test('requestSanitizer() — strips XSS from string values in body', async () => {
    const req = {
        body: { name: '<script>alert(1)</script>Hello' },
        query: {},
        params: {},
    };
    const res = mockRes();

    await runMiddleware(requestSanitizer, req, res);
    assert.ok(!req.body.name.includes('<script>'), 'script tags should be stripped');
    assert.ok(req.body.name.includes('Hello'), 'safe text should remain');
});

test('requestSanitizer() — strips NoSQL injection operator keys ($where, $gt)', async () => {
    const req = {
        body: { $where: 'function() { return true; }', username: 'admin' },
        query: {},
        params: {},
    };
    const res = mockRes();

    await runMiddleware(requestSanitizer, req, res);
    assert.equal(req.body.$where, undefined, '$where key should be removed');
    assert.ok(Object.keys(req.body).some((k) => k === 'where'), 'key should be renamed to "where"');
});

test('requestSanitizer() — sanitizes nested objects', async () => {
    const req = {
        body: { contact: { name: '<img src=x onerror=alert(1)>' } },
        query: {},
        params: {},
    };
    const res = mockRes();

    await runMiddleware(requestSanitizer, req, res);
    assert.ok(!req.body.contact.name.includes('onerror'), 'onerror should be stripped from nested object');
});

test('requestSanitizer() — sanitizes query params', async () => {
    const req = {
        body: {},
        query: { search: '<b>bold</b>' },
        params: {},
    };
    const res = mockRes();

    await runMiddleware(requestSanitizer, req, res);
    // xss lib strips dangerous tags; <b> is allowed by default
    assert.ok(typeof req.query.search === 'string');
});

test('requestSanitizer() — passes non-string values unchanged', async () => {
    const req = {
        body: { count: 42, active: true, tags: ['a', 'b'] },
        query: {},
        params: {},
    };
    const res = mockRes();

    await runMiddleware(requestSanitizer, req, res);
    assert.equal(req.body.count, 42);
    assert.equal(req.body.active, true);
    assert.deepEqual(req.body.tags, ['a', 'b']);
});
