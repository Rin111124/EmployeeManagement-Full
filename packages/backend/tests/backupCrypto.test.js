process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { deriveBackupKey, encryptBackup, decryptBackup } = require('../utils/backupCrypto');

const backupKey = crypto.randomBytes(32).toString('hex');

test('encrypted backup round-trips with an independent backup key', () => {
    const plaintext = Buffer.from(JSON.stringify({ app: 'EmployeeManagement', biometric: [0.1, 0.2] }));
    const archive = encryptBackup(plaintext, backupKey);

    assert.equal(archive.subarray(0, 4).toString('ascii'), 'EMBK');
    assert.deepEqual(decryptBackup(archive, backupKey), plaintext);
});

test('admin API and operations backup scripts use the same versioned archive format', async () => {
    const { encryptBackupArchive, decryptBackupArchive } = await import('../../../scripts/backup/backup-archive.mjs');
    const plaintext = Buffer.from(JSON.stringify({ records: [{ id: 'sample' }] }));
    const key = deriveBackupKey(backupKey);

    const operationsArchive = encryptBackupArchive(plaintext, key);
    assert.deepEqual(decryptBackup(operationsArchive, backupKey), plaintext);

    const apiArchive = encryptBackup(plaintext, backupKey);
    assert.deepEqual(decryptBackupArchive(apiArchive, key), plaintext);
});

test('encrypted backup rejects tampering, wrong key, and truncated archives', () => {
    const archive = encryptBackup(Buffer.from('sensitive'), backupKey);
    const tampered = Buffer.from(archive);
    tampered[tampered.length - 1] ^= 0x01;

    assert.throws(() => decryptBackup(tampered, backupKey));
    assert.throws(() => decryptBackup(archive, crypto.randomBytes(32).toString('hex')));
    assert.throws(() => decryptBackup(Buffer.from('EMBK')));
});

test('backup key must be dedicated and exactly 256 bits', () => {
    assert.throws(() => deriveBackupKey(''), /64 hex characters/);
    assert.throws(() => deriveBackupKey('z'.repeat(64)), /64 hex characters/);
    assert.throws(() => deriveBackupKey('short'), /64 hex characters/);
    const previousBackupKey = process.env.BACKUP_ENCRYPTION_KEY;
    const previousAppKey = process.env.APP_ENCRYPTION_KEY;
    delete process.env.BACKUP_ENCRYPTION_KEY;
    process.env.APP_ENCRYPTION_KEY = backupKey;
    assert.throws(() => deriveBackupKey(), /64 hex characters/);
    if (previousBackupKey === undefined) delete process.env.BACKUP_ENCRYPTION_KEY;
    else process.env.BACKUP_ENCRYPTION_KEY = previousBackupKey;
    if (previousAppKey === undefined) delete process.env.APP_ENCRYPTION_KEY;
    else process.env.APP_ENCRYPTION_KEY = previousAppKey;
});
