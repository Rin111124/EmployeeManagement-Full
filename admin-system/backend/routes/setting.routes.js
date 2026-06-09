const express = require('express');
const multer = require('multer');
const settingController = require('../controllers/setting.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(authenticate);

router.get('/', settingController.getSettings);
router.get('/backup', authorize(ROLES.ADMIN, ROLES.HR), settingController.downloadBackup);
router.post('/restore', authorize(ROLES.ADMIN), upload.single('backup'), settingController.restoreBackup);
router.get('/:key', settingController.getSettingByKey);

// Chỉ Admin/HR được sửa cấu hình chấm công
router.put('/time_config', authorize(ROLES.ADMIN, ROLES.HR), settingController.updateTimeConfig);

module.exports = router;
