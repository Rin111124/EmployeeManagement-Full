/**
 * routes/metrics.routes.js
 *
 * Prometheus metrics endpoint.
 * Exposes default Node.js process metrics + custom HTTP request duration histogram.
 *
 * Usage (Prometheus scrape config):
 *   - job_name: backend
 *     static_configs:
 *       - targets: ['<host>:5000']
 *     metrics_path: /metrics
 *
 * Security note: This endpoint is public by default, intended for internal
 * network scraping only. If the server is exposed to the internet, add an
 * IP allowlist middleware before this route in routes.loader.js.
 *
 * Metrics included:
 *   - nodejs_* (event loop lag, GC duration, heap usage, etc.) — from prom-client defaults
 *   - process_* (CPU, memory, open file descriptors)
 *   - http_request_duration_ms (histogram) — custom, added via metricsMiddleware()
 */

const { Router } = require('express');

const router = Router();

let register = null;
let httpRequestDuration = null;

try {
    const client = require('prom-client');

    // Shared registry — reused by metricsMiddleware() below
    register = new client.Registry();

    // Collect default Node.js / process metrics every 10 seconds
    client.collectDefaultMetrics({
        register,
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // Custom histogram: HTTP request duration
    httpRequestDuration = new client.Histogram({
        name: 'http_request_duration_ms',
        help: 'Duration of HTTP requests in milliseconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
        registers: [register],
    });
} catch (err) {
    // prom-client not installed — endpoint will return 503
    console.warn('[Metrics] prom-client not available:', err.message);
}

/**
 * Express middleware to record HTTP request duration.
 * Mount this in express.loader.js AFTER requestIdMiddleware.
 *
 * Example:
 *   const { metricsMiddleware } = require('../routes/metrics.routes');
 *   app.use(metricsMiddleware());
 */
function metricsMiddleware() {
    if (!httpRequestDuration) return (_req, _res, next) => next();

    return (req, res, next) => {
        const start = Date.now();

        res.on('finish', () => {
            // Use req.route?.path for parameterised routes (/employees/:id → /employees/:id)
            // Fall back to req.path to avoid high cardinality from dynamic IDs
            const route = req.route?.path || req.path || 'unknown';
            httpRequestDuration.observe(
                {
                    method: req.method,
                    route,
                    status_code: res.statusCode,
                },
                Date.now() - start,
            );
        });

        next();
    };
}

// GET /metrics — Prometheus text format
router.get('/', async (_req, res) => {
    if (!register) {
        return res.status(503).send('# Metrics unavailable: prom-client not installed\n');
    }
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).send(`# Error collecting metrics: ${err.message}\n`);
    }
});

module.exports = router;
module.exports.metricsMiddleware = metricsMiddleware;
