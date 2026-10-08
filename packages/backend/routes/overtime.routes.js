const express = require('express');
const createWorkflowController = require('../controllers/requestWorkflow.controller');
const { AUDIT_ACTIONS } = require('../constants/auditActions');
const { MANAGEMENT_ROLES } = require('../constants/roles');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
    idParamSchema,
    overtimeSubmitSchema,
    reviewSchema,
} = require('../validators/requestWorkflow.validator');

const controller = createWorkflowController('overtime', {
    singular: 'Overtime request',
    targetType: 'Overtime',
    auditCreate: AUDIT_ACTIONS.OVERTIME_SUBMIT,
    auditApprove: AUDIT_ACTIONS.OVERTIME_APPROVE,
    auditReject: AUDIT_ACTIONS.OVERTIME_REJECT,
    auditCancel: AUDIT_ACTIONS.OVERTIME_CANCEL,
});

const router = express.Router();
const overtimeController = require('../controllers/overtime.controller');

router.use(authenticate);

router.post('/mine', validate(overtimeSubmitSchema), controller.createOwn);
router.post('/bulk', authorize(...MANAGEMENT_ROLES), overtimeController.createBulk);
router.post('/:id/cancel', validate(idParamSchema, 'params'), controller.cancelOwn);
router.post('/:id/approve', authorize(...MANAGEMENT_ROLES), validate(idParamSchema, 'params'), validate(reviewSchema), controller.approve);
router.post('/:id/reject', authorize(...MANAGEMENT_ROLES), validate(idParamSchema, 'params'), validate(reviewSchema), controller.reject);

module.exports = router;
