/**
 * services/twoFactor.service.js
 * Quản lý quy trình Xác thực 2 yếu tố (2FA / TOTP) chuẩn RFC 6238
 */

const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const cryptoVault = require('../utils/cryptoVault');
const {
    generateSecret,
    verifyTOTP,
    getOtpAuthUri,
    generateRecoveryCodes,
} = require('../utils/totp');
const authService = require('./auth.service');
const auditService = require('./audit.service');
const { AUDIT_ACTIONS } = require('../constants/auditActions');

/**
 * Khởi tạo thiết lập 2FA: Sinh secret mới, mã hóa lưu tạm và trả về QR Code
 */
async function initiateSetup(userId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    if (user.two_factor_enabled) {
        throw new AppError('2FA is already enabled on this account', 400);
    }

    const base32Secret = generateSecret();
    const encryptedSecret = cryptoVault.encrypt(base32Secret);

    user.two_factor_secret = encryptedSecret;
    await user.save();

    const otpauthUri = getOtpAuthUri(user.username, base32Secret, 'EmployeeManagement');
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 256,
    });

    return {
        secret: base32Secret,
        qr_code: qrCodeDataUrl,
        otpauth_uri: otpauthUri,
    };
}

/**
 * Xác nhận mã OTP đầu tiên để kích hoạt 2FA chính thức và trả về mã khôi phục
 */
async function verifyAndEnable(userId, token) {
    const user = await User.findById(userId).select('+two_factor_secret');
    if (!user || !user.two_factor_secret) {
        throw new AppError('2FA setup has not been initiated', 400);
    }

    const decryptedSecret = cryptoVault.decrypt(user.two_factor_secret);
    const isValid = verifyTOTP(token, decryptedSecret);

    if (!isValid) {
        throw new AppError('Invalid 6-digit verification code. Please check your authenticator app.', 400);
    }

    // Sinh 10 mã khôi phục khẩn cấp
    const plainRecoveryCodes = generateRecoveryCodes(10);
    const hashedCodes = await Promise.all(
        plainRecoveryCodes.map(async (code) => {
            const code_hash = await bcrypt.hash(code, 10);
            return {
                code_hash,
                used: false,
                used_at: null,
            };
        })
    );

    user.two_factor_enabled = true;
    user.two_factor_recovery_codes = hashedCodes;
    await user.save();

    await auditService.logAction({
        userId: user._id,
        action: 'TWO_FACTOR_ENABLE',
        target: { type: 'User', id: user._id },
        metadata: { username: user.username },
    });

    return {
        enabled: true,
        recovery_codes: plainRecoveryCodes,
    };
}

/**
 * Xác thực OTP hoặc mã khôi phục trong luồng đăng nhập (bước 2)
 */
async function verifyLoginOTP(tempToken, codeOrRecovery, context = {}) {
    if (!tempToken || !codeOrRecovery) {
        throw new AppError('Temporary token and verification code are required', 400);
    }

    const cleanInput = String(codeOrRecovery).trim().toUpperCase();

    const user = await User.findOne({
        two_factor_temp_token: tempToken,
        two_factor_temp_expires: { $gt: new Date() },
    })
        .select('+password_hash +two_factor_secret +two_factor_recovery_codes +two_factor_temp_token')
        .populate('employee_id');

    if (!user) {
        throw new AppError('2FA session has expired or is invalid. Please log in again.', 401);
    }

    let isVerified = false;
    let usedRecoveryCode = false;

    // Trường hợp 1: Người dùng nhập mã 6 số TOTP
    if (/^\d{6}$/.test(cleanInput)) {
        const decryptedSecret = cryptoVault.decrypt(user.two_factor_secret);
        isVerified = verifyTOTP(cleanInput, decryptedSecret);
    }
    // Trường hợp 2: Người dùng dùng mã khôi phục dạng XXXX-XXXX
    else if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanInput)) {
        const recoveryList = user.two_factor_recovery_codes || [];
        for (const item of recoveryList) {
            if (!item.used && (await bcrypt.compare(cleanInput, item.code_hash))) {
                item.used = true;
                item.used_at = new Date();
                isVerified = true;
                usedRecoveryCode = true;
                break;
            }
        }
    }

    if (!isVerified) {
        throw new AppError('Invalid verification code or recovery code', 401);
    }

    // Xóa temp token
    user.two_factor_temp_token = null;
    user.two_factor_temp_expires = null;
    await user.save();

    // Cấp cặp access_token và refresh_token chính thức
    const tokens = await authService.issueTokenPair(user, context);

    await auditService.logAction({
        userId: user._id,
        action: AUDIT_ACTIONS.AUTH_LOGIN,
        target: { type: 'User', id: user._id },
        metadata: {
            username: user.username,
            method: usedRecoveryCode ? '2fa_recovery_code' : '2fa_totp',
        },
        req: context.req,
    });

    return {
        user: authService.sanitizeUser(user),
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        refresh_expires_at: tokens.refreshExpiresAt,
        used_recovery_code: usedRecoveryCode,
    };
}

/**
 * Tắt 2FA: Yêu cầu mật khẩu tài khoản và mã OTP hiện tại
 */
async function disable(userId, password, token) {
    const user = await User.findById(userId).select('+password_hash +two_factor_secret');
    if (!user || !user.two_factor_enabled) {
        throw new AppError('2FA is not enabled on this account', 400);
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        throw new AppError('Incorrect account password', 401);
    }

    const decryptedSecret = cryptoVault.decrypt(user.two_factor_secret);
    const isValidToken = verifyTOTP(token, decryptedSecret);
    if (!isValidToken) {
        throw new AppError('Invalid verification code', 400);
    }

    user.two_factor_enabled = false;
    user.two_factor_secret = null;
    user.two_factor_recovery_codes = [];
    await user.save();

    await auditService.logAction({
        userId: user._id,
        action: 'TWO_FACTOR_DISABLE',
        target: { type: 'User', id: user._id },
        metadata: { username: user.username },
    });

    return { enabled: false };
}

/**
 * Tạo mới danh sách mã khôi phục khi người dùng đã dùng hết
 */
async function regenerateRecoveryCodes(userId, password) {
    const user = await User.findById(userId).select('+password_hash +two_factor_enabled');
    if (!user || !user.two_factor_enabled) {
        throw new AppError('2FA is not enabled on this account', 400);
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        throw new AppError('Incorrect account password', 401);
    }

    const plainCodes = generateRecoveryCodes(10);
    const hashedCodes = await Promise.all(
        plainCodes.map(async (code) => {
            const code_hash = await bcrypt.hash(code, 10);
            return { code_hash, used: false, used_at: null };
        })
    );

    user.two_factor_recovery_codes = hashedCodes;
    await user.save();

    return { recovery_codes: plainCodes };
}

module.exports = {
    initiateSetup,
    verifyAndEnable,
    verifyLoginOTP,
    disable,
    regenerateRecoveryCodes,
};
