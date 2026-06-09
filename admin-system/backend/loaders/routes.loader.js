const healthRoutes = require('../routes/health.routes');
const apiRoutes = require('../routes');
const legacyRoutes = require('../routes/legacy.routes');
const { notFound, errorHandler } = require('../middlewares/error.middleware');
const { apiLimiter } = require('../middlewares/rateLimit.middleware');

function registerRoutes(app) {
    app.use('/health', healthRoutes);

    // Tất cả API routes đều nằm dưới /api/v1 để hỗ trợ versioning đúng cách.
    // Không dùng alias /api vì sẽ mất kiểm soát khi nâng cấp lên v2.
    app.use('/api/v1', apiLimiter, apiRoutes);
    app.use('/', legacyRoutes);
    app.use(notFound);
    app.use(errorHandler);
}

module.exports = registerRoutes;
