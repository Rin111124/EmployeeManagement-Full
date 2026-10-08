const crypto = require('crypto');
const { AuditLog } = require('../models');
const logger = require('../utils/logger');

let writeQueue = Promise.resolve();

function enqueueAuditWrite(task) {
    const next = writeQueue.then(task, task);
    writeQueue = next.catch(() => {});
    return next;
}

/**
 * Tính toán mã băm SHA-256 cho bản ghi AuditLog (Chuỗi khối bất biến).
 */
function computeRecordHash({ sequence_number, action, user_id, target, metadata, ip, timestamp, previous_hash }) {
    const payload = [
        sequence_number,
        action || '',
        user_id ? String(user_id) : 'SYSTEM',
        target?.type ? `${target.type}:${target.id || ''}` : '',
        JSON.stringify(metadata || {}),
        ip || '',
        new Date(timestamp).toISOString(),
        previous_hash || 'GENESIS',
    ].join('|');

    return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Lấy số sequence tiếp theo và hash của bản ghi liền trước.
 */
async function getNextSequenceAndPrevHash() {
    const lastRecord = await AuditLog.findOne({ sequence_number: { $ne: null } })
        .sort({ sequence_number: -1 })
        .select('sequence_number record_hash')
        .lean();

    const sequence_number = (lastRecord?.sequence_number || 0) + 1;
    const previous_hash = lastRecord?.record_hash || 'GENESIS';
    return { sequence_number, previous_hash };
}

async function logAction({ userId = null, action, target, metadata = {}, req = null }) {
    return enqueueAuditWrite(async () => {
        try {
            const { sequence_number, previous_hash } = await getNextSequenceAndPrevHash();
            const timestamp = new Date();
            const ip = req?.ip || req?.headers?.['x-forwarded-for'] || undefined;
            const user_agent = req?.get?.('user-agent') || undefined;
            const safeTarget = (target && target.type) ? target : { type: 'System', id: target?.id || null };

            const record_hash = computeRecordHash({
                sequence_number,
                action,
                user_id: userId,
                target: safeTarget,
                metadata,
                ip,
                timestamp,
                previous_hash,
            });

            return await AuditLog.create({
                user_id: userId,
                action,
                target: safeTarget,
                metadata,
                ip,
                user_agent,
                timestamp,
                sequence_number,
                previous_hash,
                record_hash,
            });
        } catch (error) {
            // Audit logging must not break the business operation.
            logger.error('Failed to write audit log', { error: error.message });
        }
    });
}

async function beginRequiredAction({ userId = null, action, target, metadata = {}, req = null }) {
    return enqueueAuditWrite(async () => {
        const { sequence_number, previous_hash } = await getNextSequenceAndPrevHash();
        const timestamp = new Date();
        const ip = req?.ip || req?.headers?.['x-forwarded-for'] || undefined;
        const user_agent = req?.get?.('user-agent') || undefined;
        const initialMetadata = { ...metadata, outcome: 'pending' };
        const safeTarget = (target && target.type) ? target : { type: 'System', id: target?.id || null };

        const record_hash = computeRecordHash({
            sequence_number,
            action,
            user_id: userId,
            target: safeTarget,
            metadata: initialMetadata,
            ip,
            timestamp,
            previous_hash,
        });

        return AuditLog.create({
            user_id: userId,
            action,
            target: safeTarget,
            metadata: initialMetadata,
            ip,
            user_agent,
            timestamp,
            sequence_number,
            previous_hash,
            record_hash,
        });
    });
}

async function completeRequiredAction(auditId, metadata) {
    return enqueueAuditWrite(async () => {
        try {
            const entry = await AuditLog.findById(auditId);
            if (!entry || entry.metadata?.outcome !== 'pending') {
                logger.error('Required audit intent was missing or already finalized', { auditId: String(auditId) });
                return false;
            }

            const updatedMetadata = { ...entry.metadata, ...metadata, outcome: metadata.outcome || 'succeeded' };
            const newRecordHash = computeRecordHash({
                sequence_number: entry.sequence_number,
                action: entry.action,
                user_id: entry.user_id,
                target: entry.target,
                metadata: updatedMetadata,
                ip: entry.ip,
                timestamp: entry.timestamp,
                previous_hash: entry.previous_hash,
            });

            entry.metadata = updatedMetadata;
            entry.record_hash = newRecordHash;
            await entry.save();
            return true;
        } catch (error) {
            logger.error('Failed to finalize required audit action', { auditId: String(auditId), error: error.message });
            return false;
        }
    });
}

/**
 * Xác minh tính toàn vẹn của toàn bộ chuỗi Audit Log (Phát hiện gian lận/sửa đổi DB trái phép)
 */
async function verifyAuditChain() {
    const logs = await AuditLog.find({ sequence_number: { $ne: null } })
        .sort({ sequence_number: 1 })
        .lean();

    if (logs.length === 0) {
        return { is_valid: true, count: 0, issues: [] };
    }

    const issues = [];
    let expectedPrevHash = 'GENESIS';

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const expectedSeq = i + 1;

        // 1. Kiểm tra thứ tự tăng dần liên tục
        if (log.sequence_number !== expectedSeq) {
            issues.push({
                sequence_number: log.sequence_number,
                id: String(log._id),
                issue: `Sequence gap detected: expected ${expectedSeq}, got ${log.sequence_number}`,
            });
        }

        // 2. Kiểm tra previous_hash khớp với record_hash bản ghi trước
        if (log.previous_hash !== expectedPrevHash) {
            issues.push({
                sequence_number: log.sequence_number,
                id: String(log._id),
                issue: `Broken hash chain: expected previous_hash '${expectedPrevHash}', got '${log.previous_hash}'`,
            });
        }

        // 3. Tính lại SHA-256 từ dữ liệu thực tế và so khớp với record_hash đã lưu
        const computedHash = computeRecordHash({
            sequence_number: log.sequence_number,
            action: log.action,
            user_id: log.user_id,
            target: log.target,
            metadata: log.metadata,
            ip: log.ip,
            timestamp: log.timestamp,
            previous_hash: log.previous_hash,
        });

        if (computedHash !== log.record_hash) {
            issues.push({
                sequence_number: log.sequence_number,
                id: String(log._id),
                issue: `Tampered record detected! Recomputed hash '${computedHash}' does not match stored '${log.record_hash}'`,
            });
        }

        expectedPrevHash = log.record_hash;
    }

    return {
        is_valid: issues.length === 0,
        count: logs.length,
        issues,
    };
}

module.exports = {
    computeRecordHash,
    logAction,
    beginRequiredAction,
    completeRequiredAction,
    verifyAuditChain,
};
