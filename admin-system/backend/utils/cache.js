/**
 * utils/cache.js
 *
 * Redis cache helper với graceful degradation:
 * - Nếu Redis không có sẵn, bỏ qua cache và gọi fetchFn trực tiếp
 * - Không bao giờ throw error do cache — chỉ log warning
 *
 * Usage:
 *   const data = await getOrSet('dashboard:metrics', 300, () => fetchMetrics());
 *   await invalidate('dashboard:*');
 */
const { redisOptions } = require('../config/redis');
const logger = require('./logger');

let _redis = null;
let _connectionAttempted = false;

/**
 * Lazy-initialize ioredis connection.
 * Returns null nếu Redis không available.
 */
async function getRedis() {
    if (_redis) return _redis;
    if (_connectionAttempted) return null;

    _connectionAttempted = true;

    try {
        const { default: Redis } = await import('ioredis');
        const client = new Redis(redisOptions);

        // Test connection
        await client.connect();
        await client.ping();

        _redis = client;

        client.on('error', (err) => {
            logger.warn('Redis connection error', { error: err.message });
        });

        client.on('close', () => {
            _redis = null;
            _connectionAttempted = false;
            logger.warn('Redis connection closed — cache disabled until reconnect');
        });

        logger.info('Redis cache connected');
        return _redis;
    } catch (err) {
        logger.warn('Redis unavailable — running without cache', { error: err.message });
        return null;
    }
}

/**
 * Get-or-set: trả về cached value nếu có, ngược lại gọi fetchFn và cache kết quả.
 *
 * @param {string} key - Cache key
 * @param {number} ttlSeconds - TTL (seconds)
 * @param {Function} fetchFn - async function trả về data cần cache
 * @returns {Promise<any>} - data (from cache or fresh)
 */
async function getOrSet(key, ttlSeconds, fetchFn) {
    const redis = await getRedis();

    if (redis) {
        try {
            const cached = await redis.get(key);
            if (cached !== null) {
                return JSON.parse(cached);
            }
        } catch (err) {
            logger.warn('Cache read error', { key, error: err.message });
        }
    }

    // Cache miss hoặc Redis unavailable — fetch fresh data
    const data = await fetchFn();

    if (redis && data !== undefined) {
        try {
            await redis.setex(key, ttlSeconds, JSON.stringify(data));
        } catch (err) {
            logger.warn('Cache write error', { key, error: err.message });
        }
    }

    return data;
}

/**
 * Xóa cache theo pattern (hỗ trợ wildcard: '*').
 *
 * @param {string} pattern - Redis key pattern (e.g. 'dashboard:*')
 */
async function invalidate(pattern) {
    const redis = await getRedis();
    if (!redis) return;

    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
            logger.info('Cache invalidated', { pattern, count: keys.length });
        }
    } catch (err) {
        logger.warn('Cache invalidate error', { pattern, error: err.message });
    }
}

/**
 * Xóa một key cụ thể.
 *
 * @param {string} key
 */
async function del(key) {
    const redis = await getRedis();
    if (!redis) return;

    try {
        await redis.del(key);
    } catch (err) {
        logger.warn('Cache del error', { key, error: err.message });
    }
}

module.exports = { getOrSet, invalidate, del };
