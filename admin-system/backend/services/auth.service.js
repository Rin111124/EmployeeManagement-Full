const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Employee, RefreshToken, TokenBlacklist, User } = require('../models');
const { AUDIT_ACTIONS } = require('../constants/auditActions');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { addDuration, hashToken } = require('../utils/token');
const auditService = require('./audit.service');

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;

function normalizeEmployeeId(employeeRef) {
    if (!employeeRef) return null;
    if (typeof employeeRef === 'string') return employeeRef;
    if (employeeRef._id) return String(employeeRef._id);
    if (employeeRef.id) return String(employeeRef.id);
    return null;
}

function signAccessToken(user) {
    const tokenId = crypto.randomUUID();
    const employeeId = normalizeEmployeeId(user.employee_id);
    return jwt.sign(
        {
            sub: user._id.toString(),
            roles: user.roles,
            employee_id: employeeId,
            type: 'access',
            jti: tokenId,
        },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn },
    );
}

function signRefreshToken(user, familyId = crypto.randomUUID()) {
    const tokenId = crypto.randomUUID();
    const expiresAt = addDuration(new Date(), env.jwtRefreshExpiresIn);
    const token = jwt.sign(
        {
            sub: user._id.toString(),
            type: 'refresh',
            jti: tokenId,
            family_id: familyId,
        },
        env.jwtRefreshSecret,
        { expiresIn: env.jwtRefreshExpiresIn },
    );

    return {
        token,
        tokenId,
        familyId,
        expiresAt,
    };
}

async function persistRefreshToken(user, refreshToken, context) {
    await RefreshToken.create({
        user_id: user._id,
        token_hash: hashToken(refreshToken.token),
        token_id: refreshToken.tokenId,
        family_id: refreshToken.familyId,
        expires_at: refreshToken.expiresAt,
        created_by_ip: context.ip,
        user_agent: context.userAgent,
    });
}

async function issueTokenPair(user, context = {}, familyId) {
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, familyId);
    await persistRefreshToken(user, refreshToken, context);

    return {
        accessToken,
        refreshToken: refreshToken.token,
        refreshExpiresAt: refreshToken.expiresAt,
    };
}

async function register(payload, context = {}) {
    const employee = await Employee.findById(payload.employee_id);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    const password_hash = await bcrypt.hash(payload.password, 12);
    const user = await User.create({
        employee_id: payload.employee_id,
        username: payload.username,
        password_hash,
        roles: payload.roles,
    });
    const tokens = await issueTokenPair(user, context);

    await auditService.logAction({
        userId: context.actorId || user._id,
        action: AUDIT_ACTIONS.AUTH_REGISTER,
        target: { type: 'User', id: user._id },
        metadata: { username: user.username, roles: user.roles },
        req: context.req,
    });

    return {
        user: sanitizeUser(user),
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        refresh_expires_at: tokens.refreshExpiresAt,
    };
}

async function login({ username, password }, context = {}) {
    const user = await User.findOne({ username })
        .select('+password_hash +login_history')
        .populate('employee_id');

    if (!user || !user.is_active) {
        throw new AppError('Invalid username or password', 401);
    }

    if (user.isLocked()) {
        await recordLoginAttempt(user, false, context);
        throw new AppError('Account is temporarily locked. Try again later.', 423);
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        await recordFailedLogin(user, context);
        throw new AppError('Invalid username or password', 401);
    }

    user.failed_login_attempts = 0;
    user.lock_until = null;
    user.last_login_at = new Date();
    user.last_login_ip = context.ip;
    user.last_login_user_agent = context.userAgent;
    await recordLoginAttempt(user, true, context);

    const tokens = await issueTokenPair(user, context);

    await auditService.logAction({
        userId: user._id,
        action: AUDIT_ACTIONS.AUTH_LOGIN,
        target: { type: 'User', id: user._id },
        metadata: { username: user.username },
        req: context.req,
    });

    return {
        user: sanitizeUser(user),
        access_token: tokens.accessToken,
        token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        refresh_expires_at: tokens.refreshExpiresAt,
    };
}

async function recordFailedLogin(user, context) {
    const failedAttempts = Number(user.failed_login_attempts || 0);
    user.failed_login_attempts = failedAttempts + 1;
    if (user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        user.lock_until = new Date(Date.now() + LOCK_TIME_MS);
    }
    await recordLoginAttempt(user, false, context);
}

async function recordLoginAttempt(user, success, context) {
    if (!Array.isArray(user.login_history)) {
        user.login_history = [];
    }

    user.login_history.push({
        ip: context.ip,
        user_agent: context.userAgent,
        success,
        created_at: new Date(),
    });
    user.login_history = user.login_history.slice(-20);
    await user.save();
}

async function refresh(refreshToken, context = {}) {
    if (!refreshToken) {
        throw new AppError('Refresh token is required', 401);
    }

    let payload;
    try {
        payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
    } catch (error) {
        throw new AppError('Invalid refresh token', 401);
    }

    if (payload.type !== 'refresh') {
        throw new AppError('Invalid refresh token', 401);
    }

    const storedToken = await RefreshToken.findOne({ token_hash: hashToken(refreshToken) });
    if (!storedToken || storedToken.revoked_at || storedToken.expires_at <= new Date()) {
        await RefreshToken.updateMany(
            { family_id: payload.family_id, revoked_at: null },
            { revoked_at: new Date() },
        );
        throw new AppError('Refresh token reuse detected', 401);
    }

    const user = await User.findById(payload.sub).populate('employee_id');
    if (!user || !user.is_active) {
        throw new AppError('User is not authorized', 401);
    }

    const tokens = await issueTokenPair(user, context, storedToken.family_id);
    const decodedRefresh = jwt.decode(tokens.refreshToken);

    storedToken.revoked_at = new Date();
    storedToken.replaced_by_token_id = decodedRefresh.jti;
    await storedToken.save();

    return {
        user: sanitizeUser(user),
        access_token: tokens.accessToken,
        token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        refresh_expires_at: tokens.refreshExpiresAt,
    };
}

async function logout({ accessToken, refreshToken }, context = {}) {
    if (accessToken) {
        const decodedAccess = jwt.decode(accessToken);
        if (decodedAccess?.jti && decodedAccess?.exp) {
            await TokenBlacklist.updateOne(
                { token_id: decodedAccess.jti },
                {
                    token_id: decodedAccess.jti,
                    user_id: decodedAccess.sub,
                    expires_at: new Date(decodedAccess.exp * 1000),
                    reason: 'logout',
                },
                { upsert: true },
            );
        }
    }

    if (refreshToken) {
        await RefreshToken.updateOne(
            { token_hash: hashToken(refreshToken), revoked_at: null },
            { revoked_at: new Date() },
        );
    }

    await auditService.logAction({
        userId: context.actorId || null,
        action: AUDIT_ACTIONS.AUTH_LOGOUT,
        target: { type: 'User', id: context.actorId || null },
        req: context.req,
    });
}

function sanitizeUser(user) {
    const data = user.toObject ? user.toObject() : user;
    delete data.password_hash;
    delete data.login_history;
    return data;
}

module.exports = {
    register,
    login,
    logout,
    refresh,
};
