const crypto = require('crypto');

function secretsMatch(incomingSecret, expectedSecret) {
    const incoming = Buffer.from(String(incomingSecret || ''));
    const expected = Buffer.from(String(expectedSecret || ''));
    return incoming.length === expected.length && crypto.timingSafeEqual(incoming, expected);
}

function verifySyncSecret(req, res, next) {
    const expectedSecret = process.env.SYNC_SECRET;

    if (!expectedSecret) {
        return res.status(503).json({
            success: false,
            message: 'SYNC_SECRET is not configured',
        });
    }

    const incomingSecret = req.headers['x-sync-secret'];
    if (!incomingSecret || !secretsMatch(incomingSecret, expectedSecret)) {
        return res.status(401).json({
            success: false,
            message: 'Invalid sync secret',
        });
    }

    return next();
}

module.exports = {
    verifySyncSecret,
};
