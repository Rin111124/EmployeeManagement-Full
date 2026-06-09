const express = require('express');
const payrollController = require('../controllers/payroll.controller');
const { MANAGEMENT_ROLES } = require('../constants/roles');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { generatePayrollSchema } = require('../validators/payroll.validator');

const router = express.Router();

router.use(authenticate);

router.post('/generate', authorize(...MANAGEMENT_ROLES), validate(generatePayrollSchema), payrollController.generatePayroll);

module.exports = router;
