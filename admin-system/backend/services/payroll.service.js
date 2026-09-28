const {
    Attendance,
    Contract,
    Employee,
    Overtime,
    Payroll,
    Setting,
    ShiftAssignment,
} = require('../models');
const { REQUEST_STATUS } = require('../constants/workflow');
const AppError = require('../utils/AppError');
const { monthRange } = require('../utils/date');

const DEFAULT_STANDARD_MONTH_HOURS = 176;
const DEFAULT_OVERTIME_RATE = 1.5;
const PAYROLL_CONTRACT_STATUSES = ['Approved', 'Signed'];

async function generatePayroll(payload, actorId) {
    const {
        employee_id,
        month,
        year,
        deduction = 0,
        standard_month_hours = DEFAULT_STANDARD_MONTH_HOURS,
        overtime_rate = DEFAULT_OVERTIME_RATE,
        finalize = false,
        engineConfig = {},
    } = payload;

    const employee = await Employee.findById(employee_id);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    const { start, end } = monthRange(year, month);
    const existingPayroll = await Payroll.findOne({ employee_id, month, year });
    if (existingPayroll?.status === 'Finalized') {
        throw new AppError('Finalized payroll cannot be regenerated', 409);
    }

    const contract = await Contract.findOne({
        employee_id,
        status: { $in: PAYROLL_CONTRACT_STATUSES },
        start_date: { $lte: end },
        $or: [
            { end_date: null },
            { end_date: { $gte: start } },
        ],
    }).sort({ start_date: -1 });

    if (!contract) {
        throw new AppError('Approved or signed contract not found for payroll period', 409);
    }

    const contractCoverage = getContractCoverage(contract, start, end);
    const contractSnapshot = buildContractSnapshot(contract, contractCoverage);

    const timeConfig = await Setting.findOne({ key: 'time_config' });
    const dynamicConfig = timeConfig && timeConfig.value ? timeConfig.value : {};
    
    const PayrollEngine = require('./payrollEngine');
    const engine = new PayrollEngine({ ...dynamicConfig, ...engineConfig });

    const [attendanceRecords, overtimeRecords, assignments] = await Promise.all([
        Attendance.find({
            employee_id,
            work_date: { $gte: start, $lte: end },
            status: 'CheckedOut',
        }),
        Overtime.find({
            employee_id,
            work_date: { $gte: start, $lte: end },
            status: REQUEST_STATUS.APPROVED,
        }),
        ShiftAssignment.find({
            employee_id,
            work_date: { $gte: start, $lte: end },
        }).populate('shift_id'),
    ]);

    const shiftMap = {};
    assignments.forEach(a => {
        const key = new Date(a.work_date).toDateString();
        shiftMap[key] = a.shift_id;
    });

    const approvedOTByDate = {};
    overtimeRecords.forEach(ot => {
        const key = new Date(ot.work_date).toDateString();
        approvedOTByDate[key] = (approvedOTByDate[key] || 0) + (ot.hours || 0);
    });

    const totalWorkHours = roundMoney(attendanceRecords.reduce((sum, item) => sum + (item.worked_hours || 0), 0));
    const totalOvertimeHours = roundMoney(overtimeRecords.reduce((sum, item) => sum + (item.hours || 0), 0));
    const coveredStandardHours = roundMoney(standard_month_hours * contractCoverage.ratio);
    const payableRegularHours = Math.min(totalWorkHours, coveredStandardHours);
    const attendanceRatio = coveredStandardHours > 0 ? payableRegularHours / coveredStandardHours : 0;
    const contractBasicSalary = roundMoney(contract.base_salary * contractCoverage.ratio);
    const contractAllowance = roundMoney((contract.allowances || []).reduce((sum, item) => sum + (item.amount || 0), 0) * contractCoverage.ratio);
    const basicSalary = roundMoney(contractBasicSalary * attendanceRatio);
    const allowance = roundMoney(contractAllowance * attendanceRatio);
    const hourlyRate = standard_month_hours > 0 ? contract.base_salary / standard_month_hours : 0;
    
    // Generate shifts for Payroll Engine
    let engineShifts = [];
    const attendanceByDate = {};

    attendanceRecords.forEach(att => {
        if (att.check_in && att.check_out) {
            const dateKey = new Date(att.work_date).toDateString();
            attendanceByDate[dateKey] = att;

            const date = new Date(att.check_in);
            const dayOfWeek = date.getDay();
            engineShifts.push({
                startTime: att.check_in,
                endTime: att.check_out,
                dayType: (dayOfWeek === 0 || dayOfWeek === 6) ? 'Weekend' : 'Normal',
                shiftConfig: shiftMap[dateKey] || null,
                allowedOTMins: (approvedOTByDate[dateKey] || 0) * 60
            });
        }
    });

    // Handle Overtime records:
    // If there is an attendance record for the same day, the OT is likely ALREADY included in the duration.
    // We only add a separate OT shift if there's no attendance record (e.g., manual OT on day off).
    overtimeRecords.forEach(ot => {
        const dateKey = new Date(ot.work_date).toDateString();
        
        if (!attendanceByDate[dateKey]) {
            // Case: No attendance at Kiosk, but approved OT record exists.
            // We treat this as a separate shift.
            const otStart = new Date(ot.work_date);
            otStart.setHours(17, 0, 0, 0); // Fallback: 17:00
            const otEnd = new Date(otStart.getTime() + (ot.hours || 0) * 3600000);
            
            let dayType = 'Normal';
            if (ot.type === 'Weekend') dayType = 'Weekend';
            if (ot.type === 'Holiday') dayType = 'Holiday';

            engineShifts.push({
                startTime: otStart,
                endTime: otEnd,
                dayType,
                allowedOTMins: (ot.hours || 0) * 60
            });
        }
    });

    const engineResult = engine.calculate(hourlyRate, engineShifts);

    // Dynamic OT Calculation based on Engine breakdown
    let overtimeSalary = 0;
    let engineOvertimeHours = 0;
    engineResult.detailedBreakdown.forEach(b => {
        if (b.category.includes('_ot')) {
            overtimeSalary += b.amount;
            engineOvertimeHours += b.hours;
        }
    });
    
    // Safety check: Ensure OT salary doesn't exceed total income if engine breakdown is complex
    overtimeSalary = Math.min(overtimeSalary, engineResult.totalIncome);

    // Guard: deduction không được vượt quá tổng thu nhập
    const totalIncome = roundMoney(basicSalary + allowance + overtimeSalary);
    if (deduction > totalIncome) {
        throw new AppError(
            `Deduction (${deduction}) cannot exceed total income (${totalIncome})`,
            400,
        );
    }

    const netSalary = roundMoney(totalIncome - deduction);

    const payroll = await Payroll.findOneAndUpdate(
        { employee_id, month, year },
        {
            employee_id,
            month,
            year,
            total_work_hours: totalWorkHours,
            total_overtime_hours: engineOvertimeHours,
            basic_salary: basicSalary,
            overtime_salary: overtimeSalary,
            allowance,
            deduction,
            net_salary: netSalary,
            status: finalize ? 'Finalized' : 'Draft',
            generated_at: new Date(),
            generated_by: actorId,
            calculation_details: {
                contract_id: contract._id,
                contract_snapshot: contractSnapshot,
                standard_month_hours,
                overtime_rate,
                attendance_record_count: attendanceRecords.length,
                overtime_record_count: overtimeRecords.length,
                covered_standard_hours: coveredStandardHours,
                payable_regular_hours: payableRegularHours,
                attendance_ratio: roundMoney(attendanceRatio),
                contract_basic_salary: contractBasicSalary,
                contract_allowance: contractAllowance,
                hourly_rate: roundMoney(hourlyRate),
                engine_breakdown: engineResult.detailedBreakdown,
            },
        },
        {
            upsert: true,
            returnDocument: 'after',
            runValidators: true,
        },
    ).populate('employee_id generated_by');

    return payroll;
}

