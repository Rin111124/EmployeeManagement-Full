const env = require('../config/env');

function log(level, message, meta) {
    const payload = {
        level,
        message,
        timestamp: new Date().toISOString(),
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
    error(message, meta) {
        log('error', message, meta);
    },
    info(message, meta) {
        log('info', message, meta);
    },
    warn(message, meta) {
        log('warn', message, meta);
    },
    debug(message, meta) {
        log('debug', message, meta);
    },
};
