const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const env = require('../config/env');

/**
 * Rate limiter cho login endpoint — dùng IP vì user chưa authenticated.
 * Nghiêm ngặt hơn để chống brute-force.
 */
const loginLimiter = rateLimit({
    windowMs: env.loginRateLimitWindowMs,
    limit: env.loginRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again later.',
    },
});

/**
 * Rate limiter chung cho authenticated API routes.
 * keyGenerator dùng user ID (sau khi authenticate) để tránh việc 1 IP
 * bị throttle oan vì nhiều user đằng sau NAT/proxy.
 * Fallback về IP nếu chưa authenticate.
 */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,     // 1 phút
    limit: 300,               // 300 requests/phút/user
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req.ip),
    skip: (req) => req.method === 'OPTIONS',
    message: {
        success: false,
        message: 'Too many requests. Please slow down.',
    },
});

module.exports = {
    loginLimiter,
    apiLimiter,
};
