const authService = require('../services/auth.service');
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

const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, clientContext(req));
    res.cookie('accessToken', result.access_token, accessCookieOptions);
    res.cookie('refreshToken', result.refresh_token, refreshCookieOptions);
    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
    });
});

const login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, clientContext(req));
    if (result.require_2fa) {
        return res.json({
            success: true,
            message: 'Two-factor authentication required',
            data: result,
        });
    }
    res.cookie('accessToken', result.access_token, accessCookieOptions);
    res.cookie('refreshToken', result.refresh_token, refreshCookieOptions);
    res.json({
        success: true,
        message: 'Login successfully',
        data: result,
    });
});

const refresh = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body.refresh_token;
    const result = await authService.refresh(token, clientContext(req));
    res.cookie('accessToken', result.access_token, accessCookieOptions);
    res.cookie('refreshToken', result.refresh_token, refreshCookieOptions);
    res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
    });
});

const logout = asyncHandler(async (req, res) => {
    await authService.logout(
        {
            accessToken: req.token,
            refreshToken: req.cookies?.refreshToken || req.body.refresh_token,
        },
        clientContext(req),
    );
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.json({
        success: true,
        message: 'Logout successfully',
    });
});

const me = asyncHandler(async (req, res) => {
    const user = req.user.toObject();
    delete user.password_hash;

    res.json({
        success: true,
        data: user,
    });
});

const getSessions = asyncHandler(async (req, res) => {
    const sessions = await authService.getActiveSessions(req.user._id);
    res.json({
        success: true,
        data: sessions,
    });
});

const revokeOtherSessions = asyncHandler(async (req, res) => {
    const currentRefreshToken = req.cookies?.refreshToken || req.body?.refresh_token;
    const result = await authService.revokeOtherSessions(
        req.user._id,
        currentRefreshToken,
        clientContext(req),
    );
    res.json({
        success: true,
        message: 'All other active sessions have been revoked',
        data: result,
    });
});

module.exports = {
    register,
    login,
    logout,
    me,
    refresh,
    getSessions,
    revokeOtherSessions,
};
