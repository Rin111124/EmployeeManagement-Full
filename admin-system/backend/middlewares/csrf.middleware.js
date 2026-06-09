const { allowedOrigins } = require('../config/cors');

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function normalizeOrigin(value) {
    if (!value) return null;

    try {
        return new URL(value).origin;
    } catch (_error) {
        return null;
    }
}

function isAllowedOrigin(origin) {
    if (!origin || allowedOrigins === '*') {
        return true;
    }

    return allowedOrigins.includes(origin);
}

function hasAuthCookie(req) {
    return Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
}

function csrfOriginGuard(req, res, next) {
    if (!UNSAFE_METHODS.has(req.method) || !hasAuthCookie(req)) {
        return next();
    }

    const origin = normalizeOrigin(req.get('origin'));
    const referer = normalizeOrigin(req.get('referer'));
    const requestOrigin = origin || referer;

    // Non-browser clients often omit Origin/Referer. Browser cross-site unsafe
    // requests include one of these headers, which lets us reject CSRF attempts.
    if (requestOrigin && !isAllowedOrigin(requestOrigin)) {
        return res.status(403).json({
            success: false,
            message: 'Request origin is not allowed',
        });
    }

    return next();
}

module.exports = {
    csrfOriginGuard,
};
