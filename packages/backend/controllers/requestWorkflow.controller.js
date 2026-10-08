const { AUDIT_ACTIONS } = require('../constants/auditActions');
const { REQUEST_STATUS } = require('../constants/workflow');
const auditService = require('../services/audit.service');
const workflowService = require('../services/requestWorkflow.service');
const asyncHandler = require('../utils/asyncHandler');

function createWorkflowController(type, labels) {
    return {
        createOwn: asyncHandler(async (req, res) => {
            const data = await workflowService.createOwn(type, req.user.employee_id._id, req.body);
            await auditService.logAction({
                userId: req.user._id,
                action: labels.auditCreate,
                target: { type: labels.targetType, id: data._id },
                req,
            });
            res.status(201).json({
                success: true,
                message: `${labels.singular} submitted successfully`,
                data,
            });
        }),

        approve: asyncHandler(async (req, res) => {
            const data = await workflowService.transition(
                type,
                req.params.id,
                REQUEST_STATUS.APPROVED,
                req.user._id,
                req.body.review_note,
            );
            await auditService.logAction({
                userId: req.user._id,
                action: labels.auditApprove,
                target: { type: labels.targetType, id: data._id },
                metadata: { review_note: req.body.review_note },
                req,
            });
            res.json({
                success: true,
                message: `${labels.singular} approved successfully`,
                data,
            });
        }),

        reject: asyncHandler(async (req, res) => {
            const data = await workflowService.transition(
                type,
                req.params.id,
                REQUEST_STATUS.REJECTED,
                req.user._id,
                req.body.review_note,
            );
            await auditService.logAction({
                userId: req.user._id,
                action: labels.auditReject,
                target: { type: labels.targetType, id: data._id },
                metadata: { review_note: req.body.review_note },
                req,
            });
            res.json({
                success: true,
                message: `${labels.singular} rejected successfully`,
                data,
            });
        }),

        cancelOwn: asyncHandler(async (req, res) => {
            const data = await workflowService.cancelOwn(type, req.params.id, req.user.employee_id._id);
            await auditService.logAction({
                userId: req.user._id,
                action: labels.auditCancel,
                target: { type: labels.targetType, id: data._id },
                req,
            });
            res.json({
                success: true,
                message: `${labels.singular} cancelled successfully`,
                data,
            });
        }),
    };
}

module.exports = createWorkflowController;
