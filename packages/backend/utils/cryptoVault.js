const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getCurrentKeyVersion() {
    const version = process.env.APP_ENCRYPTION_KEY_VERSION || 'v1';
    if (!/^v[1-9]\d*$/.test(version)) {
        throw new Error('APP_ENCRYPTION_KEY_VERSION must use the format v1, v2, ...');
    }
    return version;
}

/**
 * Derive 32-byte encryption key buffer from environment variable or provided string.
 */
function getEncryptionKey(customKey, version = getCurrentKeyVersion()) {
    const versionedKey = process.env[`APP_ENCRYPTION_KEY_${version.toUpperCase()}`];
    const isCurrentVersion = version === getCurrentKeyVersion();
    const rawKey = customKey || versionedKey || (isCurrentVersion
        ? process.env.APP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY
        : null);
    if (!rawKey) {
        if (process.env.NODE_ENV === 'production' || version !== 'v1') {
            throw new Error(`APP_ENCRYPTION_KEY_${version.toUpperCase()} is required to decrypt this data`);
        }
        // Development-only fallback — must not be used in production
        return crypto.createHash('sha256').update('dev-only-fallback-encryption-key-32b').digest();
    }
    return crypto.createHash('sha256').update(String(rawKey)).digest();
}

/**
 * Encrypt a string using AES-256-GCM.
 * Output format: `v1:<iv_hex>:<tag_hex>:<ciphertext_hex>`
 *
 * @param {string} plaintext
 * @param {string|Buffer} [customKey]
 * @returns {string} Versioned encrypted ciphertext
 */
function encrypt(plaintext, customKey) {
    if (plaintext === null || plaintext === undefined || plaintext === '') {
        return plaintext;
    }
    const version = getCurrentKeyVersion();
    const key = getEncryptionKey(customKey, version);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(String(plaintext), 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${version}:${iv.toString('hex')}:${authTag}:${ciphertext}`;
}

/**
 * Decrypt a versioned AES-256-GCM ciphertext string.
 *
 * @param {string} encryptedString
 * @param {string|Buffer} [customKey]
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedString, customKey) {
    if (!encryptedString || typeof encryptedString !== 'string') {
        return encryptedString;
    }

    const parts = encryptedString.split(':');
    if (parts.length !== 4 || !/^v[1-9]\d*$/.test(parts[0])) {
        // Not in versioned format or not encrypted, return as is (graceful fallback for migration)
        return encryptedString;
    }

    const [, ivHex, tagHex, ciphertextHex] = parts;
    const key = getEncryptionKey(customKey, parts[0]);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertextHex, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
}

/**
 * Encrypt JSON serializable data (arrays, objects, numbers).
 */
function encryptJSON(data, customKey) {
    if (data === null || data === undefined) return data;
    return encrypt(JSON.stringify(data), customKey);
}

/**
 * Decrypt ciphertext back to JSON object/array.
 */
function decryptJSON(encryptedString, customKey) {
    if (!encryptedString || typeof encryptedString !== 'string') return encryptedString;
    const decrypted = decrypt(encryptedString, customKey);
    try {
        return JSON.parse(decrypted);
    } catch {
        return decrypted;
    }
}

function reencryptJSON(encryptedString) {
    if (typeof encryptedString !== 'string') return encryptedString;
    const encryptedVersion = encryptedString.split(':', 1)[0];
    if (!/^v[1-9]\d*$/.test(encryptedVersion) || encryptedVersion === getCurrentKeyVersion()) {
        return encryptedString;
    }
    return encryptJSON(decryptJSON(encryptedString));
}

/**
 * Mask sensitive string (e.g. CCCD: ********1234, Bank Account: ******5678).
 */
function mask(str, visibleStart = 0, visibleEnd = 4, maskChar = '*') {
    if (!str || typeof str !== 'string') return str;
    const len = str.length;
    if (len <= visibleStart + visibleEnd) {
        return maskChar.repeat(len);
    }
    const start = str.slice(0, visibleStart);
    const end = str.slice(len - visibleEnd);
    const masked = maskChar.repeat(len - visibleStart - visibleEnd);
    return `${start}${masked}${end}`;
}

const SENSITIVE_KEYS = new Set([
    'password',
    'password_hash',
    'token',
    'access_token',
    'refresh_token',
    'device_token',
    'bootstrap_token',
    'secret',
    'embedding',
    'embeddings',
    'raw_image',
    'image_base64',
    'frame',
    'cccd',
    'cmnd',
    'identity_number',
    'account_number',
    'bank_account',
    'tax_code',
    'social_insurance',
    'two_factor_secret',
    'two_factor_temp_token',
    'recovery_codes',
    'recovery_code',
    'otp_code',
]);

/**
 * Deep-sanitize PII & restricted data from objects before logging or export.
 */
function maskPII(obj, parentKey = '', depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 8) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => maskPII(item, parentKey, depth + 1));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isIdentityNumber = lowerKey === 'number' && parentKey.toLowerCase() === 'identity';
        if (SENSITIVE_KEYS.has(lowerKey) || isIdentityNumber) {
            if (typeof value === 'string') {
                sanitized[key] = lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')
                    ? '[REDACTED]'
                    : mask(value, 0, 4);
            } else if (Array.isArray(value)) {
                sanitized[key] = `[REDACTED_ARRAY_${value.length}_ITEMS]`;
            } else {
                sanitized[key] = '[REDACTED]';
            }
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = maskPII(value, key, depth + 1);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

module.exports = {
    encrypt,
    decrypt,
    encryptJSON,
    decryptJSON,
    mask,
    maskPII,
    getEncryptionKey,
    getCurrentKeyVersion,
    reencryptJSON,
};
