/**
 * twoFactor.service.test.js
 *
 * Comprehensive unit/integration tests for twoFactor.service.js
 * Covers: initiateSetup, verifyAndEnable, verifyLoginOTP, disable, regenerateRecoveryCodes
 *
 * Target coverage: 19% → 85%+
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-ok';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CORS_ORIGIN = '*';
// CryptoVault needs an AES key (32 bytes hex)
process.env.CRYPTO_VAULT_KEY = 'a'.repeat(64);

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');

const twoFactorService = require('../services/twoFactor.service');
const { User, Employee } = require('../models');
const { generateTOTP, generateSecret, generateRecoveryCodes } = require('../utils/totp');
const cryptoVault = require('../utils/cryptoVault');

let mongoServer;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createUser(overrides = {}) {
    const employee = await Employee.create({
        employee_code: `EMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        full_name: 'Test 2FA User',
        date_of_birth: new Date('1990-01-01'),
        gender: 'Male',
        hire_date: new Date('2024-01-01'),
        face_data: [],
    });
    const user = await User.create({
        employee_id: employee._id,
        username: `u2fa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        password_hash: await bcrypt.hash('SecurePass123!', 12),
        roles: ['Employee'],
        ...overrides,
    });
    return { user, employee };
}

async function createUserWith2FAReady() {
    const { user, employee } = await createUser();
    // Simulate initiateSetup by manually setting encrypted secret
    const secret = generateSecret();
    user.two_factor_secret = cryptoVault.encrypt(secret);
    await user.save();
    return { user, employee, secret };
}

async function createUserWith2FAEnabled() {
    const { user, employee, secret } = await createUserWith2FAReady();
    // Hash 10 recovery codes
    const plainCodes = generateRecoveryCodes(10);
    const hashedCodes = await Promise.all(
        plainCodes.map(async (code) => ({
            code_hash: await bcrypt.hash(code, 10),
            used: false,
            used_at: null,
        }))
    );
    user.two_factor_enabled = true;
    user.two_factor_recovery_codes = hashedCodes;
    await user.save();
    return { user, employee, secret, plainCodes };
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

// ─── initiateSetup ────────────────────────────────────────────────────────────

test('2FA initiateSetup: returns secret, QR code and otpauth URI for a user without 2FA', async () => {
    const { user } = await createUser();
    const result = await twoFactorService.initiateSetup(user._id);

    assert.ok(result.secret, 'Should return base32 secret');
    assert.match(result.secret, /^[A-Z2-7]+$/, 'Secret should be Base32');
    assert.ok(result.qr_code.startsWith('data:image/png;base64,'), 'Should return PNG data URL');
    assert.ok(result.otpauth_uri.startsWith('otpauth://totp/'), 'Should return otpauth URI');

    // Verify secret was persisted (encrypted) in DB
    const updated = await User.findById(user._id).select('+two_factor_secret');
    assert.ok(updated.two_factor_secret, 'Encrypted secret should be saved in DB');
});

test('2FA initiateSetup: throws 404 for non-existent user', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await assert.rejects(
        () => twoFactorService.initiateSetup(fakeId),
        (err) => { assert.equal(err.statusCode, 404); return true; }
    );
});

test('2FA initiateSetup: throws 400 if 2FA already enabled', async () => {
    const { user } = await createUserWith2FAEnabled();
    await assert.rejects(
        () => twoFactorService.initiateSetup(user._id),
        (err) => { assert.equal(err.statusCode, 400); return true; }
    );
});

// ─── verifyAndEnable ──────────────────────────────────────────────────────────

test('2FA verifyAndEnable: enables 2FA and returns 10 recovery codes on valid TOTP', async () => {
    const { user, secret } = await createUserWith2FAReady();
    const validToken = generateTOTP(secret, Date.now());

    const result = await twoFactorService.verifyAndEnable(user._id, validToken);

    assert.equal(result.enabled, true);
    assert.equal(result.recovery_codes.length, 10, 'Should return 10 recovery codes');
    for (const code of result.recovery_codes) {
        assert.match(code, /^[A-F0-9]{4}-[A-F0-9]{4}$/, 'Recovery code must match XXXX-XXXX hex format');
    }

    // Verify 2FA flag set in DB
    const updated = await User.findById(user._id).select('+two_factor_recovery_codes');
    assert.equal(updated.two_factor_enabled, true);
    assert.equal(updated.two_factor_recovery_codes.length, 10);
    // All codes should be stored hashed (not plaintext)
    for (const stored of updated.two_factor_recovery_codes) {
        assert.ok(stored.code_hash, 'Recovery code must be stored as hash');
        assert.equal(stored.used, false);
    }
});

test('2FA verifyAndEnable: throws 400 on invalid TOTP code', async () => {
    const { user } = await createUserWith2FAReady();
    await assert.rejects(
        () => twoFactorService.verifyAndEnable(user._id, '000000'),
        (err) => { assert.equal(err.statusCode, 400); return true; }
    );
});

test('2FA verifyAndEnable: throws 400 if setup was not initiated (no secret)', async () => {
    const { user } = await createUser();
    await assert.rejects(
        () => twoFactorService.verifyAndEnable(user._id, '123456'),
        (err) => { assert.equal(err.statusCode, 400); return true; }
    );
});

// ─── verifyLoginOTP ───────────────────────────────────────────────────────────

test('2FA verifyLoginOTP: throws 400 when tempToken or code is missing', async () => {
    await assert.rejects(
        () => twoFactorService.verifyLoginOTP('', '123456'),
        (err) => { assert.equal(err.statusCode, 400); return true; }
    );
    await assert.rejects(
        () => twoFactorService.verifyLoginOTP('sometoken', ''),
        (err) => { assert.equal(err.statusCode, 400); return true; }
    );
});

test('2FA verifyLoginOTP: throws 401 for expired or invalid temp token', async () => {
    await assert.rejects(
        () => twoFactorService.verifyLoginOTP('invalid-token-xyz', '123456'),
        (err) => { assert.equal(err.statusCode, 401); return true; }
    );
});

test('2FA verifyLoginOTP: accepts valid TOTP and issues JWT tokens', async () => {
    const { user, secret } = await createUserWith2FAEnabled();

    // Simulate login step 1: set temp token
    const tempToken = crypto.randomBytes(32).toString('hex');
    user.two_factor_temp_token = tempToken;
    user.two_factor_temp_expires = new Date(Date.now() + 10 * 60 * 1000); // +10 min
    await user.save();

    const validCode = generateTOTP(secret, Date.now());
    const result = await twoFactorService.verifyLoginOTP(tempToken, validCode);

    assert.ok(result.access_token, 'Should return access token');
    assert.ok(result.refresh_token, 'Should return refresh token');
    assert.ok(result.user, 'Should return sanitized user');
    assert.equal(result.used_recovery_code, false);

    // Temp token should be cleared in DB
    const updated = await User.findById(user._id).select('+two_factor_temp_token');
    assert.equal(updated.two_factor_temp_token, null);
});

test('2FA verifyLoginOTP: accepts valid recovery code (XXXX-XXXX) and marks it used', async () => {
    const { user, plainCodes } = await createUserWith2FAEnabled();

    const tempToken = crypto.randomBytes(32).toString('hex');
    user.two_factor_temp_token = tempToken;
    user.two_factor_temp_expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const result = await twoFactorService.verifyLoginOTP(tempToken, plainCodes[0]);

    assert.equal(result.used_recovery_code, true, 'Should flag recovery code use');
    assert.ok(result.access_token);

    // First recovery code should now be marked used
    const updated = await User.findById(user._id).select('+two_factor_recovery_codes');
    const usedCode = updated.two_factor_recovery_codes[0];
    assert.equal(usedCode.used, true);
    assert.ok(usedCode.used_at);
});

test('2FA verifyLoginOTP: rejects already-used recovery code', async () => {
    const { user, plainCodes } = await createUserWith2FAEnabled();

    const tempToken = crypto.randomBytes(32).toString('hex');
    user.two_factor_temp_token = tempToken;
    user.two_factor_temp_expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Use it once (succeeds)
    await twoFactorService.verifyLoginOTP(tempToken, plainCodes[1]);

    // Set a new temp token (old one was cleared)
    const updated = await User.findById(user._id);
    const tempToken2 = crypto.randomBytes(32).toString('hex');
    updated.two_factor_temp_token = tempToken2;
    updated.two_factor_temp_expires = new Date(Date.now() + 10 * 60 * 1000);
    await updated.save();

    // Attempt to use the same code again - should fail with 401
    await assert.rejects(
        () => twoFactorService.verifyLoginOTP(tempToken2, plainCodes[1]),
        (err) => { assert.equal(err.statusCode, 401); return true; }
    );
});

test('2FA verifyLoginOTP: rejects invalid TOTP code', async () => {
    const { user } = await createUserWith2FAEnabled();

    const tempToken = crypto.randomBytes(32).toString('hex');
    user.two_factor_temp_token = tempToken;
    user.two_factor_temp_expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await assert.rejects(
        () => twoFactorService.verifyLoginOTP(tempToken, '000000'),
        (err) => { assert.equal(err.statusCode, 401); return true; }
    );
});

// ─── disable ──────────────────────────────────────────────────────────────────

test('2FA disable: disables 2FA with correct password and TOTP', async () => {
    const { user, secret } = await createUserWith2FAEnabled();
    const validToken = generateTOTP(secret, Date.now());

    const result = await twoFactorService.disable(user._id, 'SecurePass123!', validToken);

    assert.equal(result.enabled, false);

    const updated = await User.findById(user._id).select('+two_factor_secret +two_factor_recovery_codes');
    assert.equal(updated.two_factor_enabled, false);
    assert.equal(updated.two_factor_secret, null);
    assert.equal(updated.two_factor_recovery_codes.length, 0);
});

test('2FA disable: throws 401 on wrong password', async () => {
    const { user, secret } = await createUserWith2FAEnabled();
    const validToken = generateTOTP(secret, Date.now());

    await assert.rejects(
        () => twoFactorService.disable(user._id, 'WrongPassword!', validToken),
        (err) => { assert.equal(err.statusCode, 401); return true; }
    );
});

test('2FA disable: throws 400 on invalid TOTP', async () => {
    const { user } = await createUserWith2FAEnabled();
    await assert.rejects(
        () => twoFactorService.disable(user._id, 'SecurePass123!', '000000'),
        (err) => { assert.equal(err.statusCode, 400); return true; }
    );
});

test('2FA disable: throws 400 if 2FA is not enabled', async () => {
    const { user } = await createUser();
    await assert.rejects(
        () => twoFactorService.disable(user._id, 'SecurePass123!', '123456'),
        (err) => { assert.equal(err.statusCode, 400); return true; }
    );
});

// ─── regenerateRecoveryCodes ──────────────────────────────────────────────────

test('2FA regenerateRecoveryCodes: returns 10 new codes and replaces old ones', async () => {
    const { user, plainCodes: oldCodes } = await createUserWith2FAEnabled();

    const result = await twoFactorService.regenerateRecoveryCodes(user._id, 'SecurePass123!');

    assert.equal(result.recovery_codes.length, 10);
    // New codes should not equal old codes (extremely high probability)
    assert.notDeepEqual(result.recovery_codes, oldCodes);
    for (const code of result.recovery_codes) {
        assert.match(code, /^[A-F0-9]{4}-[A-F0-9]{4}$/);
    }

    // DB should have 10 fresh codes, all unused
    const updated = await User.findById(user._id).select('+two_factor_recovery_codes');
    assert.equal(updated.two_factor_recovery_codes.length, 10);
    for (const stored of updated.two_factor_recovery_codes) {
        assert.equal(stored.used, false);
        assert.equal(stored.used_at, null);
    }
});

test('2FA regenerateRecoveryCodes: throws 401 on wrong password', async () => {
    const { user } = await createUserWith2FAEnabled();
    await assert.rejects(
        () => twoFactorService.regenerateRecoveryCodes(user._id, 'WrongPass!'),
        (err) => { assert.equal(err.statusCode, 401); return true; }
    );
});

test('2FA regenerateRecoveryCodes: throws 400 if 2FA is not enabled', async () => {
    const { user } = await createUser();
    await assert.rejects(
        () => twoFactorService.regenerateRecoveryCodes(user._id, 'SecurePass123!'),
        (err) => { assert.equal(err.statusCode, 400); return true; }
    );
});
