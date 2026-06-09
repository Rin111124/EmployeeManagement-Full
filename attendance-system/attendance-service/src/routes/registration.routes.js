const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { enrollFace, matchFace } = require('../controllers/registration.controller');
const { authenticateDevice } = require('../middlewares/deviceAuth.middleware');

router.use(authenticateDevice);

// Rate limiter for enrollment (5 attempts per minute per IP)
const enrollLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 30 : 5,
    message: 'Too many enrollment attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for matching (20 attempts per minute per IP)
const matchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many match requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

const enrollRateLimiterMiddleware =
    process.env.NODE_ENV === 'test'
        ? (req, res, next) => {
            if (req.get('x-enable-rate-limit')) {
                return enrollLimiter(req, res, next);
            }

            return next();
        }
        : enrollLimiter;

const matchRateLimiterMiddleware =
    process.env.NODE_ENV === 'test'
        ? (req, res, next) => {
            if (req.get('x-enable-rate-limit')) {
                return matchLimiter(req, res, next);
            }

            return next();
        }
        : matchLimiter;

router.post('/enroll', enrollRateLimiterMiddleware, enrollFace);
router.post('/match', matchRateLimiterMiddleware, matchFace);

module.exports = router;
