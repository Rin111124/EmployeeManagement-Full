const env = require('./env');

const accessCookieOptions = {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
};

const refreshCookieOptions = {
    ...accessCookieOptions,
    path: '/api/v1/auth',
};

module.exports = {
    accessCookieOptions,
    refreshCookieOptions,
};
