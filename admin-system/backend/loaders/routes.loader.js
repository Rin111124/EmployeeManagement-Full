const healthRoutes = require('../routes/health.routes');
const metricsRoutes = require('../routes/metrics.routes');
const apiRoutes = require('../routes');
const legacyRoutes = require('../routes/legacy.routes');
const { notFound, errorHandler } = require('../middlewares/error.middleware');
const { apiLimiter } = require('../middlewares/rateLimit.middleware');
const sentry = require('../config/sentry');

function registerRoutes(app) {
    // Liveness + readiness probes (no auth, no rate limit)
    app.use('/health', healthRoutes);

    // Prometheus metrics scrape endpoint (no auth, internal network only)
    // Security note: add IP allowlist middleware here if server is internet-facing
    app.use('/metrics', metricsRoutes);

    // Tất cả API routes đều nằm dưới /api/v1 để hỗ trợ versioning đúng cách.
    // Không dùng alias /api vì sẽ mất kiểm soát khi nâng cấp lên v2.
    app.use('/api/v1', apiLimiter, apiRoutes);
    app.use('/', legacyRoutes);
    app.use(notFound);

    // Sentry error handler MUST come before app's errorHandler so Sentry
    // captures the original exception before it's transformed/swallowed.
    // No-op when SENTRY_DSN is not set.
    app.use(sentry.errorHandler());

    app.use(errorHandler);
}

module.exports = registerRoutes;
