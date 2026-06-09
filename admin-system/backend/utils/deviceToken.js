const crypto = require('crypto');

function hashDeviceToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function generateDeviceToken() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = {
    generateDeviceToken,
    hashDeviceToken,
};
