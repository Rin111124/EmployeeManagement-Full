const express = require('express');
const router = express.Router();
const { registerDevice, getDevices } = require('../controllers/device.controller');
const { verifySyncSecret } = require('../middlewares/syncAuth.middleware');

router.use(verifySyncSecret);
router.post('/register', registerDevice);
router.get('/', getDevices);

module.exports = router;
