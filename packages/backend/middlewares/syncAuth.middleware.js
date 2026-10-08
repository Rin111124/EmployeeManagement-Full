const crypto = require('crypto');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function secretsMatch(incomingSecret, expectedSecret) {
  const incoming = Buffer.from(String(incomingSecret || ''));
  const expected = Buffer.from(String(expectedSecret || ''));
  return incoming.length === expected.length && crypto.timingSafeEqual(incoming, expected);
}

/**
 * Middleware xác thực shared sync secret.
 * Dùng cho endpoint /attendance/sync-from-device — chỉ attendance-service mới có secret.
 */
const verifySyncSecret = (req, res, next) => {
  if (!env.syncSecret) {
    // Nếu chưa cấu hình secret, từ chối request để tránh endpoint mở không bảo vệ
    return next(new AppError('Sync endpoint is not configured on this server', 503));
  }

  const secret = req.headers['x-sync-secret'];
  if (!secret || !secretsMatch(secret, env.syncSecret)) {
    return next(new AppError('Invalid sync secret', 401));
  }

  next();
};

module.exports = { verifySyncSecret };
