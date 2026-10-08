const express = require('express');
const contractController = require('../controllers/contract.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { MANAGEMENT_ROLES } = require('../constants/roles');

const router = express.Router();

router.use(authenticate);

router.get('/:id/generate-document', authorize(...MANAGEMENT_ROLES), contractController.generateContractDocument);
router.get('/:id/generate-html', authorize(...MANAGEMENT_ROLES), contractController.generateContractHtml);
router.patch('/:id/status', authorize(...MANAGEMENT_ROLES), contractController.updateStatus);

module.exports = router;
