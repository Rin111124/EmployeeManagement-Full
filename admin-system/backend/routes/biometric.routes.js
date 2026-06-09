const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometric.controller');
const { ROLES } = require('../constants/roles');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Public routes for devices moved to device.routes.js to avoid shadowing

// Admin routes
router.get('/biometric-requests', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), biometricController.listRequests);
router.patch('/biometric-requests/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), biometricController.updateRequestStatus);

module.exports = router;
