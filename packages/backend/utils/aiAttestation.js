const crypto = require('crypto');

function hasPadEvidence(result) {
    return result?.liveness?.method === 'rgb-pad-model'
        && typeof result.is_live === 'boolean'
        && typeof result.liveness_score === 'number'
        && Number.isFinite(result.liveness_score)
        && result.liveness_score >= 0
        && result.liveness_score <= 1
        && Array.isArray(result.embedding);
}

function createAiAttestation(result, secret, issuedAt = Date.now(), nonce = crypto.randomUUID()) {
    if (!hasPadEvidence(result)) {
        throw new Error('AI result does not contain valid PAD evidence');
    }
    if (!secret) throw new Error('AI_ATTESTATION_SECRET is required to sign PAD evidence');

    const claims = {
        embedding: result.embedding,
        is_live: result.is_live,
        liveness_score: result.liveness_score,
        nonce,
    };
    const bodyHash = crypto.createHash('sha256').update(JSON.stringify(claims)).digest('hex');
    const signature = crypto.createHmac('sha256', secret)
        .update(`${issuedAt}:${bodyHash}`)
        .digest('hex');
    return { issued_at: issuedAt, nonce, signature };
}

module.exports = { hasPadEvidence, createAiAttestation };
