const { AUDIT_ACTIONS } = require('../constants/auditActions');
const auditService = require('../services/audit.service');
const payrollService = require('../services/payroll.service');
const asyncHandler = require('../utils/asyncHandler');

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

module.exports = {
    generatePayroll,
};
