/**
 * config/sentry.js
 *
 * Khởi tạo Sentry SDK cho Node.js backend.
 * Phải được import TRƯỚC tất cả các module khác (đặc biệt là trước express, mongoose)
 * để Sentry có thể instrument đúng cách.
 *
 * Graceful: nếu SENTRY_DSN không được cấu hình, module này là no-op.
 *
 * Setup:
 *   1. Tạo tài khoản tại https://sentry.io (free tier: 5k errors/month)
 *   2. Tạo project Node.js → copy DSN
 *   3. Set SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/YYY trong .env
 */

const env = require('./env');

let Sentry = null;
let initialized = false;

function init() {
    if (initialized) return;
    initialized = true;

    if (!process.env.SENTRY_DSN) {
        // Silent skip — không spam log khi dev chưa cần Sentry
        return;
    }

    try {
        Sentry = require('@sentry/node');
        const { nodeProfilingIntegration } = require('@sentry/profiling-node');

        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: env.nodeEnv,

            // Tracing: 10% sample rate trong production để giảm quota,
            // 100% trong development/staging để debug dễ hơn
            tracesSampleRate: env.nodeEnv === 'production' ? 0.1 : 1.0,

            // CPU profiling: chỉ bật trong production để thấy bottleneck
            profilesSampleRate: env.nodeEnv === 'production' ? 0.1 : 0,

            integrations: [
                nodeProfilingIntegration(),
            ],

            // Không gửi data trong test environment
            enabled: env.nodeEnv !== 'test',

            // Lọc bỏ các errors không cần alert
            beforeSend(event) {
                // Bỏ qua các lỗi 4xx — đây là lỗi client, không phải server
                const status = event?.extra?.statusCode || event?.tags?.statusCode;
                if (status && status >= 400 && status < 500) return null;
                return event;
            },
        });
    } catch (err) {
        // Nếu @sentry/node chưa cài hoặc có lỗi, không crash
        const logger = require('./env'); // tránh circular
        console.warn('[Sentry] Failed to initialize:', err.message);
    }
}

/**
 * Express request handler middleware — phải đặt TRƯỚC các route handlers.
 * No-op nếu Sentry chưa khởi tạo.
 */
function requestHandler() {
    if (!Sentry) return (req, res, next) => next();
    return Sentry.Handlers.requestHandler();
}

/**
 * Express error handler middleware — phải đặt TRƯỚC errorHandler của app.
 * Capture exception rồi gọi next(err) để errorHandler tự xử lý response.
 * No-op nếu Sentry chưa khởi tạo.
 */
function errorHandler() {
    if (!Sentry) return (err, req, res, next) => next(err);
    return Sentry.Handlers.errorHandler({
        // Chỉ capture lỗi 5xx — 4xx là client error
        shouldHandleError(error) {
            const status = error.statusCode || error.status || 500;
            return status >= 500;
        },
    });
}

/**
 * Capture một exception thủ công (dùng trong catch blocks quan trọng).
 */
function captureException(err, context = {}) {
    if (!Sentry) return;
    Sentry.withScope((scope) => {
        Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
        Sentry.captureException(err);
    });
}

/**
 * Gắn user context vào Sentry scope (dùng sau khi authenticate).
 */
function setUser(user) {
    if (!Sentry || !user) return;
    Sentry.setUser({ id: user._id?.toString(), username: user.username });
}

module.exports = {
    init,
    requestHandler,
    errorHandler,
    captureException,
    setUser,
};
