/**
 * Face Matching Utilities
 * Handle embedding similarity calculations and face matching logic
 */

/**
 * Calculate cosine similarity between two embeddings
 * @param {number[]} a - First embedding (512-dim)
 * @param {number[]} b - Second embedding (512-dim)
 * @returns {number} Similarity score (0-1)
 * @throws {Error} If embeddings are not 512-dimensional
 */
function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
        throw new Error('Embeddings must be arrays');
    }

    if (a.length !== 512 || b.length !== 512) {
        throw new Error(`Embeddings must be 512-dimensional, got ${a.length} and ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < 512; i++) {
        const aVal = Number(a[i]);
        const bVal = Number(b[i]);

        if (!Number.isFinite(aVal) || !Number.isFinite(bVal)) {
            throw new Error(`Invalid embedding values at index ${i}`);
        }

        dotProduct += aVal * bVal;
        normA += aVal * aVal;
        normB += bVal * bVal;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
        throw new Error('Zero vector(s) in embedding');
    }

    return dotProduct / denominator;
}

/**
 * Validate embedding format and quality
 * @param {any} embedding - The embedding to validate
 * @returns {boolean} True if valid
 * @throws {Error} If invalid
 */
function validateEmbedding(embedding) {
    if (!Array.isArray(embedding)) {
        throw new Error('Embedding must be an array');
    }

    if (embedding.length !== 512) {
        throw new Error(`Embedding must be 512-dimensional, got ${embedding.length}`);
    }

    // Check all values are numbers in valid range
    for (let i = 0; i < 512; i++) {
        const val = embedding[i];
        if (!Number.isFinite(val)) {
            throw new Error(`Invalid embedding value at index ${i}: ${val}`);
        }

        // InsightFace embeddings should be in range [-2, 2]
        if (val < -2 || val > 2) {
            console.warn(
                `[Embedding] Value at index ${i} out of typical range: ${val}`
            );
        }
    }

    // Check not all zeros
    if (embedding.every((v) => v === 0)) {
        throw new Error('Embedding is all zeros (empty/invalid)');
    }

    return true;
}

module.exports = {
    cosineSimilarity,
    validateEmbedding,
    /** Minimum cosine similarity to consider two embeddings a match (InsightFace buffalo_l). */
    CONFIDENCE_THRESHOLD: 0.45,
};

