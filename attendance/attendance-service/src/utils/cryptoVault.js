/**
 * cryptoVault.js — Attendance Service
 *
 * Giai đoạn 2: Mã hóa AES-256-GCM cho face_embedding tại Attendance Service.
 *
 * Chia sẻ cùng KEY và algorithm với packages/backend/utils/cryptoVault.js
 * để dữ liệu được sync từ Admin Backend có thể đọc được tại đây.
 *
 * ENV vars (cùng với Admin Backend):
 *   APP_ENCRYPTION_KEY         — Key hiện tại (fallback)
 *   APP_ENCRYPTION_KEY_VERSION — vd: v1, v2
 *   APP_ENCRYPTION_KEY_V1      — Key version 1
 *   APP_ENCRYPTION_KEY_V2      — Key version 2 (khi rotation)
 */

'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits, khuyến nghị cho GCM

function getCurrentKeyVersion() {
    const version = process.env.APP_ENCRYPTION_KEY_VERSION || 'v1';
    if (!/^v[1-9]\d*$/.test(version)) {
        throw new Error('APP_ENCRYPTION_KEY_VERSION phải có dạng v1, v2, ...');
    }
    return version;
}

function getEncryptionKey(version = getCurrentKeyVersion()) {
    const versionedKey = process.env[`APP_ENCRYPTION_KEY_${version.toUpperCase()}`];
    const isCurrentVersion = version === getCurrentKeyVersion();
    const rawKey = versionedKey || (isCurrentVersion
        ? (process.env.APP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY)
        : null);

    if (!rawKey) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(
                `APP_ENCRYPTION_KEY_${version.toUpperCase()} là bắt buộc trong production. ` +
                'Đặt APP_ENCRYPTION_KEY hoặc APP_ENCRYPTION_KEY_V1 trong .env'
            );
        }
        // Development-only fallback — KHÔNG dùng trong production
        console.warn(
            '[cryptoVault] WARNING: Dùng dev-only fallback encryption key. ' +
            'Set APP_ENCRYPTION_KEY trong .env trước khi dùng dữ liệu thật.'
        );
        return crypto.createHash('sha256').update('dev-only-fallback-encryption-key-32b').digest();
    }

    return crypto.createHash('sha256').update(String(rawKey)).digest();
}

/**
 * Mã hóa JSON (array/object) bằng AES-256-GCM.
 * Format output: `v1:<iv_hex>:<tag_hex>:<ciphertext_hex>`
 *
 * @param {any} data - Dữ liệu cần mã hóa (array, object, number)
 * @returns {string} Chuỗi ciphertext có version
 */
function encryptJSON(data) {
    if (data === null || data === undefined) return data;

    const version = getCurrentKeyVersion();
    const key = getEncryptionKey(version);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const plaintext = JSON.stringify(data);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${version}:${iv.toString('hex')}:${authTag}:${ciphertext}`;
}

/**
 * Giải mã ciphertext về JSON (array/object).
 *
 * @param {string} encryptedString - Chuỗi dạng `v1:<iv>:<tag>:<ciphertext>`
 * @returns {any} Dữ liệu gốc đã parse
 */
function decryptJSON(encryptedString) {
    if (!encryptedString || typeof encryptedString !== 'string') {
        return encryptedString;
    }

    const parts = encryptedString.split(':');
    if (parts.length !== 4 || !/^v[1-9]\d*$/.test(parts[0])) {
        // Không phải format versioned — có thể là dữ liệu cũ chưa mã hóa
        // Thử parse như JSON (migration path)
        try { return JSON.parse(encryptedString); } catch { return encryptedString; }
    }

    const [version, ivHex, tagHex, ciphertextHex] = parts;
    const key = getEncryptionKey(version);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertextHex, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return JSON.parse(plaintext);
}

/**
 * Kiểm tra xem một string có phải là ciphertext đã mã hóa không.
 */
function isEncrypted(value) {
    if (typeof value !== 'string') return false;
    const parts = value.split(':');
    return parts.length === 4 && /^v[1-9]\d*$/.test(parts[0]);
}

module.exports = {
    encryptJSON,
    decryptJSON,
    isEncrypted,
    getCurrentKeyVersion,
};
