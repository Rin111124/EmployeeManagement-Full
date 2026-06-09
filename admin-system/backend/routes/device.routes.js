const express = require('express');
const multer = require('multer');
const deviceController = require('../controllers/device.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const authenticateDevice = require('../middlewares/deviceAuth.middleware');
const { MANAGEMENT_ROLES } = require('../constants/roles');

const router = express.Router();
const streamUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ─── Public / Device Endpoints ────────────────────────────────────────────────
// Không yêu cầu auth — thiết bị chưa có token cần gọi được
router.post('/request-access', deviceController.requestAccess);
router.get('/status/:deviceId', deviceController.getStatus);

// Yêu cầu xác minh (device_id + device_name) nhưng không cần JWT
// Token chỉ trả nếu device đã approved và định danh khớp
router.post('/claim-token', deviceController.claimToken);

const biometricController = require('../controllers/biometric.controller');

// Yêu cầu x-device-token header hợp lệ
router.post('/report-log', authenticateDevice, deviceController.reportLog);
router.post('/stream-frame', authenticateDevice, streamUpload.single('frame'), deviceController.streamFrame);
router.get('/unregistered-employees', authenticateDevice, deviceController.getUnregisteredEmployees);

// Device-authenticated routes for biometric registration from kiosks
router.post('/request-registration', authenticateDevice, biometricController.createRegistrationRequest);
router.get('/check-registration-status/:employee_id', authenticateDevice, biometricController.checkStatus);

// ─── Admin Only Endpoints ─────────────────────────────────────────────────────
router.use(authenticate);
router.use(authorize(...MANAGEMENT_ROLES));

router.get('/', deviceController.getAllDevices);
router.get('/:id/latest-frame', deviceController.getLatestFrame);
router.patch('/:id/approve', deviceController.approveDevice);
router.patch('/:id/reject', deviceController.rejectDevice);
router.patch('/:id/toggle-db-access', deviceController.toggleDbAccess);
router.post('/:id/sync', deviceController.syncData);
router.delete('/:id', deviceController.deleteDevice);

module.exports = router;
