const crypto = require('crypto');

function hashDeviceToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = {
    hashDeviceToken,
};
