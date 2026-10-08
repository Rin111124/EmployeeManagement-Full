#!/usr/bin/env node
/**
 * CLI Script kiá»ƒm tra tÃ­nh toÃ n váº¹n cá»§a chuá»—i Audit Log (Tamper Detection)
 *
 * CÃ¡ch dÃ¹ng:
 *   node scripts/security/verify-audit-chain.js
 */

const path = require('path');
const backendRoot = path.resolve(__dirname, '../../packages/backend');
const mongoose = require(path.join(backendRoot, 'node_modules/mongoose'));
const auditService = require(path.join(backendRoot, 'services/audit.service'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://app_emp_user:D7YcyQP6LBa1UhFfDUtXTK0IGLzJ@127.0.0.1:27017/employee_management?authSource=employee_management';

async function main() {
    console.log('====================================================');
    console.log(' AUDIT LOG CRYPTOGRAPHIC INTEGRITY VERIFIER (SHA-256) ');
    console.log('====================================================\n');

    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log('[OK] Connected.\n');

    console.log('Scanning Audit Log hash chain...');
    const result = await auditService.verifyAuditChain();

    console.log(`\nTá»•ng sá»‘ báº£n ghi kiá»ƒm toÃ¡n Ä‘Ã£ quÃ©t: ${result.count}`);

    if (result.is_valid) {
        console.log('\n[SUCCESS] TÃNH TOÃ€N Váº¸N TUYá»†T Äá»I (CHAIN INTACT)!');
        console.log('Chuá»—i mÃ£ bÄƒm SHA-256 hoÃ n toÃ n liá»n máº¡ch, khÃ´ng cÃ³ báº¥t ká»³ dáº¥u hiá»‡u sá»­a Ä‘á»•i hay xÃ³a log trÃ¡i phÃ©p.');
        await mongoose.disconnect();
        process.exit(0);
    } else {
        console.error('\n[Cáº¢NH BÃO AN NINH] PHÃT HIá»†N Sá»° Cá» TOÃ€N Váº¸N (TAMPER DETECTED)!');
        console.error(`PhÃ¡t hiá»‡n ${result.issues.length} Ä‘iá»ƒm báº¥t thÆ°á»ng:`);
        result.issues.forEach((issue, index) => {
            console.error(`  ${index + 1}. [Seq #${issue.sequence_number}] [Log ID: ${issue.id}] -> ${issue.issue}`);
        });
        await mongoose.disconnect();
        process.exit(1);
    }
}

main().catch(async (err) => {
    console.error('[ERROR FATAL]:', err.message);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
});

