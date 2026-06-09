require('dotenv').config();

const requiredInProduction = [
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'CORS_ORIGIN',
    'SYNC_SECRET',
];

if (process.env.NODE_ENV === 'production') {
    const missing = requiredInProduction.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (process.env.CORS_ORIGIN === '*') {
        throw new Error('CORS_ORIGIN must not be "*" in production');
    }

    if (process.env.COOKIE_SECURE !== 'true') {
        throw new Error('COOKIE_SECURE must be true in production');
    }

    if ((process.env.JWT_ACCESS_SECRET || '').length < 32) {
        throw new Error('JWT_ACCESS_SECRET must be at least 32 characters in production');
    }

    if ((process.env.JWT_REFRESH_SECRET || '').length < 32) {
        throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production');
    }

    if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production');
    }
}

const env = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employee_management',
    jwtSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'development-secret-change-me',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'development-refresh-secret-change-me',
    jwtExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
    loginRateLimitWindowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    loginRateLimitMax: Number(process.env.LOGIN_RATE_LIMIT_MAX || 20),
    jsonBodyLimit: process.env.JSON_BODY_LIMIT || '2mb',
    syncSecret: process.env.SYNC_SECRET || null,
    attendanceServiceUrl: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:5001/api',
    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    aiApiKey: process.env.AI_API_KEY || '',
    chatbotProvider: process.env.CHATBOT_PROVIDER || 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-5.2',
};

module.exports = env;
