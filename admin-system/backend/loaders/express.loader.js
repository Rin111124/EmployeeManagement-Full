const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { corsOptions } = require('../config/cors');
const securityConfig = require('../config/security');
const { requestSanitizer } = require('../middlewares/sanitize.middleware');
const { csrfOriginGuard } = require('../middlewares/csrf.middleware');
const { requestIdMiddleware } = require('../middlewares/requestId.middleware');
const sentry = require('../config/sentry');
const { metricsMiddleware } = require('../routes/metrics.routes');

function registerExpressMiddleware(app) {
    // Sentry request handler must be first — captures request context for error reporting.
    // No-op when SENTRY_DSN is not set.
    app.use(sentry.requestHandler());

    // Request ID must be second — every subsequent middleware/log can access req.requestId
    app.use(requestIdMiddleware);
    app.use(helmet({
        // Contract HTML preview has a route-specific CSP/frame policy in
        // contract.controller.js. Keep the default Helmet protections elsewhere.
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.use(cors(corsOptions));
    app.use(cookieParser());
    app.use(csrfOriginGuard);
    app.use(express.json({ limit: securityConfig.jsonBodyLimit }));
    app.use(express.urlencoded({
        limit: securityConfig.jsonBodyLimit,
        extended: securityConfig.urlEncoded.extended,
    }));
    app.use(requestSanitizer);

    // Record HTTP request duration for Prometheus metrics
    app.use(metricsMiddleware());
}

module.exports = registerExpressMiddleware;
