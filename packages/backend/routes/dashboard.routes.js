const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.get('/metrics', dashboardController.getDashboardMetrics);

module.exports = router;
