const crypto = require('crypto');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function addDuration(date, duration) {
    const match = String(duration).match(/^(\d+)(ms|s|m|h|d)$/);
    if (!match) {
        return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return new Date(date.getTime() + amount * multipliers[unit]);
}

module.exports = {
    addDuration,
    hashToken,
};
