
const { Overtime, Employee } = require('../models');
const { REQUEST_STATUS } = require('../constants/workflow');
const { AUDIT_ACTIONS } = require('../constants/auditActions');
const auditService = require('../services/audit.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const overtimeController = {
    createBulk: asyncHandler(async (req, res) => {
        const { 
            employee_ids, 
            work_date, 
            hours, 
            type, 
            reason, 
            auto_approve = true 
        } = req.body;

        if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
            throw new AppError('Vui lòng chọn ít nhất một nhân viên', 400);
        }

        if (!work_date) {
            throw new AppError('Vui lòng chọn ngày làm việc', 400);
        }

        if (!hours || hours <= 0) {
            throw new AppError('Số giờ tăng ca phải lớn hơn 0', 400);
        }

        const results = [];
        const status = auto_approve ? REQUEST_STATUS.APPROVED : REQUEST_STATUS.PENDING;
        const reviewed_by = auto_approve ? req.user._id : null;
        const reviewed_at = auto_approve ? new Date() : null;

        try {
            const mongoose = require('mongoose');
            
            // Chuẩn bị dữ liệu hàng loạt
            const overtimeRecords = employee_ids.map(empId => ({
                employee_id: new mongoose.Types.ObjectId(empId),
                work_date: new Date(work_date),
                hours: Number(hours),
                type: type || 'Weekday',
                reason: reason || 'Ghi nhận hàng loạt',
                status: status,
                reviewed_by: reviewed_by,
                reviewed_at: reviewed_at,
                review_note: auto_approve ? 'Bulk created by HR' : null,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            // Lưu trực tiếp vào Database để tránh lỗi Validation ẩn của Mongoose
            const result = await Overtime.insertMany(overtimeRecords);

            // Log audit
            try {
                await auditService.logAction({
                    userId: req.user._id,
                    action: 'OVERTIME_SUBMIT',
                    target: { type: 'Overtime', id: result[0]._id },
                    metadata: { count: result.length, bulk: true },
                    req,
                });
            } catch (auditErr) {
                console.error('Audit Log Error:', auditErr);
            }

            res.status(201).json({
                success: true,
                message: `Đã ghi nhận thành công cho ${result.length} nhân viên.`,
                data: result,
            });
        } catch (error) {
            console.error('CRITICAL Bulk Overtime Error:', error);
            res.status(400).json({
                success: false,
                message: `Lỗi lưu dữ liệu: ${error.message}`
            });
        }
    }),
};

module.exports = overtimeController;
