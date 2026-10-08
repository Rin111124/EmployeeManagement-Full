const test = require('node:test');
const assert = require('node:assert/strict');
const {
    encrypt,
    decrypt,
    encryptJSON,
    decryptJSON,
    mask,
    maskPII,
    reencryptJSON,
} = require('../utils/cryptoVault');
const crypto = require('crypto');

test('CryptoVault: encrypt and decrypt roundtrip with AES-256-GCM', () => {
    const rawCCCD = '001201012345';
    const ciphertext = encrypt(rawCCCD);

    assert.ok(ciphertext.startsWith('v1:'), 'Encrypted string must start with key version v1:');
    assert.notEqual(ciphertext, rawCCCD);

    const decrypted = decrypt(ciphertext);
    assert.equal(decrypted, rawCCCD);
});

test('CryptoVault: tamper detection fails on corrupted authTag or ciphertext', () => {
    const rawBank = '999888777666';
    const ciphertext = encrypt(rawBank);
    const parts = ciphertext.split(':');

    // Corrupt ciphertext
    parts[3] = (parts[3].slice(0, -2) + (parts[3].endsWith('a') ? 'b' : 'a'));
    const corrupted = parts.join(':');

    assert.throws(() => {
        decrypt(corrupted);
    });
});

test('CryptoVault: JSON / Vector Embedding roundtrip', () => {
    const embedding = [0.123, -0.456, 0.789, 0.001, -0.999];
    const encrypted = encryptJSON(embedding);

    assert.ok(encrypted.startsWith('v1:'));
    const decrypted = decryptJSON(encrypted);

    assert.deepEqual(decrypted, embedding);
});

test('CryptoVault: rotates keys while keeping old ciphertext readable until migration', () => {
    const environmentKeys = [
        'APP_ENCRYPTION_KEY',
        'APP_ENCRYPTION_KEY_VERSION',
        'APP_ENCRYPTION_KEY_V1',
        'APP_ENCRYPTION_KEY_V2',
    ];
    const saved = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
    const oldKey = crypto.randomBytes(32).toString('hex');
    const newKey = crypto.randomBytes(32).toString('hex');

    try {
        process.env.APP_ENCRYPTION_KEY_VERSION = 'v1';
        process.env.APP_ENCRYPTION_KEY = oldKey;
        process.env.APP_ENCRYPTION_KEY_V1 = oldKey;
        delete process.env.APP_ENCRYPTION_KEY_V2;
        const oldCiphertext = encryptJSON({ biometric: [0.1, 0.2, 0.3] });
        assert.ok(oldCiphertext.startsWith('v1:'));

        process.env.APP_ENCRYPTION_KEY_VERSION = 'v2';
        process.env.APP_ENCRYPTION_KEY = newKey;
        assert.deepEqual(decryptJSON(oldCiphertext), { biometric: [0.1, 0.2, 0.3] });

        const rotated = reencryptJSON(oldCiphertext);
        assert.ok(rotated.startsWith('v2:'));
        assert.deepEqual(decryptJSON(rotated), { biometric: [0.1, 0.2, 0.3] });
    } finally {
        for (const key of environmentKeys) {
            if (saved[key] === undefined) delete process.env[key];
            else process.env[key] = saved[key];
        }
    }
});

test('CryptoVault: mask string protects sensitive numbers', () => {
    const cccd = '001201012345';
    const maskedCCCD = mask(cccd, 0, 4);
    assert.equal(maskedCCCD, '********2345');

    const bankAccount = '19035678912345';
    const maskedBank = mask(bankAccount, 0, 4);
    assert.equal(maskedBank, '**********2345');
});

test('CryptoVault: maskPII deeply sanitizes sensitive keys for logging/auditing', () => {
    const logPayload = {
        action: 'employee.update',
        user: { id: 'usr-1', email: 'admin@example.com' },
        employee: {
            full_name: 'Nguyen Van A',
            identity_number: '001201012345',
            bank_account: '999888777666',
            face_data: [
                {
                    embedding: [0.1, 0.2, 0.3],
                    provider: 'insightface',
                },
            ],
            password_hash: '$2b$10$abcdef...',
        },
    };

    const sanitized = maskPII(logPayload);

    assert.equal(sanitized.employee.full_name, 'Nguyen Van A');
    assert.equal(sanitized.employee.identity_number, '********2345');
    assert.equal(sanitized.employee.bank_account, '********7666');
    assert.equal(sanitized.employee.password_hash, '[REDACTED]');
    assert.equal(sanitized.employee.face_data[0].embedding, '[REDACTED_ARRAY_3_ITEMS]');
});
