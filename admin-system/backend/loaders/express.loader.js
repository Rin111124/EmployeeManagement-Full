const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { corsOptions } = require('../config/cors');
const securityConfig = require('../config/security');
const { requestSanitizer } = require('../middlewares/sanitize.middleware');
const { csrfOriginGuard } = require('../middlewares/csrf.middleware');

function registerExpressMiddleware(app) {
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
}

module.exports = registerExpressMiddleware;
