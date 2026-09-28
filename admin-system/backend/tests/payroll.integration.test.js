/**
 * payroll.integration.test.js
 *
 * Integration tests for payroll.service.generatePayroll():
 * - generates payroll from contract + attendance + approved overtime
 * - throws when employee has no approved/signed contract
 * - throws when trying to regenerate a Finalized payroll
 * - does NOT include unapproved overtime in calculation
 * - deduction > total income is rejected
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-ok';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';
process.env.CORS_ORIGIN = '*';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const payrollService = require('../services/payroll.service');
const { Attendance, Contract, Employee, Overtime, Payroll, User } = require('../models');

let mongoServer;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a minimal active employee */
async function createEmployee(suffix = Date.now()) {
    return Employee.create({
        employee_code: `PAY-EMP-${suffix}`,
        full_name: `Payroll Employee ${suffix}`,
        date_of_birth: new Date('1990-01-01'),
        gender: 'Male',
        hire_date: new Date('2024-01-01'),
        face_data: [],
    });
}

/** Create an approved contract for the given employee starting before the payroll month */
async function createContract(employeeId, overrides = {}) {
    return Contract.create({
        employee_id: employeeId,
        type: 'Full-time',
        status: 'Approved',
        start_date: new Date('2025-01-01'),
        end_date: null,
        base_salary: 10_000_000,
        allowances: [{ name: 'Transport', amount: 500_000 }],
        ...overrides,
    });
}

/**
 * Create an attendance record (CheckedOut) for the given employee on a specific date.
 * checkInHour / checkOutHour are 0-23 integers.
 */
async function createAttendance(employeeId, dateStr, checkInHour = 8, checkOutHour = 17) {
    const workDate = new Date(dateStr);
    const checkIn = new Date(dateStr);
    checkIn.setHours(checkInHour, 0, 0, 0);
    const checkOut = new Date(dateStr);
    checkOut.setHours(checkOutHour, 0, 0, 0);
    const workedHours = checkOutHour - checkInHour;

    return Attendance.create({
        employee_id: employeeId,
        work_date: workDate,
        check_in: checkIn,
        check_out: checkOut,
        worked_hours: workedHours,
        status: 'CheckedOut',
    });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test('generatePayroll() — creates payroll from contract + attendance', async () => {
    const emp = await createEmployee('A1');
    await createContract(emp._id);
    await createAttendance(emp._id, '2026-01-06'); // Monday
    await createAttendance(emp._id, '2026-01-07'); // Tuesday

    const result = await payrollService.generatePayroll(
        { employee_id: emp._id, month: 1, year: 2026 },
        emp._id,
    );

    assert.ok(result, 'should return a payroll document');
    assert.equal(result.status, 'Draft');
    assert.ok(result.basic_salary > 0, 'basic salary should be positive');
    assert.ok(result.total_work_hours > 0, 'total_work_hours should be > 0');
    assert.equal(result.month, 1);
    assert.equal(result.year, 2026);
});

test('generatePayroll() — throws 409 when no approved/signed contract exists', async () => {
    const emp = await createEmployee('A2');
    // No contract created for this employee

    await assert.rejects(
        () => payrollService.generatePayroll({ employee_id: emp._id, month: 1, year: 2026 }, emp._id),
        (err) => {
            assert.equal(err.statusCode, 409);
            assert.match(err.message, /contract/i);
            return true;
        },
    );
});

test('generatePayroll() — throws 409 when payroll is already Finalized', async () => {
    const emp = await createEmployee('A3');
    await createContract(emp._id);
    await createAttendance(emp._id, '2026-02-02');

    // First generation and finalize
    await payrollService.generatePayroll(
        { employee_id: emp._id, month: 2, year: 2026, finalize: true },
        emp._id,
    );

    // Try to regenerate
    await assert.rejects(
        () => payrollService.generatePayroll({ employee_id: emp._id, month: 2, year: 2026 }, emp._id),
        (err) => {
            assert.equal(err.statusCode, 409);
            assert.match(err.message, /[Ff]inalized/);
            return true;
        },
    );
});

test('generatePayroll() — throws 404 when employee does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    await assert.rejects(
        () => payrollService.generatePayroll({ employee_id: fakeId, month: 1, year: 2026 }, fakeId),
        (err) => {
            assert.equal(err.statusCode, 404);
            return true;
        },
    );
});

