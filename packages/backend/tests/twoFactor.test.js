const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
    generateSecret,
    generateTOTP,
    verifyTOTP,
    getOtpAuthUri,
    generateRecoveryCodes,
    base32Encode,
    base32Decode,
} = require('../utils/totp');
const { validateImageMagicBytes, ALLOWED_IMAGE_TYPES } = require('../utils/imageValidation');

test('TOTP: Base32 roundtrip encodes and decodes properly', () => {
    const original = crypto.randomBytes(20);
    const encoded = base32Encode(original);
    const decoded = base32Decode(encoded);

    assert.deepEqual(decoded, original);
});

test('TOTP: Generates and verifies valid 6-digit token within clock window', () => {
    const secret = generateSecret();
    assert.match(secret, /^[A-Z2-7]{32}$/, 'Secret must be 32 Base32 characters for 20-byte random seed');

    const now = Date.now();
    const token = generateTOTP(secret, now);
    assert.match(token, /^\d{6}$/, 'Token must be exactly 6 digits');

    // Verify at current time
    assert.equal(verifyTOTP(token, secret), true);

    // Verify with 25s forward drift (still within same or +/- 1 window)
    const driftToken = generateTOTP(secret, now + 25000);
    assert.equal(verifyTOTP(driftToken, secret), true);

    // Invalid token must be rejected
    assert.equal(verifyTOTP('000000', secret), false);
    assert.equal(verifyTOTP('abc123', secret), false);
    assert.equal(verifyTOTP('', secret), false);
});

test('TOTP: Generates standard otpauth URI for Authenticator apps', () => {
    const secret = generateSecret();
    const uri = getOtpAuthUri('admin', secret, 'EmployeeManagement');

    assert.ok(uri.startsWith('otpauth://totp/EmployeeManagement:admin?'));
    assert.ok(uri.includes(`secret=${secret}`));
    assert.ok(uri.includes('issuer=EmployeeManagement'));
});

test('TOTP: Generates valid recovery codes', () => {
    const codes = generateRecoveryCodes(10);
    assert.equal(codes.length, 10);
    for (const code of codes) {
        assert.match(code, /^[A-F0-9]{4}-[A-F0-9]{4}$/);
    }
});

test('MagicBytes: Detects JPEG image signature accurately', () => {
    const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const result = validateImageMagicBytes(fakeJpeg);

    assert.equal(result.valid, true);
    assert.equal(result.mime, ALLOWED_IMAGE_TYPES.JPEG);
});

test('MagicBytes: Detects PNG image signature accurately', () => {
    const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const result = validateImageMagicBytes(fakePng);

    assert.equal(result.valid, true);
    assert.equal(result.mime, ALLOWED_IMAGE_TYPES.PNG);
});

test('MagicBytes: Detects WebP image signature accurately', () => {
    // RIFF....WEBP
    const fakeWebp = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    const result = validateImageMagicBytes(fakeWebp);

    assert.equal(result.valid, true);
    assert.equal(result.mime, ALLOWED_IMAGE_TYPES.WEBP);
});

test('MagicBytes: Rejects malicious executable, script, or corrupted file signatures', () => {
    // Windows MZ executable
    const fakeExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    assert.equal(validateImageMagicBytes(fakeExe).valid, false);

    // Bash script: #!/bin/bash
    const fakeScript = Buffer.from('#!/bin/bash\necho hack');
    assert.equal(validateImageMagicBytes(fakeScript).valid, false);

    // Too short buffer
    const tooShort = Buffer.from([0xff, 0xd8]);
    assert.equal(validateImageMagicBytes(tooShort).valid, false);

    // Null or non-buffer
    assert.equal(validateImageMagicBytes(null).valid, false);
});
