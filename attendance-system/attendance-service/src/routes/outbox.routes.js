const express = require('express');
const router = express.Router();
const { verifySyncSecret } = require('../middlewares/syncAuth.middleware');
const {
    getOutboxStats,
    getDeadLetterEvents,
    replayDeadLetterEvent,
    processOutboxBatch,
} = require('../services/outbox.service');

// Protect all outbox management routes with sync secret
router.use(verifySyncSecret);

/**
 * @route   GET /api/outbox/stats
 * @desc    Get outbox counts grouped by status (pending, processing, completed, failed, dead_letter)
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await getOutboxStats();
        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * @route   GET /api/outbox/dlq
 * @desc    Get list of dead-letter events
 */
router.get('/dlq', async (req, res) => {
    try {
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const result = await getDeadLetterEvents({ limit, page });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * @route   POST /api/outbox/dlq/:eventId/retry
 * @desc    Replay/retry a dead-letter event
 */
router.post('/dlq/:eventId/retry', async (req, res) => {
    try {
        const event = await replayDeadLetterEvent(req.params.eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found in dead_letter status' });
        }

        // Trigger immediate batch processing attempt
        processOutboxBatch().catch((err) => {
            console.warn('[OUTBOX] Replay process trigger warning:', err.message);
        });

        res.json({
            success: true,
            message: `Event ${req.params.eventId} reset to pending and scheduled for immediate sync`,
            data: event,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
