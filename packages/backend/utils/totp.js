/**
 * utils/totp.js
 * Cung cấp xác thực 2 yếu tố TOTP (RFC 6238) tuân thủ tiêu chuẩn bảo mật,
 * hoạt động với Google Authenticator, Microsoft Authenticator, Apple Keychain, Authy.
 * Sử dụng hoàn toàn Node.js built-in crypto, không phụ thuộc thư viện ngoài.
 */

const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Mã hóa Buffer thành chuỗi Base32 (RFC 4648)
 * @param {Buffer} buffer
 * @returns {string}
 */
function base32Encode(buffer) {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;

        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
}

/**
 * Giải mã chuỗi Base32 thành Buffer
 * @param {string} base32Str
 * @returns {Buffer}
 */
function base32Decode(base32Str) {
    const cleanStr = String(base32Str || '')
        .toUpperCase()
        .replace(/=+$/, '')
        .replace(/\s+/g, '');

    let bits = 0;
    let value = 0;
    const bytes = [];

    for (let i = 0; i < cleanStr.length; i++) {
        const char = cleanStr[i];
        const val = BASE32_ALPHABET.indexOf(char);
        if (val === -1) {
            throw new Error(`Invalid Base32 character: ${char}`);
        }

        value = (value << 5) | val;
        bits += 5;

        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    return Buffer.from(bytes);
}

/**
 * Sinh khóa bí mật ngẫu nhiên (20 bytes = 160 bits) chuẩn RFC 6238
 * @returns {string} Chuỗi bí mật Base32
 */
function generateSecret() {
    const buffer = crypto.randomBytes(20);
    return base32Encode(buffer);
}

/**
 * Tính toán mã TOTP tại một timestamp cụ thể (RFC 6238)
 * @param {string} base32Secret
 * @param {number} [timeMs=Date.now()]
 * @param {number} [period=30]
 * @returns {string} Mã OTP 6 chữ số
 */
function generateTOTP(base32Secret, timeMs = Date.now(), period = 30) {
    const key = base32Decode(base32Secret);
    const counter = Math.floor(timeMs / 1000 / period);

    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter), 0);

    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
}

/**
 * Xác thực mã OTP từ người dùng kèm cơ chế bù trôi đồng hồ (+/- 1 chu kỳ 30 giây)
 * @param {string} token - Mã 6 số người dùng nhập
 * @param {string} base32Secret - Khóa bí mật Base32
 * @param {number} [window=1] - Số bước +/- cho phép (1 bước = +/- 30s)
 * @returns {boolean}
 */
function verifyTOTP(token, base32Secret, window = 1) {
    if (!token || !base32Secret) return false;
    const cleanToken = String(token).trim();
    if (!/^\d{6}$/.test(cleanToken)) return false;

    const now = Date.now();
    const period = 30;

    for (let step = -window; step <= window; step++) {
        const testTime = now + step * period * 1000;
        const expected = generateTOTP(base32Secret, testTime, period);
        if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
            return true;
        }
    }

    return false;
}

/**
 * Tạo đường dẫn otpauth URI chuẩn để các app Authenticator quét
 * @param {string} accountName - Username hoặc email
 * @param {string} base32Secret - Khóa bí mật
 * @param {string} [issuer="EmployeeManagement"]
 * @returns {string}
 */
function getOtpAuthUri(accountName, base32Secret, issuer = 'EmployeeManagement') {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${base32Secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Sinh danh sách mã khôi phục khẩn cấp ngẫu nhiên (Recovery Codes)
 * @param {number} [count=10]
 * @returns {string[]} Mảng gồm các mã dạng "XXXX-XXXX"
 */
function generateRecoveryCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
        codes.push(`${part1}-${part2}`);
    }
    return codes;
}

module.exports = {
    base32Encode,
    base32Decode,
    generateSecret,
    generateTOTP,
    verifyTOTP,
    getOtpAuthUri,
    generateRecoveryCodes,
};
