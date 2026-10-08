const express = require('express');
const auditController = require('../controllers/audit.controller');
const { ROLES } = require('../constants/roles');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { auditLogQuerySchema } = require('../validators/audit.validator');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get('/', validate(auditLogQuerySchema, 'query'), auditController.listAuditLogs);

module.exports = router;
