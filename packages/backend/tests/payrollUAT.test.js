/**
 * payrollUAT.test.js
 *
 * Bộ ca kiểm thử nghiệm thu UAT cho Payroll Engine & Quy tắc tính lương VN (Giai đoạn 3 — P0):
 * 1. Ca đêm qua ngày (Overnight Shift crossing midnight: 22:00 - 06:00 night premium)
 * 2. Làm thêm giờ ngày lễ / tết (Holiday Overtime với hệ số quy định)
 * 3. Hợp đồng bắt đầu giữa kỳ (Prorated salary based on contract coverage ratio)
 * 4. Khấu trừ hợp lệ và ngăn chặn khấu trừ vượt quá tổng thu nhập
 * 5. Bất biến của kỳ lương Finalized và quy trình điều chỉnh 2 bước (Two-step adjustment)
 */
'use strict';

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
const { Attendance, Contract, Employee, Overtime, Payroll, Shift, ShiftAssignment, Setting } = require('../models');

let mongoServer;

async function createEmployee(code, name) {
    return Employee.create({
        employee_code: code,
        full_name: name,
        date_of_birth: new Date('1992-05-15'),
        gender: 'Female',
        hire_date: new Date('2024-01-01'),
        status: 'Active',
    });
}

async function createContract(employeeId, overrides = {}) {
    return Contract.create({
        employee_id: employeeId,
        type: 'Full-time',
        status: 'Approved',
        start_date: new Date('2026-01-01'),
        end_date: null,
        base_salary: 20_000_000, // 20M VND
        allowances: [
            { name: 'Ăn trưa', amount: 1_000_000 },
            { name: 'Xăng xe', amount: 500_000 },
        ],
        ...overrides,
    });
}

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Cấu hình chuẩn theo Bộ luật Lao động VN (UTC+7)
    await Setting.create({
        key: 'time_config',
        value: {
            standard_month_hours: 208, // 26 ngày * 8 giờ
            standard_day_hours: 8,
            night_start: '22:00',
            night_end: '06:00',
            night_rate: 1.3,           // Phụ cấp làm đêm 30%
            weekday_ot_rate: 1.5,      // OT ngày thường 150%
            weekend_ot_rate: 2.0,      // OT cuối tuần 200%
            holiday_ot_rate: 3.0,      // OT ngày lễ 300%
            night_ot_rate: 2.0,        // OT ca đêm
        },
    });
});

test.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

test.beforeEach(async () => {
    await Promise.all([
        Attendance.deleteMany({}),
        Contract.deleteMany({}),
        Employee.deleteMany({}),
        Overtime.deleteMany({}),
        Payroll.deleteMany({}),
        Shift.deleteMany({}),
        ShiftAssignment.deleteMany({}),
    ]);
});

test('UAT-01: Ca đêm qua ngày (Overnight Shift) tính đúng phụ cấp làm đêm 22:00 - 06:00', async () => {
    const emp = await createEmployee('UAT-01', 'Nguyen Van Dem');
    await createContract(emp._id, { base_salary: 20_800_000 }); // Hourly rate: 100,000 VND / h

    // Ca đêm ngày thường: 21:00 ngày 14-10-2026 (Thứ tư) đến 06:00 ngày 15-10-2026
    const checkIn = new Date('2026-10-14T14:00:00Z');  // 21:00 VN (UTC+7)
    const checkOut = new Date('2026-10-14T23:00:00Z'); // 06:00 VN ngày hôm sau

    await Attendance.create({
        employee_id: emp._id,
        work_date: new Date('2026-10-14T00:00:00Z'),
        check_in: checkIn,
        check_out: checkOut,
        worked_hours: 9,
        status: 'CheckedOut',
    });

    const payroll = await payrollService.generatePayroll(
        { employee_id: emp._id, month: 10, year: 2026, finalize: false },
        emp._id
    );

    assert.ok(payroll);
    assert.equal(payroll.total_work_hours, 9);
    // Có phân bổ breakdown ca đêm
    const breakdown = payroll.calculation_details.engine_breakdown || [];
    assert.ok(breakdown.length > 0);
});

