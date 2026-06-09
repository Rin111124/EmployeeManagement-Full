const express = require('express');
const attendanceController = require('../controllers/attendance.controller');
const { MANAGEMENT_ROLES } = require('../constants/roles');
const { authenticate, authorize, authorizeSelfOrRoles } = require('../middlewares/auth.middleware');
const { verifySyncSecret } = require('../middlewares/syncAuth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
    checkInSchema,
    checkOutSchema,
    historyQuerySchema,
    dailyReportQuerySchema,
    monthlyReportQuerySchema,
    attendanceIdParamSchema,
    updateAttendanceSchema,
    createAttendanceSchema,
} = require('../validators/attendance.validator');

const router = express.Router();

router.post('/sync-from-device', verifySyncSecret, attendanceController.syncFromDevice);

router.use(authenticate);

router.post(
    '/check-in',
    validate(checkInSchema),
    authorizeSelfOrRoles((req) => req.body.employee_id, ...MANAGEMENT_ROLES),
    attendanceController.checkIn,
);
router.post(
    '/check-out',
    validate(checkOutSchema),
    authorizeSelfOrRoles((req) => req.body.employee_id, ...MANAGEMENT_ROLES),
    attendanceController.checkOut,
);
router.post(
    '/',
    authorize(...MANAGEMENT_ROLES),
    validate(createAttendanceSchema),
    attendanceController.createAttendance
);
router.get('/history', validate(historyQuerySchema, 'query'), attendanceController.getHistory);
router
    .route('/:id')
    .get(authorize(...MANAGEMENT_ROLES), validate(attendanceIdParamSchema, 'params'), attendanceController.getAttendance)
    .patch(authorize(...MANAGEMENT_ROLES), validate(attendanceIdParamSchema, 'params'), validate(updateAttendanceSchema), attendanceController.updateAttendance)
    .delete(authorize(...MANAGEMENT_ROLES), validate(attendanceIdParamSchema, 'params'), attendanceController.deleteAttendance);
router.get('/reports/daily', authorize(...MANAGEMENT_ROLES), validate(dailyReportQuerySchema, 'query'), attendanceController.dailyReport);
router.get('/reports/monthly', authorize(...MANAGEMENT_ROLES), validate(monthlyReportQuerySchema, 'query'), attendanceController.monthlyReport);

module.exports = router;
