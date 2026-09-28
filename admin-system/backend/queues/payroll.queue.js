/**
 * queues/payroll.queue.js
 *
 * BullMQ Queue cho payroll generation.
 * Consumer: workers/payroll.worker.js
 *
 * Dùng để enqueue bulk payroll jobs, tránh HTTP request timeout
 * khi generate payroll cho nhiều nhân viên cùng lúc.
 */
const { Queue } = require('bullmq');
const { redisOptions, isRedisAvailable } = require('../config/redis');

let _payrollQueue = null;

async function getPayrollQueue() {
    const available = await isRedisAvailable();
    if (!available) {
        throw new Error('Redis connection is not available');
    }

    if (!_payrollQueue) {
        _payrollQueue = new Queue('payroll', {
            connection: redisOptions,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: {
                    age: 24 * 3600, // Giữ completed jobs trong 24h
                    count: 100,
                },
                removeOnFail: {
                    age: 7 * 24 * 3600, // Giữ failed jobs trong 7 ngày để debug
                },
            },
        });
    }

    return _payrollQueue;
}

module.exports = {
    getPayrollQueue,
};