function roundMoney(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

function startOfDate(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function daysInclusive(start, end) {
    const startDate = startOfDate(start);
    const endDate = startOfDate(end);
    return Math.max(0, Math.floor((endDate - startDate) / 86400000) + 1);
}

function getContractCoverage(contract, periodStart, periodEnd) {
    const effectiveStart = new Date(Math.max(startOfDate(contract.start_date).getTime(), startOfDate(periodStart).getTime()));
    const effectiveEnd = contract.end_date
        ? new Date(Math.min(startOfDate(contract.end_date).getTime(), startOfDate(periodEnd).getTime()))
        : startOfDate(periodEnd);
    const periodDays = daysInclusive(periodStart, periodEnd);
    const coveredDays = daysInclusive(effectiveStart, effectiveEnd);
    const ratio = periodDays > 0 ? Math.min(1, Math.max(0, coveredDays / periodDays)) : 0;

    return {
        period_start: periodStart,
        period_end: periodEnd,
        effective_start: effectiveStart,
        effective_end: effectiveEnd,
        period_days: periodDays,
        covered_days: coveredDays,
        ratio: roundMoney(ratio),
    };
}

function buildContractSnapshot(contract, coverage) {
    return {
        id: contract._id,
        type: contract.type,
        status: contract.status,
        start_date: contract.start_date,
        end_date: contract.end_date,
        base_salary: contract.base_salary,
        allowances: (contract.allowances || []).map((item) => ({
            name: item.name,
            amount: item.amount,
        })),
        coverage,
    };
}

async function finalizePayroll(payrollId, actorId, req) {
    const { logAction } = require('./audit.service');
    const { AUDIT_ACTIONS } = require('../constants/auditActions');

    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
        throw new AppError('Payroll record not found', 404);
    }
    if (payroll.status === 'Finalized') {
        return payroll;
    }
    payroll.status = 'Finalized';
    await payroll.save();

    await logAction({
        userId: actorId,
        action: AUDIT_ACTIONS.PAYROLL_FINALIZE,
        target: `Payroll:${payroll._id}`,
        metadata: {
            payroll_id: payroll._id,
            employee_id: payroll.employee_id,
            month: payroll.month,
            year: payroll.year,
            net_salary: payroll.net_salary,
        },
        req,
    });

    return payroll;
}

async function createPayrollAdjustment(payload, actorId, req) {
    const { PayrollAdjustment } = require('../models');
    const { logAction } = require('./audit.service');
    const { AUDIT_ACTIONS } = require('../constants/auditActions');

    const {
        payroll_id,
        adjustment_type = 'Correction',
        amount,
        reason,
    } = payload;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
        throw new AppError('Adjustment reason is required', 400);
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount === 0) {
        throw new AppError('Adjustment amount must be a non-zero number', 400);
    }

    const payroll = await Payroll.findById(payroll_id);
    if (!payroll) {
        throw new AppError('Payroll record not found', 404);
    }

    const beforeNetSalary = payroll.net_salary;
    const afterNetSalary = roundMoney(beforeNetSalary + numAmount);
    if (afterNetSalary < 0) {
        throw new AppError(`Adjustment would result in negative net salary (${afterNetSalary})`, 400);
    }

    // Require 2-step approval if absolute adjustment >= 5,000,000 VND or if payroll is already Finalized
    const requiresTwoStep = Math.abs(numAmount) >= 5000000 || payroll.status === 'Finalized';

    const adjustment = await PayrollAdjustment.create({
        payroll_id,
        employee_id: payroll.employee_id,
        adjustment_type,
        amount: numAmount,
        reason: reason.trim(),
        status: 'Pending',
        requires_two_step_approval: requiresTwoStep,
        created_by: actorId,
        before_net_salary: beforeNetSalary,
        after_net_salary: afterNetSalary,
    });

    await logAction({
        userId: actorId,
        action: AUDIT_ACTIONS.PAYROLL_ADJUSTMENT_CREATE,
        target: `PayrollAdjustment:${adjustment._id}`,
        metadata: {
            adjustment_id: adjustment._id,
            payroll_id,
            employee_id: payroll.employee_id,
            adjustment_type,
            amount: numAmount,
            reason: reason.trim(),
            requires_two_step_approval: requiresTwoStep,
        },
        req,
    });

    return adjustment;
}

