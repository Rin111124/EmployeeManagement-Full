/**
 * controllers/twoFactor.controller.js
 * Controller xử lý các request liên quan đến Xác thực 2 yếu tố (2FA)
 */

const twoFactorService = require('../services/twoFactor.service');
const asyncHandler = require('../utils/asyncHandler');
const { accessCookieOptions, refreshCookieOptions } = require('../config/cookie');

function clientContext(req) {
    return {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        actorId: req.user?._id,
        req,
    };
}

/**
 * Lấy trạng thái 2FA của tài khoản hiện tại
 */
const getStatus = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: {
            enabled: Boolean(req.user.two_factor_enabled),
        },
    });
});

/**
 * Khởi tạo thiết lập 2FA: Trả về QR Code Data URL và secret text
 */
const setup = asyncHandler(async (req, res) => {
    const result = await twoFactorService.initiateSetup(req.user._id);
    res.json({
        success: true,
        message: '2FA setup initiated. Please scan the QR code with your authenticator app.',
        data: result,
    });
});

/**
 * Xác nhận mã OTP đầu tiên để kích hoạt 2FA chính thức
 */
const verifySetup = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const result = await twoFactorService.verifyAndEnable(req.user._id, token);
    res.json({
        success: true,
        message: 'Two-factor authentication enabled successfully. Please save your recovery codes safely.',
        data: result,
    });
});

/**
 * Xác thực 2FA trong luồng đăng nhập (bước 2)
 */
const verifyLogin = asyncHandler(async (req, res) => {
    const { temp_token, token, recovery_code } = req.body;
    const result = await twoFactorService.verifyLoginOTP(
        temp_token,
        token || recovery_code,
        clientContext(req)
    );

    res.cookie('accessToken', result.access_token, accessCookieOptions);
    res.cookie('refreshToken', result.refresh_token, refreshCookieOptions);

    res.json({
        success: true,
        message: 'Two-factor authentication verified. Login successful.',
        data: result,
    });
});

/**
 * Hủy kích hoạt 2FA (yêu cầu mật khẩu và mã OTP)
 */
const disable = asyncHandler(async (req, res) => {
    const { password, token } = req.body;
    const result = await twoFactorService.disable(req.user._id, password, token);
    res.json({
        success: true,
        message: 'Two-factor authentication disabled successfully.',
        data: result,
    });
});

/**
 * Sinh lại danh sách mã khôi phục mới
 */
const regenerateRecoveryCodes = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const result = await twoFactorService.regenerateRecoveryCodes(req.user._id, password);
    res.json({
        success: true,
        message: 'New recovery codes generated successfully. Previous codes are invalidated.',
        data: result,
    });
});

module.exports = {
    getStatus,
    setup,
    verifySetup,
    verifyLogin,
    disable,
    regenerateRecoveryCodes,
};
