require('dotenv').config();

const checks = [];

function addCheck(name, passed, message, strict = false) {
    checks.push({ name, passed, message, strict });
}

function hasStrongSecret(value) {
    if (!value || value.length < 32) return false;
    const weakValues = [
        'replace-with-a-long-random-secret-at-least-32-chars',
        'replace-with-a-long-random-access-secret',
        'replace-with-a-long-random-refresh-secret',
        'development-secret-change-me',
        'development-refresh-secret-change-me',
        'test-secret',
    ];
    return !weakValues.includes(value);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const strictMode = nodeEnv === 'production' || process.env.SECURITY_ENV_STRICT === 'true';
const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const corsOrigin = process.env.CORS_ORIGIN || '*';

addCheck(
    'JWT access secret strength',
    hasStrongSecret(accessSecret),
    'Set JWT_ACCESS_SECRET or JWT_SECRET to a random value with at least 32 characters.',
    strictMode,
);

addCheck(
    'JWT refresh secret strength',
    hasStrongSecret(refreshSecret),
    'Set JWT_REFRESH_SECRET to a random value with at least 32 characters.',
    strictMode,
);

addCheck(
    'Separate access and refresh secrets',
    Boolean(accessSecret && refreshSecret && accessSecret !== refreshSecret),
    'Use different values for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.',
    strictMode,
);

addCheck(
    'CORS origin is restricted',
    corsOrigin !== '*',
    'Set CORS_ORIGIN to the frontend domain, for example http://localhost:3000.',
    strictMode,
);

if (nodeEnv === 'production') {
    addCheck(
        'Production cookie secure flag',
        process.env.COOKIE_SECURE === 'true',
        'Set COOKIE_SECURE=true in production.',
        true,
    );

    addCheck(
        'Production cookie sameSite',
        ['lax', 'strict', 'none'].includes(String(process.env.COOKIE_SAME_SITE || '').toLowerCase()),
        'Set COOKIE_SAME_SITE to lax, strict, or none.',
        true,
    );

    addCheck(
        'Production MongoDB URI',
        Boolean(process.env.MONGODB_URI),
        'Set MONGODB_URI explicitly in production.',
        true,
    );
}

let failed = 0;
let warned = 0;
console.log('Security environment check');
checks.forEach((check) => {
    const mark = check.passed ? 'PASS' : check.strict ? 'FAIL' : 'WARN';
    console.log(`[${mark}] ${check.name}`);
    if (!check.passed) {
        if (check.strict) {
            failed += 1;
        } else {
            warned += 1;
        }
        console.log(`       ${check.message}`);
    }
});

if (failed > 0) {
    console.error(`Security environment check failed: ${failed} issue(s).`);
    process.exit(1);
}

if (warned > 0) {
    console.warn(`Security environment check completed with ${warned} warning(s). Set SECURITY_ENV_STRICT=true to fail on warnings.`);
} else {
    console.log('Security environment check passed.');
}
