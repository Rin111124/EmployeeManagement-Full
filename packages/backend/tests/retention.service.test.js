process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-ok';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';
process.env.CORS_ORIGIN = '*';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
    purgeTerminatedBiometrics,
    purgeExpiredAuditLogs,
    handleSubjectAccessRequest,
    handleSubjectErasureRequest,
} = require('../services/retention.service');

const { Employee, AuditLog, Contract } = require('../models');

let mongoServer;

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

test.afterEach(async () => {
    await Employee.deleteMany({});
    await AuditLog.deleteMany({});
    await Contract.deleteMany({});
});

test('Retention: purgeTerminatedBiometrics wipes face data only for terminated employees', async () => {
    const activeEmp = await Employee.create({
        employee_code: 'ACT-001',
        full_name: 'Active Employee',
        date_of_birth: new Date('1992-01-01'),
        gender: 'Male',
        hire_date: new Date('2024-01-01'),
        status: 'Active',
        face_data: [{ label: 'front', embedding: [0.1, 0.2] }],
    });

    const termEmp = await Employee.create({
        employee_code: 'TRM-001',
        full_name: 'Terminated Employee',
        date_of_birth: new Date('1990-05-05'),
        gender: 'Female',
        hire_date: new Date('2023-01-01'),
        status: 'Terminated',
        face_data: [{ label: 'front', embedding: [0.5, 0.6] }],
    });

    const result = await purgeTerminatedBiometrics(new mongoose.Types.ObjectId());
    assert.equal(result.purged_count, 1);
    assert.equal(result.employee_ids[0].toString(), termEmp._id.toString());

    // Verify terminated employee face data is cleared
    const updatedTerm = await Employee.findById(termEmp._id);
    assert.equal(updatedTerm.face_data.length, 0);

    // Verify active employee face data is retained
    const updatedActive = await Employee.findById(activeEmp._id);
    assert.equal(updatedActive.face_data.length, 1);
});

test('Retention: purgeExpiredAuditLogs deletes logs older than retention cutoff', async () => {
    const oldDate = new Date(Date.now() - 800 * 24 * 60 * 60 * 1000); // 800 days ago
    const recentDate = new Date();

    await AuditLog.create([
        { action: 'TEST_OLD', target: { type: 'System' }, timestamp: oldDate },
        { action: 'TEST_RECENT', target: { type: 'System' }, timestamp: recentDate },
    ]);

    const result = await purgeExpiredAuditLogs(730);
    assert.equal(result.deleted_count, 1);

    const remaining = await AuditLog.find({});
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].action, 'TEST_RECENT');
});

test('Subject Rights: handleSubjectAccessRequest returns masked PII and history', async () => {
    const emp = await Employee.create({
        employee_code: 'SAR-001',
        full_name: 'Nguyen Van B',
        date_of_birth: new Date('1995-03-15'),
        gender: 'Male',
        hire_date: new Date('2024-02-01'),
        status: 'Active',
        identity: { number: '001201009999' },
        bank_accounts: [{ bank_name: 'VCB', account_number: '1234567890' }],
    });

    const sarResult = await handleSubjectAccessRequest(emp._id, new mongoose.Types.ObjectId());
    assert.equal(sarResult.employee.employee_code, 'SAR-001');
    assert.equal(sarResult.employee.identity.number, '********9999');
    assert.equal(sarResult.employee.bank_accounts[0].account_number, '******7890');
});

test('Subject Rights: handleSubjectErasureRequest erases biometrics and anonymizes PII', async () => {
    const emp = await Employee.create({
        employee_code: 'DEL-001',
        full_name: 'Sensitive User',
        date_of_birth: new Date('1993-07-20'),
        gender: 'Female',
        hire_date: new Date('2024-01-01'),
        status: 'Active',
        contact: { email: 'user@example.com', phone: '0912345678' },
        face_data: [{ label: 'front', embedding: [0.9, 0.8] }],
    });

    const erasureResult = await handleSubjectErasureRequest(emp._id, new mongoose.Types.ObjectId());
    assert.equal(erasureResult.success, true);

    const erased = await Employee.findById(emp._id);
    assert.equal(erased.face_data.length, 0);
    assert.equal(erased.full_name, 'Anonymized DEL-001');
    assert.equal(erased.contact.phone, null);
    assert.equal(erased.status, 'Terminated');
});
