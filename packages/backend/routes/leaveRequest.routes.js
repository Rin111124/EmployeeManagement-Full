const express = require('express');
const createWorkflowController = require('../controllers/requestWorkflow.controller');
const { AUDIT_ACTIONS } = require('../constants/auditActions');
const { MANAGEMENT_ROLES } = require('../constants/roles');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
    idParamSchema,
    leaveSubmitSchema,
    reviewSchema,
} = require('../validators/requestWorkflow.validator');

const controller = createWorkflowController('leave', {
    singular: 'Leave request',
    targetType: 'LeaveRequest',
    auditCreate: AUDIT_ACTIONS.LEAVE_REQUEST_SUBMIT,
    auditApprove: AUDIT_ACTIONS.LEAVE_REQUEST_APPROVE,
    auditReject: AUDIT_ACTIONS.LEAVE_REQUEST_REJECT,
    auditCancel: AUDIT_ACTIONS.LEAVE_REQUEST_CANCEL,
});

const router = express.Router();

router.use(authenticate);

router.post('/mine', validate(leaveSubmitSchema), controller.createOwn);
router.post('/:id/cancel', validate(idParamSchema, 'params'), controller.cancelOwn);
router.post('/:id/approve', authorize(...MANAGEMENT_ROLES), validate(idParamSchema, 'params'), validate(reviewSchema), controller.approve);
router.post('/:id/reject', authorize(...MANAGEMENT_ROLES), validate(idParamSchema, 'params'), validate(reviewSchema), controller.reject);

module.exports = router;
