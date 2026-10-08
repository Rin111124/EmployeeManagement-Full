const env = require('./env');

function isDevOrLocalOrigin(origin) {
    if (!origin) return true;
    if (process.env.NODE_ENV === 'production') return false;
    try {
        const url = new URL(origin);
        const host = url.hostname;
        // Allow localhost, 127.0.0.1, 10.x.x.x, 192.168.x.x, 172.16-31.x.x during development
        if (host === 'localhost' || host === '127.0.0.1') return true;
        if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
        if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
        if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    } catch (_e) {
        return false;
    }
    return false;
}

function parseAllowedOrigins(value) {
    if (value === '*') return '*';
    return String(value || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins(env.corsOrigin);

function isAllowedOrigin(origin) {
    if (!origin || allowedOrigins === '*') return true;
    if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) return true;
    if (isDevOrLocalOrigin(origin)) return true;
    return false;
}

const corsOptions = {
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
};

module.exports = {
    allowedOrigins,
    corsOptions,
    parseAllowedOrigins,
    isAllowedOrigin,
    isDevOrLocalOrigin,
};