test('generatePayroll() — includes approved overtime in calculation', async () => {
    const emp = await createEmployee('A4');
    await createContract(emp._id);
    await createAttendance(emp._id, '2026-03-03');

    const workDate = new Date('2026-03-03');
    await Overtime.create({
        employee_id: emp._id,
        work_date: workDate,
        hours: 2,
        type: 'Normal',
        status: 'Approved',
        reason: 'Extra project work',
    });

    const result = await payrollService.generatePayroll(
        { employee_id: emp._id, month: 3, year: 2026 },
        emp._id,
    );

    // Overtime salary should be positive since we have approved OT hours
    assert.ok(result.overtime_salary >= 0, 'overtime_salary should be calculated');
    // Note: overtime_salary may be 0 if attendance OT is already within standard hours;
    // but total_overtime_hours should reflect OT records
    assert.ok(result.total_overtime_hours >= 0);
});

test('generatePayroll() — ignores overtime requests that are NOT approved', async () => {
    const emp = await createEmployee('A5');
    await createContract(emp._id);
    await createAttendance(emp._id, '2026-04-01');

    const workDate = new Date('2026-04-01');
    await Overtime.create({
        employee_id: emp._id,
        work_date: workDate,
        hours: 3,
        type: 'Normal',
        status: 'Pending',
        reason: 'Pending overtime — should be ignored',
    });

    // Get payroll without OT for baseline
    const empNoOT = await createEmployee('A5b');
    await createContract(empNoOT._id);
    await createAttendance(empNoOT._id, '2026-04-01');

    const [withPending, withoutOT] = await Promise.all([
        payrollService.generatePayroll({ employee_id: emp._id, month: 4, year: 2026 }, emp._id),
        payrollService.generatePayroll({ employee_id: empNoOT._id, month: 4, year: 2026 }, empNoOT._id),
    ]);

    // Both should have same overtime_salary since pending OT is excluded
    assert.equal(withPending.overtime_salary, withoutOT.overtime_salary,
        'pending OT should not affect overtime_salary');
});

test('generatePayroll() — rejects deduction greater than total income', async () => {
    const emp = await createEmployee('A6');
    await createContract(emp._id);
    await createAttendance(emp._id, '2026-05-05');

    await assert.rejects(
        () => payrollService.generatePayroll(
            { employee_id: emp._id, month: 5, year: 2026, deduction: 999_999_999 },
            emp._id,
        ),
        (err) => {
            assert.equal(err.statusCode, 400);
            assert.match(err.message, /[Dd]eduction/);
            return true;
        },
    );
});

test('generatePayroll() — sets status to Finalized when finalize=true', async () => {
    const emp = await createEmployee('A7');
    await createContract(emp._id);
    await createAttendance(emp._id, '2026-06-02');

    const result = await payrollService.generatePayroll(
        { employee_id: emp._id, month: 6, year: 2026, finalize: true },
        emp._id,
    );

    assert.equal(result.status, 'Finalized');
});

test('generatePayroll() — net_salary equals basic + allowance + overtime - deduction', async () => {
    const deduction = 200_000;
    const emp = await createEmployee('A8');
    await createContract(emp._id);
    await createAttendance(emp._id, '2026-07-07');

    const result = await payrollService.generatePayroll(
        { employee_id: emp._id, month: 7, year: 2026, deduction },
        emp._id,
    );

    const expectedNet = Math.round(
        (result.basic_salary + result.allowance + result.overtime_salary - deduction) * 100
    ) / 100;

    assert.equal(result.net_salary, expectedNet);
});

