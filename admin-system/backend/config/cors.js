const env = require('./env');

function parseAllowedOrigins(value) {
    if (value === '*') return '*';
    return value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins(env.corsOrigin);

const corsOptions = {
    origin(origin, callback) {
        if (allowedOrigins === '*' || !origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
};

module.exports = {
    allowedOrigins,
    corsOptions,
    parseAllowedOrigins,
};
