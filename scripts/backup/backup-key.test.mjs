import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { deriveBackupKey } from './backup-key.mjs';
import { decryptBackupArchive } from './backup-archive.mjs';
import zlib from 'node:zlib';

assert.throws(() => deriveBackupKey({}), /64 hex characters/);
assert.throws(() => deriveBackupKey({ BACKUP_ENCRYPTION_KEY: 'default-backup-secure-key-32bytes-min' }), /64 hex characters/);
assert.throws(() => deriveBackupKey({ APP_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex') }), /64 hex characters/);
assert.throws(() => deriveBackupKey({ BACKUP_ENCRYPTION_KEY: 'short' }), /64 hex characters/);

const secret = crypto.randomBytes(32).toString('hex');
const key = deriveBackupKey({ BACKUP_ENCRYPTION_KEY: secret });
const expected = crypto.createHash('sha256').update(secret, 'utf8').digest();

assert.equal(key.length, 32);
assert.deepEqual(key, expected);
process.stdout.write('Backup key checks passed (missing, weak, and shared app keys rejected; 256-bit backup key accepted).\n');

const legacyIv = crypto.randomBytes(12);
const legacyCipher = crypto.createCipheriv('aes-256-gcm', key, legacyIv);
const legacyCompressed = zlib.gzipSync(Buffer.from('legacy backup'));
const legacyCiphertext = Buffer.concat([legacyCipher.update(legacyCompressed), legacyCipher.final()]);
const legacyArchive = Buffer.concat([legacyIv, legacyCipher.getAuthTag(), legacyCiphertext]);
assert.equal(decryptBackupArchive(legacyArchive, key).toString('utf8'), 'legacy backup');
process.stdout.write('Legacy archives created with an explicit key remain restorable.\n');
