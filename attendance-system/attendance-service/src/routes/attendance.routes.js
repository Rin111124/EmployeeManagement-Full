const express = require('express');
const router = express.Router();
const { recognize, checkIn, checkOut } = require('../controllers/attendance.controller');
const { authenticateDevice } = require('../middlewares/deviceAuth.middleware');

router.use(authenticateDevice);
router.post('/recognize', recognize);
router.post('/check-in', checkIn);
router.post('/check-out/:id', checkOut);
router.post('/check-out', checkOut);

module.exports = router;
