'use strict';

const crypto = require('crypto');
const env = require('../config/env');

const MAX_ATTESTATION_AGE_MS = 120_000; // 2 phút
const CLOCK_SKEW_TOLERANCE_MS = 30_000; // 30 giây

// In-memory replay cache with automatic TTL cleanup
const usedNonces = new Map(); // nonce -> timestamp

function cleanExpiredNonces() {
    const now = Date.now();
    for (const [nonce, timestamp] of usedNonces.entries()) {
        if (now - timestamp > MAX_ATTESTATION_AGE_MS + CLOCK_SKEW_TOLERANCE_MS) {
            usedNonces.delete(nonce);
        }
    }
}

/**
 * Check if the payload contains valid PAD evidence structure
 */
function hasPadEvidence(result) {
    return (
        result?.liveness?.method === 'rgb-pad-model' &&
        typeof result.is_live === 'boolean' &&
        typeof result.liveness_score === 'number' &&
        Number.isFinite(result.liveness_score) &&
        result.liveness_score >= 0 &&
        result.liveness_score <= 1 &&
        Array.isArray(result.embedding)
    );
}

/**
 * Create HMAC-SHA256 signed AI biometric attestation token
 */
function createAiAttestation(result, secret, issuedAt = Date.now(), nonce = crypto.randomUUID(), deviceId = null) {
    if (!hasPadEvidence(result)) {
        throw new Error('AI result does not contain valid PAD evidence');
    }
    if (!secret) {
        throw new Error('AI_ATTESTATION_SECRET is required to sign PAD evidence');
    }

    const claims = {
        embedding: result.embedding,
        is_live: result.is_live,
        liveness_score: result.liveness_score,
        ...(deviceId ? { device_id: String(deviceId) } : {}),
        nonce,
    };
    const bodyHash = crypto.createHash('sha256').update(JSON.stringify(claims)).digest('hex');
    const signature = crypto.createHmac('sha256', secret)
        .update(`${issuedAt}:${bodyHash}`)
        .digest('hex');

    return {
        issued_at: issuedAt,
        nonce,
        signature,
        ...(deviceId ? { device_id: String(deviceId) } : {}),
    };
}

/**
 * Verify cryptographic attestation for biometric PAD / liveness evidence.
 *
 * ISO/IEC 30107 & Giai đoạn 1 checks:
 * 1. Attestation signature matches HMAC-SHA256(secret, issued_at:bodyHash)
 * 2. Time validity: within 2 minutes of issuance, not from the future
 * 3. Nonce uniqueness: prevents replay attacks
 * 4. Embedding binding: verified against the exact vector submitted
 * 5. Score threshold: liveness_score >= 0.70 and is_live === true
 */
function verifyAiAttestation(attestation, payload, options = {}) {
    if (!attestation || typeof attestation !== 'object') {
        return { valid: false, reason: 'Missing or invalid ai_attestation object' };
    }

    const { issued_at, nonce, signature } = attestation;
    if (!issued_at || !nonce || !signature) {
        return { valid: false, reason: 'Attestation missing required fields (issued_at, nonce, signature)' };
    }

    const secret = options.secret || env.aiAttestationSecret || process.env.AI_ATTESTATION_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            return { valid: false, reason: 'AI_ATTESTATION_SECRET is not configured on Attendance Service' };
        }
        // Dev warning fallback
        return { valid: true, warning: 'Skipped signature check in dev: AI_ATTESTATION_SECRET not configured' };
    }

    const now = Date.now();
    const issuedAtNum = Number(issued_at);
    if (!Number.isFinite(issuedAtNum)) {
        return { valid: false, reason: 'Invalid issued_at timestamp in attestation' };
    }

    // Check expiration
    if (now - issuedAtNum > MAX_ATTESTATION_AGE_MS) {
        return {
            valid: false,
            reason: `Attestation expired (age: ${Math.round((now - issuedAtNum) / 1000)}s > ${MAX_ATTESTATION_AGE_MS / 1000}s)`
        };
    }

    // Check future skew
    if (issuedAtNum - now > CLOCK_SKEW_TOLERANCE_MS) {
        return { valid: false, reason: 'Attestation timestamp is in the future' };
    }

    // Check replay attack
    cleanExpiredNonces();
    if (usedNonces.has(nonce)) {
        return { valid: false, reason: 'Attestation nonce has already been used (replay attack detected)' };
    }

    const embedding = payload.embedding;
    if (!Array.isArray(embedding)) {
        return { valid: false, reason: 'Missing embedding to bind attestation claims' };
    }

    const isLive = typeof payload.is_live === 'boolean'
        ? payload.is_live
        : attestation.claims?.is_live;

    const livenessScore = typeof payload.liveness_score === 'number'
        ? payload.liveness_score
        : attestation.claims?.liveness_score;

    if (isLive !== true) {
        return { valid: false, reason: 'Attestation indicates presentation attack (is_live is not true)' };
    }

    const MIN_LIVENESS_SCORE = 0.70;
    if (typeof livenessScore === 'number' && livenessScore < MIN_LIVENESS_SCORE) {
        return { valid: false, reason: `Attestation liveness score (${livenessScore}) below threshold (${MIN_LIVENESS_SCORE})` };
    }

    if (attestation.device_id && payload.device_id) {
        if (String(attestation.device_id) !== String(payload.device_id)) {
            return { valid: false, reason: 'Device binding mismatch in attestation (wrong device)' };
        }
    }

    const claims = {
        embedding,
        is_live: isLive,
        liveness_score: livenessScore,
        ...(attestation.device_id ? { device_id: String(attestation.device_id) } : {}),
        nonce,
    };

    const bodyHash = crypto.createHash('sha256').update(JSON.stringify(claims)).digest('hex');
    const expectedSignature = crypto.createHmac('sha256', secret)
        .update(`${issued_at}:${bodyHash}`)
        .digest('hex');

    let signaturesMatch = false;
    try {
        signaturesMatch = crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch (_err) {
        signaturesMatch = false;
    }

    if (!signaturesMatch) {
        return { valid: false, reason: 'Attestation signature mismatch (tampering detected)' };
    }

    // Mark nonce as used to prevent replay
    usedNonces.set(nonce, now);

    return { valid: true };
}

function resetReplayCache() {
    usedNonces.clear();
}

module.exports = {
    hasPadEvidence,
    createAiAttestation,
    verifyAiAttestation,
    resetReplayCache,
    MAX_ATTESTATION_AGE_MS,
};
