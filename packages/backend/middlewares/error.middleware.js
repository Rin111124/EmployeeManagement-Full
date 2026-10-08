const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const env = require('../config/env');

function notFound(req, res, next) {
    next(new AppError(`Route ${req.originalUrl} not found`, 404));
}

function errorHandler(err, req, res, next) {
    let error = err;

    // Handle payload too large errors from body parsers
    if (err && (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413)) {
        error = new AppError('Payload too large. The uploaded file exceeds the server limit.', 413);
    }

    if (err instanceof mongoose.Error.CastError) {
        error = new AppError('Invalid resource id', 400);
    }

    if (err instanceof mongoose.Error.ValidationError) {
        error = new AppError('Validation error', 400, err.errors);
    }

    if (err.code === 11000) {
        error = new AppError('Duplicate value', 409, err.keyValue);
    }

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error',
        details: error.details || undefined,
        stack: env.nodeEnv === 'development' ? err.stack : undefined,
    });
}

module.exports = {
    notFound,
    errorHandler,
};
