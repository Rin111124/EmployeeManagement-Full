#!/usr/bin/env node
/**
 * Migration script Ä‘á»ƒ backfill hash-chaining cho cÃ¡c báº£n ghi AuditLog cÅ© (Legacy)
 *
 * CÃ¡ch dÃ¹ng:
 *   node scripts/security/migrate-legacy-audit-logs.js
 */

const path = require('path');
const backendRoot = path.resolve(__dirname, '../../packages/backend');
const mongoose = require(path.join(backendRoot, 'node_modules/mongoose'));
const { AuditLog } = require(path.join(backendRoot, 'models'));
const { computeRecordHash } = require(path.join(backendRoot, 'services/audit.service'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://app_emp_user:D7YcyQP6LBa1UhFfDUtXTK0IGLzJ@127.0.0.1:27017/employee_management?authSource=employee_management';

async function main() {
    console.log('====================================================');
    console.log('  BACKFILL HASH-CHAIN CHO AUDIT LOG Lá»ŠCH Sá»¬ (LEGACY)  ');
    console.log('====================================================\n');

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[OK] Connected.\n');

    // 1. TÃ¬m báº£n ghi cÃ³ sequence cao nháº¥t hiá»‡n táº¡i
    const lastSequenced = await AuditLog.findOne({ sequence_number: { $ne: null } })
        .sort({ sequence_number: -1 })
        .lean();

    let currentSeq = lastSequenced?.sequence_number || 0;
    let prevHash = lastSequenced?.record_hash || 'GENESIS';

    // 2. Láº¥y cÃ¡c báº£n ghi chÆ°a cÃ³ sequence_number
    const unsequencedLogs = await AuditLog.find({ sequence_number: null })
        .sort({ timestamp: 1, _id: 1 });

    console.log(`TÃ¬m tháº¥y ${unsequencedLogs.length} báº£n ghi AuditLog lá»‹ch sá»­ chÆ°a Ä‘Æ°á»£c bÄƒm khá»‘i.`);

    if (unsequencedLogs.length === 0) {
        console.log('Táº¥t cáº£ báº£n ghi Ä‘Ã£ Ä‘Æ°á»£c bÄƒm khá»‘i báº£o máº­t! KhÃ´ng cáº§n di chuyá»ƒn.');
        await mongoose.disconnect();
        return;
    }

    console.log('Äang thá»±c hiá»‡n tÃ­nh toÃ¡n mÃ£ bÄƒm SHA-256 theo chuá»—i liÃªn tá»¥c...');

    for (const log of unsequencedLogs) {
        currentSeq += 1;
        const safeTarget = (log.target && log.target.type) ? log.target : { type: 'LegacySystem', id: log.target?.id || null };

        const recordHash = computeRecordHash({
            sequence_number: currentSeq,
            action: log.action,
            user_id: log.user_id,
            target: safeTarget,
            metadata: log.metadata,
            ip: log.ip,
            timestamp: log.timestamp || new Date(),
            previous_hash: prevHash,
        });

        log.sequence_number = currentSeq;
        log.previous_hash = prevHash;
        log.record_hash = recordHash;
        log.target = safeTarget;

        await log.save();
        prevHash = recordHash;
    }

    console.log(`\n[SUCCESS] ÄÃ£ hoÃ n táº¥t bÄƒm mÃ£ khÃ³a cho ${unsequencedLogs.length} báº£n ghi lá»‹ch sá»­!`);
    console.log(`Sequence hiá»‡n táº¡i: 1 -> ${currentSeq}`);

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error('[ERROR FATAL]:', err.message);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
});

