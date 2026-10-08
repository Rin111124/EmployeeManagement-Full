const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');

function readBackupSecret() {
    if (process.env.BACKUP_ENCRYPTION_KEY) return process.env.BACKUP_ENCRYPTION_KEY;
    const keyFile = process.env.BACKUP_ENCRYPTION_KEY_FILE;
    if (!keyFile) return '';
    return fs.readFileSync(keyFile, 'utf8').trim();
}

const MAGIC = Buffer.from('EMBK');
const VERSION = 1;
const HEADER_LENGTH = MAGIC.length + 1 + 12 + 16;

function deriveBackupKey(secret = readBackupSecret()) {
    if (typeof secret !== 'string' || !/^[a-f0-9]{64}$/i.test(secret)) {
        throw new Error('BACKUP_ENCRYPTION_KEY must be a dedicated 32-byte random key encoded as 64 hex characters');
    }
    return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

function encryptBackup(plaintext, secret) {
    const key = deriveBackupKey(secret);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const compressed = zlib.gzipSync(plaintext);
    const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
    return Buffer.concat([MAGIC, Buffer.from([VERSION]), iv, cipher.getAuthTag(), ciphertext]);
}

function decryptBackup(archive, secret) {
    if (!Buffer.isBuffer(archive) || archive.length < HEADER_LENGTH) {
        throw new Error('Encrypted backup is truncated or invalid');
    }
    if (!archive.subarray(0, MAGIC.length).equals(MAGIC) || archive[MAGIC.length] !== VERSION) {
        throw new Error('Unsupported encrypted backup format');
    }

    const key = deriveBackupKey(secret);
    const ivStart = MAGIC.length + 1;
    const tagStart = ivStart + 12;
    const ciphertextStart = tagStart + 16;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, archive.subarray(ivStart, tagStart));
    decipher.setAuthTag(archive.subarray(tagStart, ciphertextStart));
    const compressed = Buffer.concat([
        decipher.update(archive.subarray(ciphertextStart)),
        decipher.final(),
    ]);
    return zlib.gunzipSync(compressed);
}

module.exports = { deriveBackupKey, encryptBackup, decryptBackup };