async function approvePayrollAdjustment(adjustmentId, actorId, req) {
    const { PayrollAdjustment } = require('../models');
    const { logAction } = require('./audit.service');
    const { AUDIT_ACTIONS } = require('../constants/auditActions');

    const adjustment = await PayrollAdjustment.findById(adjustmentId);
    if (!adjustment) {
        throw new AppError('Payroll adjustment not found', 404);
    }

    if (adjustment.status === 'Approved' || adjustment.status === 'Rejected') {
        throw new AppError(`Adjustment is already in final state: ${adjustment.status}`, 400);
    }

    if (adjustment.requires_two_step_approval && adjustment.status === 'Pending') {
        // Step 1 approval
        adjustment.status = 'Approved_Step1';
        adjustment.step1_approved_by = actorId;
        adjustment.step1_approved_at = new Date();
        await adjustment.save();

        await logAction({
            userId: actorId,
            action: AUDIT_ACTIONS.PAYROLL_ADJUSTMENT_APPROVE_STEP1,
            target: `PayrollAdjustment:${adjustment._id}`,
            metadata: { adjustment_id: adjustment._id, step: 1 },
            req,
        });

        return adjustment;
    }

    // Final approval step
    if (adjustment.requires_two_step_approval) {
        if (adjustment.step1_approved_by && adjustment.step1_approved_by.toString() === actorId.toString()) {
            throw new AppError('Second approval must be performed by a different user (Two-step segregation)', 403);
        }
    }

    adjustment.status = 'Approved';
    adjustment.final_approved_by = actorId;
    adjustment.final_approved_at = new Date();
    adjustment.applied_at = new Date();
    await adjustment.save();

    // Apply adjustment to payroll record
    const payroll = await Payroll.findById(adjustment.payroll_id);
    if (payroll) {
        payroll.net_salary = adjustment.after_net_salary;
        if (adjustment.amount > 0) {
            payroll.allowance = roundMoney((payroll.allowance || 0) + adjustment.amount);
        } else {
            payroll.deduction = roundMoney((payroll.deduction || 0) + Math.abs(adjustment.amount));
        }
        await payroll.save();
    }

    await logAction({
        userId: actorId,
        action: AUDIT_ACTIONS.PAYROLL_ADJUSTMENT_APPROVE_FINAL,
        target: `PayrollAdjustment:${adjustment._id}`,
        metadata: {
            adjustment_id: adjustment._id,
            payroll_id: adjustment.payroll_id,
            applied_amount: adjustment.amount,
            new_net_salary: adjustment.after_net_salary,
        },
        req,
    });

    return adjustment;
}

