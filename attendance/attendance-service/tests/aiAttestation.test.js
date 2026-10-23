'use strict';

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
    createAiAttestation,
    verifyAiAttestation,
    resetReplayCache,
    hasPadEvidence,
} = require('../src/utils/aiAttestation');

const TEST_SECRET = 'test-secret-at-least-32-chars-for-attestation';

describe('Biometric AI Attestation & Anti-Spoofing', () => {
    beforeEach(() => {
        resetReplayCache();
    });

    test('valid signed attestation passes verification and binds embedding', () => {
        const dummyEmbedding = Array(512).fill(0.05);
        const result = {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            liveness: { method: 'rgb-pad-model' },
        };

        const attestation = createAiAttestation(result, TEST_SECRET);
        const payload = {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            ai_attestation: attestation,
        };

        const check = verifyAiAttestation(attestation, payload, { secret: TEST_SECRET });
        assert.equal(check.valid, true);
    });

    test('rejects attestation if embedding is tampered after signing', () => {
        const originalEmbedding = Array(512).fill(0.05);
        const tamperedEmbedding = Array(512).fill(0.09); // modified vector!

        const result = {
            embedding: originalEmbedding,
            is_live: true,
            liveness_score: 0.95,
            liveness: { method: 'rgb-pad-model' },
        };

        const attestation = createAiAttestation(result, TEST_SECRET);
        const payload = {
            embedding: tamperedEmbedding,
            is_live: true,
            liveness_score: 0.95,
            ai_attestation: attestation,
        };

        const check = verifyAiAttestation(attestation, payload, { secret: TEST_SECRET });
        assert.equal(check.valid, false);
        assert.match(check.reason, /signature mismatch/i);
    });

    test('rejects attestation if liveness score is tampered or false', () => {
        const dummyEmbedding = Array(512).fill(0.05);
        const result = {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            liveness: { method: 'rgb-pad-model' },
        };

        const attestation = createAiAttestation(result, TEST_SECRET);

        // Attempt spoof: client claims false face is live with lower score
        const payloadSpoof = {
            embedding: dummyEmbedding,
            is_live: false,
            liveness_score: 0.30,
            ai_attestation: attestation,
        };

        const checkSpoof = verifyAiAttestation(attestation, payloadSpoof, { secret: TEST_SECRET });
        assert.equal(checkSpoof.valid, false);
    });

    test('rejects replay attack with duplicate nonce', () => {
        const dummyEmbedding = Array(512).fill(0.05);
        const result = {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            liveness: { method: 'rgb-pad-model' },
        };

        const attestation = createAiAttestation(result, TEST_SECRET);
        const payload = {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            ai_attestation: attestation,
        };

        // First verification: success
        const check1 = verifyAiAttestation(attestation, payload, { secret: TEST_SECRET });
        assert.equal(check1.valid, true);

        // Second verification with identical nonce: REPLAY ATTACK!
        const check2 = verifyAiAttestation(attestation, payload, { secret: TEST_SECRET });
        assert.equal(check2.valid, false);
        assert.match(check2.reason, /replay attack/i);
    });

    test('rejects expired attestation older than 2 minutes', () => {
        const dummyEmbedding = Array(512).fill(0.05);
        const result = {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            liveness: { method: 'rgb-pad-model' },
        };

        // Expired 3 minutes ago
        const expiredTimestamp = Date.now() - 180_000;
        const attestation = createAiAttestation(result, TEST_SECRET, expiredTimestamp);
        const payload = {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            ai_attestation: attestation,
        };

        const check = verifyAiAttestation(attestation, payload, { secret: TEST_SECRET });
        assert.equal(check.valid, false);
        assert.match(check.reason, /expired/i);
    });

    test('validates device binding and rejects attestation with mismatched device', () => {
        const dummyEmbedding = Array(512).fill(0.05);
        const result = {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            liveness: { method: 'rgb-pad-model' },
        };

        const attestation = createAiAttestation(result, TEST_SECRET, Date.now(), undefined, 'kiosk-01');
        assert.equal(attestation.device_id, 'kiosk-01');

        // Valid device match
        const checkValid = verifyAiAttestation(attestation, {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            device_id: 'kiosk-01',
            ai_attestation: attestation,
        }, { secret: TEST_SECRET });
        assert.equal(checkValid.valid, true);

        // Mismatched device (Wrong device attack)
        resetReplayCache();
        const checkWrongDevice = verifyAiAttestation(attestation, {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            device_id: 'kiosk-99-attacker',
            ai_attestation: attestation,
        }, { secret: TEST_SECRET });
        assert.equal(checkWrongDevice.valid, false);
        assert.match(checkWrongDevice.reason, /device/i);
    });

    test('rejects forged signature or tampered signature hash', () => {
        const dummyEmbedding = Array(512).fill(0.05);
        const result = {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            liveness: { method: 'rgb-pad-model' },
        };

        const attestation = createAiAttestation(result, TEST_SECRET);
        // Forged signature
        attestation.signature = 'deadbeef'.repeat(8);

        const check = verifyAiAttestation(attestation, {
            embedding: dummyEmbedding,
            is_live: true,
            liveness_score: 0.95,
            ai_attestation: attestation,
        }, { secret: TEST_SECRET });

        assert.equal(check.valid, false);
        assert.match(check.reason, /signature mismatch/i);
    });

    test('hasPadEvidence rejects non-PAD or incomplete result structures', () => {
        assert.equal(hasPadEvidence(null), false);
        assert.equal(hasPadEvidence({}), false);
        assert.equal(hasPadEvidence({ liveness: { method: 'heuristic' } }), false);
        assert.equal(hasPadEvidence({
            liveness: { method: 'rgb-pad-model' },
            is_live: true,
            liveness_score: 0.9,
            embedding: Array(512).fill(0.1),
        }), true);
    });
});
