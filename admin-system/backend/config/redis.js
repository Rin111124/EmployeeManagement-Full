/**
 * config/redis.js
 *
 * Singleton ioredis connection dùng cho BullMQ queue/worker và cache helper.
 *
 * Khi REDIS_URL không được cấu hình (môi trường dev không có Redis),
 * module này export null và mọi consumer phải gracefully degrade.
 *
 * Trong production, set REDIS_URL=redis://:password@host:6379
 */
const env = require('./env');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Tạo ioredis connection options từ URL.
 * BullMQ yêu cầu options dạng object (không phải URL string).
 */
function buildRedisOptions() {
    try {
        const url = new URL(redisUrl);
        return {
            host: url.hostname || '127.0.0.1',
            port: Number(url.port) || 6379,
            password: url.password || undefined,
            db: Number(url.pathname?.slice(1)) || 0,
            // Graceful reconnect — không crash app khi Redis unavailable
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            lazyConnect: true,
        };
    } catch {
        return {
            host: '127.0.0.1',
            port: 6379,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            lazyConnect: true,
        };
    }
}

const net = require('net');

const redisOptions = buildRedisOptions();

/**
 * Kiểm tra xem Redis server có đang lắng nghe kết nối hay không.
 * Tránh trường hợp BullMQ loop reconnect spam error khi Redis offline.
 */
function isRedisAvailable(timeoutMs = 1500) {
    return new Promise((resolve) => {
        const socket = net.createConnection({
            host: redisOptions.host,
            port: redisOptions.port,
            timeout: timeoutMs,
        });

        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.once('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.once('error', () => {
            socket.destroy();
            resolve(false);
        });
    });
}

module.exports = {
    redisOptions,
    redisUrl,
    isRedisAvailable,
};
