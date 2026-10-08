const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { AuditLog } = require('../models');
const auditService = require('../services/audit.service');

let mongoServer;

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

test.beforeEach(async () => {
    await AuditLog.deleteMany({});
});

test('CHAIN-01: Correctly chains sequence numbers and previous_hashes', async () => {
    const log1 = await auditService.logAction({
        action: 'TEST_CHAIN_LOGIN',
        target: { type: 'User' },
        metadata: { ip: '127.0.0.1' },
    });

    assert.ok(log1);
    assert.equal(log1.sequence_number, 1);
    assert.equal(log1.previous_hash, 'GENESIS');
    assert.ok(log1.record_hash);

    const log2 = await auditService.logAction({
        action: 'TEST_CHAIN_UPDATE_SALARY',
        target: { type: 'Payroll' },
        metadata: { new_salary: 50000000 },
    });

    assert.ok(log2);
    assert.equal(log2.sequence_number, 2);
    assert.equal(log2.previous_hash, log1.record_hash, 'Log2 previous_hash must match Log1 record_hash');

    const verification = await auditService.verifyAuditChain();
    assert.equal(verification.is_valid, true);
    assert.equal(verification.count, 2);
    assert.equal(verification.issues.length, 0);
});

test('CHAIN-02: Detects tampering if an attacker modifies a record directly in DB', async () => {
    const log1 = await auditService.logAction({
        action: 'TEST_CHAIN_TRANSFER',
        target: { type: 'Account' },
        metadata: { amount: 1000000 },
    });

    await auditService.logAction({
        action: 'TEST_CHAIN_AUDIT',
        target: { type: 'Audit' },
        metadata: { note: 'Regular audit check' },
    });

    // Simulate attacker altering record #1 amount directly in MongoDB collection
    await AuditLog.updateOne(
        { _id: log1._id },
        { $set: { 'metadata.amount': 999999999 } }
    );

    const verification = await auditService.verifyAuditChain();
    assert.equal(verification.is_valid, false, 'Chain must be detected as invalid after tampering');
    assert.ok(verification.issues.length > 0);
    assert.ok(verification.issues.some(issue => issue.issue.includes('Tampered record detected')));
});

test('CHAIN-03: Detects tampering if an attacker deletes an audit log', async () => {
    await auditService.logAction({ action: 'TEST_CHAIN_STEP_1', target: { type: 'System' } });
    const log2 = await auditService.logAction({ action: 'TEST_CHAIN_STEP_2', target: { type: 'System' } });
    await auditService.logAction({ action: 'TEST_CHAIN_STEP_3', target: { type: 'System' } });

    // Simulate attacker deleting step 2 to hide an action
    await AuditLog.deleteOne({ _id: log2._id });

    const verification = await auditService.verifyAuditChain();
    assert.equal(verification.is_valid, false, 'Chain must be detected as invalid after deletion');
    assert.ok(verification.issues.some(issue => issue.issue.includes('gap') || issue.issue.includes('Broken')));
});

test('CHAIN-04: Two-phase beginRequiredAction and completeRequiredAction maintain unbroken chain', async () => {
    const intent = await auditService.beginRequiredAction({
        action: 'TEST_CHAIN_CRITICAL_UPDATE',
        target: { type: 'Attendance', id: new mongoose.Types.ObjectId() },
        metadata: { reason: 'Sync fix' },
    });

    assert.equal(intent.metadata.outcome, 'pending');

    const finalized = await auditService.completeRequiredAction(intent._id, {
        reason: 'Sync fix',
        outcome: 'succeeded',
    });

    assert.equal(finalized, true);

    const updatedIntent = await AuditLog.findById(intent._id);
    assert.equal(updatedIntent.metadata.outcome, 'succeeded');

    const verification = await auditService.verifyAuditChain();
    assert.equal(verification.is_valid, true, 'Finalized required action chain must remain intact');
});
