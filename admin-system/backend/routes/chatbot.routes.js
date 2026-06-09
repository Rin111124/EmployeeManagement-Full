const express = require('express');
const chatbotController = require('../controllers/chatbot.controller');
const { MANAGEMENT_ROLES } = require('../constants/roles');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.use(authorize(...MANAGEMENT_ROLES));
router.post('/ask', chatbotController.ask);

module.exports = router;
