const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../.env'),
});

function parseAllowedOrigins(value) {
    if (!value || value === '*') return '*';
    return value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

const requiredInProduction = ['MONGODB_URI', 'ADMIN_URL', 'SYNC_SECRET', 'CORS_ORIGIN'];

if (process.env.NODE_ENV !== 'test' && !process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required for attendance-service. Refusing to use a fallback database.');
}

if (process.env.NODE_ENV === 'production') {
    const missing = requiredInProduction.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (process.env.CORS_ORIGIN === '*') {
        throw new Error('CORS_ORIGIN must not be "*" in production');
    }

    if ((process.env.SYNC_SECRET || '').length < 32) {
        throw new Error('SYNC_SECRET must be at least 32 characters in production');
    }
}

module.exports = {
    port: process.env.PORT || 5001,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI,
    adminUrl: process.env.ADMIN_URL || 'http://localhost:5000/api/v1',
    syncSecret: process.env.SYNC_SECRET || null,
    allowedOrigins: parseAllowedOrigins(process.env.CORS_ORIGIN || '*'),
    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    aiApiKey: process.env.AI_API_KEY || '',
};
