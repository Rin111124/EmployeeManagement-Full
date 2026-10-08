const test = require('node:test');
const assert = require('node:assert/strict');
const { hasPadEvidence, createAiAttestation } = require('../utils/aiAttestation');

test('quality-only development output is not valid PAD evidence and cannot be signed', () => {
    const result = {
        embedding: Array(512).fill(0.01),
        is_live: true,
        liveness_score: 0.75,
        liveness: { method: 'quality-only-development' },
    };

    assert.equal(hasPadEvidence(result), false);
    assert.throws(() => createAiAttestation(result, 'test-secret'), /valid PAD evidence/);
});

test('PAD evidence requires a valid score, boolean result, and embedding before signing', () => {
    const result = {
        embedding: Array(512).fill(0.01),
        is_live: true,
        liveness_score: 0.91,
        liveness: { method: 'rgb-pad-model' },
    };

    assert.equal(hasPadEvidence(result), true);
    const attestation = createAiAttestation(result, 'test-secret', 123456, '0123456789abcdef');
    assert.equal(attestation.issued_at, 123456);
    assert.equal(attestation.nonce, '0123456789abcdef');
    assert.match(attestation.signature, /^[a-f0-9]{64}$/);
    assert.equal(hasPadEvidence({ ...result, liveness_score: 1.5 }), false);
    assert.equal(hasPadEvidence({ ...result, is_live: 1 }), false);
    assert.equal(hasPadEvidence({ ...result, embedding: null }), false);
});
