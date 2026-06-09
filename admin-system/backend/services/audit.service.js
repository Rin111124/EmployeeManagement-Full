const { AuditLog } = require('../models');
const logger = require('../utils/logger');

async function logAction({ userId = null, action, target, metadata = {}, req = null }) {
    try {
        await AuditLog.create({
            user_id: userId,
            action,
            target,
            metadata,
            ip: req?.ip || req?.headers?.['x-forwarded-for'] || undefined,
            user_agent: req?.get?.('user-agent') || undefined,
            timestamp: new Date(),
        });
    } catch (error) {
        // Audit logging must not break the business operation.
        logger.error('Failed to write audit log', { error: error.message });
    }
}

module.exports = {
    logAction,
};
