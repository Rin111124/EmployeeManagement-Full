const express = require('express');
const authController = require('../controllers/auth.controller');
const attendanceController = require('../controllers/attendance.controller');
const { MANAGEMENT_ROLES, ROLES } = require('../constants/roles');
const validate = require('../middlewares/validate.middleware');
const { authenticate, authorize, authorizeSelfOrRoles } = require('../middlewares/auth.middleware');
const { registerSchema } = require('../validators/auth.validator');
const { checkInSchema, checkOutSchema } = require('../validators/attendance.validator');

const router = express.Router();

router.post('/register', authenticate, authorize(ROLES.ADMIN), validate(registerSchema), authController.register);
router.post(
    '/checkin',
    authenticate,
    validate(checkInSchema),
    authorizeSelfOrRoles((req) => req.body.employee_id, ...MANAGEMENT_ROLES),
    attendanceController.checkIn,
);
router.post(
    '/checkout',
    authenticate,
    validate(checkOutSchema),
    authorizeSelfOrRoles((req) => req.body.employee_id, ...MANAGEMENT_ROLES),
    attendanceController.checkOut,
);

module.exports = router;
