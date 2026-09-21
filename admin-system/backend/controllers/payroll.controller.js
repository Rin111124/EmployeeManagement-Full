const { AUDIT_ACTIONS } = require('../constants/auditActions');
const auditService = require('../services/audit.service');
const payrollService = require('../services/payroll.service');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * POST /api/v1/payroll/generate
 * Generate payroll cho một nhân viên (synchronous — dùng cho single-employee).
 */
const generatePayroll = asyncHandler(async (req, res) => {
    const payroll = await payrollService.generatePayroll(req.body, req.user._id);
    await auditService.logAction({
        userId: req.user._id,
        action: AUDIT_ACTIONS.PAYROLL_GENERATE,
        target: { type: 'Payroll', id: payroll._id },
        metadata: {
            employee_id: req.body.employee_id,
            month: req.body.month,
            year: req.body.year,
        },
        req,
    });
    res.status(201).json({
        success: true,
        message: 'Payroll generated successfully',
        data: payroll,
    });
});

/**
 * POST /api/v1/payroll/generate-bulk
 * Enqueue payroll generation cho nhiều nhân viên vào BullMQ queue.
 * Trả về jobId ngay lập tức — client poll GET /jobs/:jobId để kiểm tra progress.
 *
 * Body: { employeeIds: string[], month: number, year: number, finalize?: boolean, deduction?: number }
 */
const generateBulkPayroll = asyncHandler(async (req, res) => {
    // Lazy-require để không crash khi Redis chưa available
    let payrollQueue;
    try {
        payrollQueue = require('../queues/payroll.queue');
    } catch (err) {
        logger.warn('BullMQ queue unavailable — Redis may not be running', { error: err.message });
        return res.status(503).json({
            success: false,
            message: 'Bulk payroll service unavailable. Please ensure Redis is running.',
        });
    }

    const { employeeIds, month, year, finalize = false, deduction = 0 } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'employeeIds must be a non-empty array',
        });
    }

    const job = await payrollQueue.add('generate-bulk', {
        employeeIds,
        month,
        year,
        finalize,
        deduction,
        actorId: req.user._id.toString(),
    });

    logger.info('Payroll bulk job enqueued', {
        jobId: job.id,
        employeeCount: employeeIds.length,
        month,
        year,
        actorId: req.user._id,
    });

    res.status(202).json({
        success: true,
        message: `Payroll generation queued for ${employeeIds.length} employee(s)`,
        data: {
            jobId: job.id,
            employeeCount: employeeIds.length,
            month,
            year,
            statusUrl: `/api/v1/payroll/jobs/${job.id}`,
        },
    });
});

/**
 * GET /api/v1/payroll/jobs/:jobId
 * Kiểm tra trạng thái của một bulk payroll job.
 * Returns: { state, progress, result, failedReason }
 */
const getJobStatus = asyncHandler(async (req, res) => {
    let payrollQueue;
    try {
        payrollQueue = require('../queues/payroll.queue');
    } catch (err) {
        return res.status(503).json({
            success: false,
            message: 'Job status service unavailable. Please ensure Redis is running.',
        });
    }

    const { jobId } = req.params;
    const job = await payrollQueue.getJob(jobId);

    if (!job) {
        return res.status(404).json({
            success: false,
            message: `Job ${jobId} not found`,
        });
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    res.status(200).json({
        success: true,
        data: {
            jobId: job.id,
            state,          // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
            progress,       // 0–100
            result: result || null,
            failedReason: failedReason || null,
            createdAt: new Date(job.timestamp),
            processedAt: job.processedOn ? new Date(job.processedOn) : null,
            finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        },
    });
});

module.exports = {
    generatePayroll,
    generateBulkPayroll,
    getJobStatus,
};
