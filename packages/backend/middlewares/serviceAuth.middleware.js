const crypto = require('crypto');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const SyncSignatureUse = require('../models/syncSignatureUse');

/**
 * serviceAuth.middleware.js
 *
 * P0-TLS-04: Xác thực yêu cầu service-to-service với HMAC timestamp.
 *
 * Cơ chế:
 *   attendance-service gửi kèm header:
 *     x-sync-timestamp: Unix timestamp (milliseconds)
 *     x-sync-signature: HMAC-SHA256(SYNC_SECRET, timestamp + ":" + body_sha256)
 *
 * Server từ chối nếu:
 *   - Secret sai (timing-safe compare)
 *   - Timestamp lệch > MAX_CLOCK_SKEW_MS (mặc định 60 giây) — chống replay
 *   - Signature không khớp (body bị giả mạo)
 *
 * Backward compat:
 *   - Nếu không có x-sync-signature, vẫn chấp nhận (legacy mode) nhưng log cảnh báo.
 *   - Trong production, đặt REQUIRE_SYNC_SIGNATURE=true để bắt buộc signature.
 */

const MAX_CLOCK_SKEW_MS = 60_000; // 60 giây
const REQUIRE_SIGNATURE = process.env.REQUIRE_SYNC_SIGNATURE === 'true';

/**
 * So sánh secret an toàn với timing-safe equal.
 */
function secretsMatch(incoming, expected) {
  if (!incoming || !expected) return false;
  const a = Buffer.from(String(incoming));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Tính HMAC-SHA256(secret, message) và trả về hex string.
 */
function computeHmac(secret, message) {
  return crypto.createHmac('sha256', String(secret)).update(String(message)).digest('hex');
}

/**
 * So sánh hai HMAC hex string an toàn.
 */
function hmacMatch(provided, expected) {
  if (!provided || !expected) return false;
  if (!/^[a-f0-9]{64}$/i.test(String(provided)) || !/^[a-f0-9]{64}$/i.test(String(expected))) return false;
  const aBuf = Buffer.from(String(provided), 'hex');
  const bBuf = Buffer.from(String(expected), 'hex');
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Middleware chính.
 *
 * Gắn vào route nhận sync từ attendance-service:
 *   router.post('/sync-from-device', verifySyncAuth, attendanceController.syncFromDevice);
 */
const verifySyncAuth = async (req, res, next) => {
  // 1. Kiểm tra SYNC_SECRET đã được cấu hình chưa
  if (!env.syncSecret) {
    return next(new AppError('Sync endpoint is not configured on this server', 503));
  }

  // 2. Require a fresh timestamp whenever signed requests are enforced.
  const timestampHeader = req.headers['x-sync-timestamp'];
  const signatureHeader = req.headers['x-sync-signature'];
  if (Boolean(timestampHeader) !== Boolean(signatureHeader)) {
    return next(new AppError('x-sync-timestamp and x-sync-signature must be supplied together', 400));
  }
  if (!timestampHeader && REQUIRE_SIGNATURE) {
    return next(new AppError('x-sync-timestamp header is required', 400));
  }
  if (timestampHeader) {
    if (!/^\d{13}$/.test(String(timestampHeader))) {
      return next(new AppError('Invalid x-sync-timestamp header', 400));
    }
    const ts = Number(timestampHeader);
    const skew = Math.abs(Date.now() - ts);
    if (skew > MAX_CLOCK_SKEW_MS) {
      return next(
        new AppError(
          `Sync request timestamp is too old or too far in the future (skew: ${skew}ms, max: ${MAX_CLOCK_SKEW_MS}ms)`,
          401
        )
      );
    }
  }

  // 3. Verify HMAC. The shared secret is never sent over the wire.
  if (signatureHeader) {
    // Body phải đã được parse (express.json đã chạy trước)
    const bodyStr =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    const message = `${timestampHeader || ''}:${bodyHash}`;
    const expectedSig = computeHmac(env.syncSecret, message);

    if (!hmacMatch(signatureHeader, expectedSig)) {
      return next(new AppError('Sync request signature mismatch', 401));
    }
    const fingerprint = crypto.createHash('sha256')
      .update(`${timestampHeader}:${String(signatureHeader).toLowerCase()}`)
      .digest('hex');
    try {
      await SyncSignatureUse.create({ fingerprint, expires_at: new Date(Date.now() + MAX_CLOCK_SKEW_MS * 2) });
    } catch (error) {
      if (error?.code === 11000) return next(new AppError('Sync request replay detected', 409));
      return next(new AppError('Sync replay protection is unavailable', 503));
    }
  } else if (REQUIRE_SIGNATURE) {
    return next(new AppError('x-sync-signature header is required', 400));
  } else {
    // Transitional legacy mode: accept the old shared-secret header only when
    // signature enforcement is explicitly disabled (development/migration).
    const incomingSecret = req.headers['x-sync-secret'];
    if (!incomingSecret || !secretsMatch(incomingSecret, env.syncSecret)) {
      return next(new AppError('Invalid legacy sync secret', 401));
    }
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[serviceAuth] WARNING: Legacy unsigned sync request accepted. ' +
          'Set REQUIRE_SYNC_SIGNATURE=true to require HMAC verification.'
      );
    }
  }

  next();
};

module.exports = { verifySyncAuth };
