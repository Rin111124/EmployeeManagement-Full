const express = require('express');
const employeeController = require('../controllers/employee.controller');
const { MANAGEMENT_ROLES } = require('../constants/roles');
const { authenticate, authorize, authorizeSelfOrRoles } = require('../middlewares/auth.middleware');
const authenticateDevice = require('../middlewares/deviceAuth.middleware');
const { verifySyncSecret } = require('../middlewares/syncAuth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
    createEmployeeSchema,
    updateEmployeeSchema,
    employeeIdParamSchema,
    listEmployeeQuerySchema,
    faceDataSchema,
} = require('../validators/employee.validator');

const router = express.Router();

const authenticateConfirmBiometrics = (req, res, next) => {
    if (req.headers['x-sync-secret']) {
        return verifySyncSecret(req, res, next);
    }

    if (req.headers['x-device-token']) {
        return authenticateDevice(req, res, next);
    }

    return authenticate(req, res, next);
};

// Các endpoint có thể được truy cập bởi cả User (Admin) và Device (Kiosk)
router.patch(
    '/:id/confirm-biometrics',
    // Cho phép :id là MongoDB _id hoặc employee_code để tăng độ tương thích
    authenticateConfirmBiometrics,
    employeeController.confirmBiometrics,
);

// Tất cả các endpoint bên dưới yêu cầu xác thực User (Admin/Staff)
router.use(authenticate);

router
    .route('/')
    .get(authorize(...MANAGEMENT_ROLES), validate(listEmployeeQuerySchema, 'query'), employeeController.listEmployees)
    .post(authorize(...MANAGEMENT_ROLES), validate(createEmployeeSchema), employeeController.createEmployee);

router
    .route('/:id')
    .get(
        validate(employeeIdParamSchema, 'params'),
        authorizeSelfOrRoles((req) => req.params.id, ...MANAGEMENT_ROLES),
        employeeController.getEmployee,
    )
    .patch(authorize(...MANAGEMENT_ROLES), validate(employeeIdParamSchema, 'params'), validate(updateEmployeeSchema), employeeController.updateEmployee)
    .delete(authorize(...MANAGEMENT_ROLES), validate(employeeIdParamSchema, 'params'), employeeController.deleteEmployee);

router.post(
    '/:id/face-data',
    authorize(...MANAGEMENT_ROLES),
    validate(employeeIdParamSchema, 'params'),
    validate(faceDataSchema),
    employeeController.addFaceData,
);

// Endpoint này đã được định nghĩa ở trên với phân quyền linh hoạt
// router.patch('/:id/confirm-biometrics', ...);

module.exports = router;