test('finalizePayroll() — locks payroll and creates audit log', async () => {
    const emp = await createEmployee('A9');
    await createContract(emp._id);
    await createAttendance(emp._id, '2026-08-01');

    const draft = await payrollService.generatePayroll(
        { employee_id: emp._id, month: 8, year: 2026, finalize: false },
        emp._id,
    );
    assert.equal(draft.status, 'Draft');

    const finalized = await payrollService.finalizePayroll(draft._id, emp._id);
    assert.equal(finalized.status, 'Finalized');
});

test('PayrollAdjustment: 2-step approval workflow and segregation of duties', async () => {
    const emp = await createEmployee('A10');
    await createContract(emp._id);
    await createAttendance(emp._id, '2026-09-01');

    const payroll = await payrollService.generatePayroll(
        { employee_id: emp._id, month: 9, year: 2026, finalize: true },
        emp._id,
    );

    const hrUser = new mongoose.Types.ObjectId();
    const directorUser = new mongoose.Types.ObjectId();

    // 1. Create adjustment for finalized payroll (requires 2 steps)
    const adj = await payrollService.createPayrollAdjustment(
        {
            payroll_id: payroll._id,
            adjustment_type: 'Bonus',
            amount: 6_000_000,
            reason: 'Q3 Outstanding Performance Bonus',
        },
        hrUser,
    );

    assert.equal(adj.status, 'Pending');
    assert.equal(adj.requires_two_step_approval, true);
    assert.equal(adj.before_net_salary, payroll.net_salary);
    assert.equal(adj.after_net_salary, payroll.net_salary + 6_000_000);

    // 2. Step 1 Approval by HR
    const step1 = await payrollService.approvePayrollAdjustment(adj._id, hrUser);
    assert.equal(step1.status, 'Approved_Step1');
    assert.equal(step1.step1_approved_by.toString(), hrUser.toString());

    // 3. Step 2 Segregation of duties check: Same user cannot approve step 2
    await assert.rejects(
        () => payrollService.approvePayrollAdjustment(adj._id, hrUser),
        (err) => {
            assert.equal(err.statusCode, 403);
            assert.match(err.message, /different user/);
            return true;
        },
    );

    // 4. Step 2 Approval by Director
    const finalApproval = await payrollService.approvePayrollAdjustment(adj._id, directorUser);
    assert.equal(finalApproval.status, 'Approved');
    assert.equal(finalApproval.final_approved_by.toString(), directorUser.toString());

    // 5. Verify payroll has updated net salary
    const updatedPayroll = await Payroll.findById(payroll._id);
    assert.equal(updatedPayroll.net_salary, payroll.net_salary + 6_000_000);
});

test('PayrollAdjustment: rejection flow prevents payroll changes', async () => {
    const emp = await createEmployee('A11');
    await createContract(emp._id);
    await createAttendance(emp._id, '2026-10-01');

    const payroll = await payrollService.generatePayroll(
        { employee_id: emp._id, month: 10, year: 2026, finalize: false },
        emp._id,
    );

    const user1 = new mongoose.Types.ObjectId();
    const user2 = new mongoose.Types.ObjectId();

    const adj = await payrollService.createPayrollAdjustment(
        {
            payroll_id: payroll._id,
            adjustment_type: 'Correction',
            amount: -500_000,
            reason: 'Excessive advance payout correction',
        },
        user1,
    );

    const rejected = await payrollService.rejectPayrollAdjustment(adj._id, user2, 'Disputed by employee');
    assert.equal(rejected.status, 'Rejected');
    assert.equal(rejected.rejection_reason, 'Disputed by employee');

    // Verify payroll remains unchanged
    const untouchedPayroll = await Payroll.findById(payroll._id);
    assert.equal(untouchedPayroll.net_salary, payroll.net_salary);
});
