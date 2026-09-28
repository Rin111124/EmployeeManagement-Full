const crypto = require('crypto');

function hashDeviceToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function generateDeviceToken() {
    return crypto.randomBytes(32).toString('hex');
}

function generateChallenge() {
    return crypto.randomBytes(32).toString('hex');
}

function computeProof(secret, challenge) {
    return crypto.createHmac('sha256', String(secret)).update(String(challenge)).digest('hex');
}

function verifyProof(providedProof, expectedProof) {
    if (!providedProof || !expectedProof) return false;
    const bufProvided = Buffer.from(String(providedProof), 'hex');
    const bufExpected = Buffer.from(String(expectedProof), 'hex');
    if (bufProvided.length !== bufExpected.length) return false;
    return crypto.timingSafeEqual(bufProvided, bufExpected);
}

module.exports = {
    generateDeviceToken,
    hashDeviceToken,
    generateChallenge,
    computeProof,
    verifyProof,
};
