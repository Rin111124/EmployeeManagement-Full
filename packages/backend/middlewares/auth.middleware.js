const jwt = require('jsonwebtoken');
const { TokenBlacklist, User } = require('../models');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    const accessToken = (scheme === 'Bearer' && token ? token : null) || req.cookies?.accessToken;

    if (!accessToken) {
        throw new AppError('Authentication token is required', 401);
    }

    let payload;
    try {
        payload = jwt.verify(accessToken, env.jwtSecret);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new AppError('Authentication token has expired', 401);
        }
        throw new AppError('Invalid authentication token', 401);
    }
    if (payload.type !== 'access') {
        throw new AppError('Invalid authentication token', 401);
    }

    if (payload.jti) {
        const blacklisted = await TokenBlacklist.exists({ token_id: payload.jti });
        if (blacklisted) {
            throw new AppError('Authentication token has been revoked', 401);
        }
    }

    const user = await User.findById(payload.sub).populate('employee_id');

    if (!user || !user.is_active) {
        throw new AppError('User is not authorized', 401);
    }

    req.user = user;
    req.token = accessToken;
    req.tokenPayload = payload;
    next();
});

const authorize = (...roles) => (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const allowed = roles.some((role) => userRoles.includes(role));

    if (!allowed) {
        return next(new AppError('You do not have permission to access this resource', 403));
    }

    next();
};

const authorizeSelfOrRoles = (getOwnerId, ...roles) => asyncHandler(async (req, res, next) => {
    const userRoles = req.user?.roles || [];
    if (roles.some((role) => userRoles.includes(role))) {
        return next();
    }

    const ownerId = await getOwnerId(req);
    const employeeId = req.user?.employee_id?._id || req.user?.employee_id;
    if (ownerId && employeeId && ownerId.toString() === employeeId.toString()) {
        return next();
    }

    return next(new AppError('You do not have permission to access this resource', 403));
});

module.exports = {
    authenticate,
    authorize,
    authorizeSelfOrRoles,
};