async function rejectPayrollAdjustment(adjustmentId, actorId, reason, req) {
    const { PayrollAdjustment } = require('../models');
    const { logAction } = require('./audit.service');
    const { AUDIT_ACTIONS } = require('../constants/auditActions');

    const adjustment = await PayrollAdjustment.findById(adjustmentId);
    if (!adjustment) {
        throw new AppError('Payroll adjustment not found', 404);
    }

    if (adjustment.status === 'Approved' || adjustment.status === 'Rejected') {
        throw new AppError(`Adjustment is already in final state: ${adjustment.status}`, 400);
    }

    adjustment.status = 'Rejected';
    adjustment.rejected_by = actorId;
    adjustment.rejection_reason = reason || 'Rejected by approver';
    await adjustment.save();

    await logAction({
        userId: actorId,
        action: AUDIT_ACTIONS.PAYROLL_ADJUSTMENT_REJECT,
        target: `PayrollAdjustment:${adjustment._id}`,
        metadata: {
            adjustment_id: adjustment._id,
            reason: adjustment.rejection_reason,
        },
        req,
    });

    return adjustment;
}

module.exports = {
    generatePayroll,
    finalizePayroll,
    createPayrollAdjustment,
    approvePayrollAdjustment,
    rejectPayrollAdjustment,
};
