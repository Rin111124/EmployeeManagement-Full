/**
 * Lightweight in-memory Circuit Breaker pattern implementation.
 * States:
 *   - CLOSED: Normal operation. Requests pass through to protected action.
 *   - OPEN: Threshold of consecutive failures exceeded. Fail fast without executing action.
 *   - HALF_OPEN: Trial period after resetTimeoutMs to test if the remote service has recovered.
 */
class CircuitBreaker {
    constructor(options = {}) {
        this.name = options.name || 'default';
        this.failureThreshold = options.failureThreshold || 3;
        this.resetTimeoutMs = options.resetTimeoutMs || 30000;
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = null;
    }

    async fire(action, fallback) {
        if (this.state === 'OPEN') {
            const now = Date.now();
            if (now - this.lastFailureTime > this.resetTimeoutMs) {
                this.state = 'HALF_OPEN';
                console.log(`[CircuitBreaker:${this.name}] Testing recovery (HALF_OPEN)...`);
            } else {
                if (typeof fallback === 'function') {
                    return fallback(new Error(`CircuitBreaker is OPEN for ${this.name}`));
                }
                throw new Error(`CircuitBreaker is OPEN for ${this.name}`);
            }
        }

        try {
            const result = await action();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            if (typeof fallback === 'function') {
                return fallback(error);
            }
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            console.log(`[CircuitBreaker:${this.name}] Service recovered! State -> CLOSED`);
            this.state = 'CLOSED';
        }
    }

    onFailure(error) {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        console.warn(`[CircuitBreaker:${this.name}] Failure #${this.failureCount}: ${error?.message || error}`);

        if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            console.error(`[CircuitBreaker:${this.name}] Threshold reached. State -> OPEN (fail-fast active for ${this.resetTimeoutMs / 1000}s)`);
        }
    }

    getState() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
        };
    }
}

module.exports = CircuitBreaker;
