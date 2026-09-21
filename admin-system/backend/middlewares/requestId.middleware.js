/**
 * middlewares/requestId.middleware.js
 *
 * Gắn một unique requestId vào mỗi request để trace end-to-end trong logs.
 *
 * - Ưu tiên dùng header X-Request-Id từ client/load balancer nếu có
 * - Ngược lại tự sinh UUID v4-style bằng crypto.randomUUID()
 * - Gắn vào req.requestId và response header X-Request-Id
 *
 * Usage trong logger:
 *   logger.info('...', { requestId: req.requestId })
 */
const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
}

module.exports = { requestIdMiddleware };
