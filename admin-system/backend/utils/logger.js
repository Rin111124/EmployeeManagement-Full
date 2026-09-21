const env = require('../config/env');

/**
 * Core log function.
 *
 * @param {string} level   - 'info' | 'warn' | 'error' | 'debug'
 * @param {string} message - Human-readable message
 * @param {object} [meta]  - Structured metadata
 * @param {string} [requestId] - Optional request ID for end-to-end tracing (req.requestId)
 */
function log(level, message, meta, requestId) {
    const payload = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...(requestId ? { requestId } : {}),
        ...(meta ? { meta } : {}),
    };

    if (env.nodeEnv === 'test') {
        return;
    }

    // Debug logs tắt trong production
    if (level === 'debug' && env.nodeEnv === 'production') {
        return;
    }

    const line = JSON.stringify(payload);
    if (level === 'error') {
        console.error(line);
        return;
    }
    console.log(line);
}

module.exports = {
    error(message, meta, requestId) {
        log('error', message, meta, requestId);
    },
    info(message, meta, requestId) {
        log('info', message, meta, requestId);
    },
    warn(message, meta, requestId) {
        log('warn', message, meta, requestId);
    },
    debug(message, meta, requestId) {
        log('debug', message, meta, requestId);
    },
};