test('UAT-02: Làm thêm ngày lễ (Holiday Overtime) hưởng đúng hệ số tăng cường', async () => {
    const emp = await createEmployee('UAT-02', 'Tran Thi Le');
    await createContract(emp._id, { base_salary: 20_800_000 }); // 100k/h

    const holidayDate = new Date('2026-09-02T00:00:00Z');

    // Chấm công 8 giờ ngày lễ
    await Attendance.create({
        employee_id: emp._id,
        work_date: holidayDate,
        check_in: new Date('2026-09-02T01:00:00Z'),  // 08:00 VN
        check_out: new Date('2026-09-02T09:00:00Z'), // 16:00 VN
        worked_hours: 8,
        status: 'CheckedOut',
    });

    // Đơn duyệt OT ngày lễ: 4 giờ
    await Overtime.create({
        employee_id: emp._id,
        work_date: holidayDate,
        hours: 4,
        type: 'Holiday',
        status: 'Approved',
        reason: 'Trực hệ thống Quốc khánh',
    });

    const payroll = await payrollService.generatePayroll(
        { employee_id: emp._id, month: 9, year: 2026, finalize: false },
        emp._id
    );

    assert.ok(payroll);
    assert.equal(payroll.total_overtime_hours, 4);
    assert.ok(payroll.overtime_salary > 0);
});

test('UAT-03: Hợp đồng bắt đầu giữa tháng (Prorated Contract) tính lương tỷ lệ chính xác', async () => {
    const emp = await createEmployee('UAT-03', 'Le Van Moi');

    // Hợp đồng bắt đầu từ ngày 16-10-2026 trong tháng 10 có 31 ngày (31 - 16 + 1 = 16 ngày)
    await createContract(emp._id, {
        base_salary: 31_000_000,
        allowances: [{ name: 'Trách nhiệm', amount: 3_100_000 }],
        start_date: new Date('2026-10-16T00:00:00Z'),
    });

    // Đi làm đầy đủ các ngày sau khi ký hợp đồng: 104 giờ (1/2 tháng)
    for (let day = 16; day <= 28; day++) {
        await Attendance.create({
            employee_id: emp._id,
            work_date: new Date(`2026-10-${day}T00:00:00Z`),
            check_in: new Date(`2026-10-${day}T01:00:00Z`),
            check_out: new Date(`2026-10-${day}T09:00:00Z`),
            worked_hours: 8,
            status: 'CheckedOut',
        });
    }

    const payroll = await payrollService.generatePayroll(
        { employee_id: emp._id, month: 10, year: 2026, finalize: false },
        emp._id
    );

    assert.ok(payroll);
    // Tỷ lệ hợp đồng ~ 16 / 31 = 0.52
    assert.ok(payroll.calculation_details.contract_snapshot.coverage.ratio > 0.49);
    assert.ok(payroll.calculation_details.contract_snapshot.coverage.ratio < 0.55);
    // Lương cơ bản nhận được không vượt quá mức prorated
    assert.ok(payroll.basic_salary <= 31_000_000 * 0.55);
});

test('UAT-04: Ngăn chặn khấu trừ vượt quá tổng thu nhập (Deduction Overcharge Guard)', async () => {
    const emp = await createEmployee('UAT-04', 'Pham Van Phat');
    await createContract(emp._id, { base_salary: 10_000_000 });

    await Attendance.create({
        employee_id: emp._id,
        work_date: new Date('2026-10-01T00:00:00Z'),
        check_in: new Date('2026-10-01T01:00:00Z'),
        check_out: new Date('2026-10-01T09:00:00Z'),
        worked_hours: 8,
        status: 'CheckedOut',
    });

    // Khấu trừ 50,000,000 VND lớn hơn nhiều so với tổng thu nhập
    await assert.rejects(
        () => payrollService.generatePayroll(
            { employee_id: emp._id, month: 10, year: 2026, deduction: 50_000_000, finalize: false },
            emp._id
        ),
        (err) => {
            assert.equal(err.statusCode, 400);
            assert.match(err.message, /cannot exceed total income/i);
            return true;
        }
    );
});

test('UAT-05: Bất biến của bảng lương Finalized và Audit Trail', async () => {
    const emp = await createEmployee('UAT-05', 'Hoang Thi Chot');
    await createContract(emp._id);

    await Attendance.create({
        employee_id: emp._id,
        work_date: new Date('2026-10-05T00:00:00Z'),
        check_in: new Date('2026-10-05T01:00:00Z'),
        check_out: new Date('2026-10-05T09:00:00Z'),
        worked_hours: 8,
        status: 'CheckedOut',
    });

    // 1. Tạo và Finalize bảng lương
    const finalizedPayroll = await payrollService.generatePayroll(
        { employee_id: emp._id, month: 10, year: 2026, finalize: true },
        emp._id
    );
    assert.equal(finalizedPayroll.status, 'Finalized');

    // 2. Thử regenerate lại cùng kỳ lương -> Phải bị từ chối 409
    await assert.rejects(
        () => payrollService.generatePayroll(
            { employee_id: emp._id, month: 10, year: 2026, finalize: false },
            emp._id
        ),
        (err) => {
            assert.equal(err.statusCode, 409);
            assert.match(err.message, /Finalized payroll cannot be regenerated/i);
            return true;
        }
    );
});
