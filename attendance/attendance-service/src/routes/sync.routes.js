const express = require('express');
const router = express.Router();
const { syncEmployees, updateFaceEmbedding } = require('../controllers/sync.controller');
const { verifySyncSecret } = require('../middlewares/syncAuth.middleware');

router.use(verifySyncSecret);
router.post('/employees', syncEmployees);
router.put('/face/:id', updateFaceEmbedding);

module.exports = router;
