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

// Middleware linh hoạt: chấp nhận HMAC-signed (REQUIRE_SYNC_SIGNATURE=true),
// legacy x-sync-secret, device token, hoặc JWT của admin user.
const authenticateConfirmBiometrics = (req, res, next) => {
    // HMAC-signed request từ attendance-service (production mode)
    if (req.headers['x-sync-signature'] || req.headers['x-sync-timestamp']) {
        const { verifySyncAuth } = require('../middlewares/serviceAuth.middleware');
        return verifySyncAuth(req, res, next);
    }

    // Legacy x-sync-secret từ attendance-service (development mode)
    if (req.headers['x-sync-secret']) {
        return verifySyncSecret(req, res, next);
    }

    // Device token từ kiosk trực tiếp
    if (req.headers['x-device-token']) {
        return authenticateDevice(req, res, next);
    }

    // JWT từ admin UI
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
