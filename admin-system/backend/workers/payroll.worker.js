/**
 * workers/payroll.worker.js
 *
 * BullMQ Worker xử lý bulk payroll generation jobs.
 *
 * Job data format:
 * {
 *   employeeIds: string[],   // danh sách employee._id cần tính lương
 *   month: number,           // 1–12
 *   year: number,
 *   finalize?: boolean,
 *   deduction?: number,
 *   actorId: string          // userId của người tạo job
 * }
 *
 * Progress: 0–100 (percent hoàn thành)
 * Return value: { succeeded: number, failed: number, results: JobResult[] }
 */
const { Worker } = require('bullmq');
const { redisOptions } = require('../config/redis');
const logger = require('../utils/logger');

// Lazy-require payrollService để tránh circular deps và cho phép
// worker chạy trong process riêng nếu cần.
function getPayrollService() {
    return require('../services/payroll.service');
}

/**
 * @typedef {Object} JobResult
 * @property {string} employeeId
 * @property {boolean} success
 * @property {Object|null} payroll   - populated payroll document nếu success
 * @property {string|null} error     - error message nếu failed
 */

const worker = new Worker(
    'payroll',
    async (job) => {
        const { employeeIds, month, year, finalize = false, deduction = 0, actorId } = job.data;

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            throw new Error('employeeIds must be a non-empty array');
        }

        const payrollService = getPayrollService();
        const results = [];
        let succeeded = 0;
        let failed = 0;

        for (let i = 0; i < employeeIds.length; i++) {
            const employeeId = employeeIds[i];
            try {
                const payroll = await payrollService.generatePayroll(
                    { employee_id: employeeId, month, year, finalize, deduction },
                    actorId,
                );
                results.push({ employeeId, success: true, payroll: payroll?._id });
                succeeded++;
            } catch (err) {
                results.push({ employeeId, success: false, payroll: null, error: err.message });
                failed++;
                logger.warn('Payroll generation failed for employee', {
                    employeeId,
                    month,
                    year,
                    error: err.message,
                });
            }

            // Update job progress (0–100)
            const progress = Math.round(((i + 1) / employeeIds.length) * 100);
            await job.updateProgress(progress);
        }

        const summary = { succeeded, failed, total: employeeIds.length, results };
        logger.info('Payroll bulk job completed', { jobId: job.id, ...summary });

        return summary;
    },
    {
        connection: redisOptions,
        concurrency: 1, // Chỉ chạy 1 bulk job cùng lúc để tránh DB overload
        lockDuration: 5 * 60 * 1000, // 5 phút lock (generous cho bulk payroll)
    },
);

worker.on('completed', (job, result) => {
    logger.info('Payroll job completed', { jobId: job.id, result });
});

worker.on('failed', (job, err) => {
    logger.error('Payroll job failed', { jobId: job?.id, error: err.message });
});

worker.on('error', (err) => {
    logger.error('Payroll worker error', { error: err.message });
});

module.exports = worker;
