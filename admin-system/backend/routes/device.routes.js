const express = require('express');
const multer = require('multer');
const deviceController = require('../controllers/device.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const authenticateDevice = require('../middlewares/deviceAuth.middleware');
const validate = require('../middlewares/validate.middleware');
const { deviceEnrollmentLimiter } = require('../middlewares/rateLimit.middleware');
const {
  requestAccessSchema,
  enrollmentChallengeSchema,
  claimTokenSchema,
  deviceIdParamSchema,
  deviceStatusParamSchema,
} = require('../validators/device.validator');
const { MANAGEMENT_ROLES } = require('../constants/roles');

const router = express.Router();
const streamUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ─── Public / Device Endpoints ────────────────────────────────────────────────
// Không yêu cầu auth — thiết bị chưa có token cần gọi được, nhưng phải qua rate limit và validation
router.post('/request-access', deviceEnrollmentLimiter, validate(requestAccessSchema), deviceController.requestAccess);
router.get('/status/:deviceId', validate(deviceStatusParamSchema, 'params'), deviceController.getStatus);
router.post('/enroll/challenge', deviceEnrollmentLimiter, validate(enrollmentChallengeSchema), deviceController.requestEnrollmentChallenge);

// Yêu cầu xác minh (challenge-response hoặc legacy claim_code)
router.post('/claim-token', deviceEnrollmentLimiter, validate(claimTokenSchema), deviceController.claimToken);

const biometricController = require('../controllers/biometric.controller');

// Yêu cầu x-device-token header hợp lệ
router.post('/report-log', authenticateDevice, deviceController.reportLog);
router.post('/extract-features', authenticateDevice, streamUpload.single('file'), deviceController.extractFaceFeatures);
router.post('/stream-frame', authenticateDevice, streamUpload.single('frame'), deviceController.streamFrame);
router.get('/unregistered-employees', authenticateDevice, deviceController.getUnregisteredEmployees);

// Device-authenticated routes for biometric registration from kiosks
router.post('/request-registration', authenticateDevice, biometricController.createRegistrationRequest);
router.get('/check-registration-status/:employee_id', authenticateDevice, biometricController.checkStatus);

// ─── Admin Only Endpoints ─────────────────────────────────────────────────────
router.use(authenticate);
router.use(authorize(...MANAGEMENT_ROLES));

router.get('/', deviceController.getAllDevices);
router.get('/:id/latest-frame', validate(deviceIdParamSchema, 'params'), deviceController.getLatestFrame);
router.patch('/:id/approve', validate(deviceIdParamSchema, 'params'), deviceController.approveDevice);
router.patch('/:id/reject', validate(deviceIdParamSchema, 'params'), deviceController.rejectDevice);
router.patch('/:id/revoke', validate(deviceIdParamSchema, 'params'), deviceController.revokeDevice);
router.patch('/:id/toggle-db-access', validate(deviceIdParamSchema, 'params'), deviceController.toggleDbAccess);
router.post('/:id/sync', validate(deviceIdParamSchema, 'params'), deviceController.syncData);
router.delete('/:id', validate(deviceIdParamSchema, 'params'), deviceController.deleteDevice);

module.exports = router;
