/**
 * routes/twoFactor.routes.js
 * Định tuyến cho các API Xác thực 2 yếu tố (2FA)
 */

const express = require('express');
const twoFactorController = require('../controllers/twoFactor.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { loginLimiter } = require('../middlewares/rateLimit.middleware');
const {
    verifySetupSchema,
    verifyLoginSchema,
    disableSchema,
    regenerateSchema,
} = require('../validators/twoFactor.validator');

const router = express.Router();

// ─── Public 2FA Verification (Dành cho luồng đăng nhập) ─────────────────────
// Sử dụng loginLimiter để chống brute-force mã 6 số
router.post(
    '/verify',
    loginLimiter,
    validate(verifyLoginSchema),
    twoFactorController.verifyLogin
);

// ─── Authenticated 2FA Management (Yêu cầu đăng nhập trước) ─────────────────
router.use(authenticate);

router.get('/status', twoFactorController.getStatus);
router.post('/setup', twoFactorController.setup);
router.post('/verify-setup', validate(verifySetupSchema), twoFactorController.verifySetup);
router.post('/disable', validate(disableSchema), twoFactorController.disable);
router.post('/recovery-codes', validate(regenerateSchema), twoFactorController.regenerateRecoveryCodes);

module.exports = router;
