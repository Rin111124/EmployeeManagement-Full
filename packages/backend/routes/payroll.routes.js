const express = require('express');
const payrollController = require('../controllers/payroll.controller');
const { MANAGEMENT_ROLES } = require('../constants/roles');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { generatePayrollSchema, generateBulkPayrollSchema } = require('../validators/payroll.validator');

const router = express.Router();

// All payroll workflow routes require authentication
router.use(authenticate);

// Single employee payroll generation (synchronous) — Management only
router.post('/generate', authorize(...MANAGEMENT_ROLES), validate(generatePayrollSchema), payrollController.generatePayroll);

// Bulk payroll generation via BullMQ queue (async — returns jobId) — Management only
router.post('/generate-bulk', authorize(...MANAGEMENT_ROLES), validate(generateBulkPayrollSchema), payrollController.generateBulkPayroll);

// Check status of a bulk payroll job — Management only
router.get('/jobs/:jobId', authorize(...MANAGEMENT_ROLES), payrollController.getJobStatus);

module.exports = router;
