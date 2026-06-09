const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const { Employee, Department, EmployeePosition, Shift, ShiftAssignment, Attendance, Overtime, Contract, Payroll, LeaveRequest, User, Training } = require('../models');
const { REQUEST_STATUS } = require('../constants/workflow');
const buildDemoSeedData = require('./seedDemo.data');

function toDate(value) {
    return value ? new Date(value) : null;
}

function asObjectId(value) {
    return value ? value._id : null;
}

async function resetCollections() {
    await Promise.all([
        Employee.deleteMany({}),
        Department.deleteMany({}),
        EmployeePosition.deleteMany({}),
        Shift.deleteMany({}),
        ShiftAssignment.deleteMany({}),
        Attendance.deleteMany({}),
        Overtime.deleteMany({}),
        Contract.deleteMany({}),
        Payroll.deleteMany({}),
        LeaveRequest.deleteMany({}),
        User.deleteMany({}),
        Training.deleteMany({}),
    ]);
}

async function seedDemo() {
    await connectDB();

    const data = buildDemoSeedData();

    await resetCollections();

    const departmentDocs = await Department.insertMany(
        data.departments.map((department) => ({
            department_name: department.department_name,
            parent_id: null,
        }))
    );

    const departmentByName = new Map(departmentDocs.map((item) => [item.department_name, item]));

    for (const department of data.departments) {
        if (department.parent_name) {
            const child = departmentByName.get(department.department_name);
            child.parent_id = asObjectId(departmentByName.get(department.parent_name));
            await child.save();
        }
    }

    const shiftDocs = await Shift.insertMany(data.shifts);
    const shiftByName = new Map(shiftDocs.map((item) => [item.shift_name, item]));

    const adminEmployee = await Employee.create({
        employee_code: 'ADMIN001',
        full_name: 'System Administrator',
        date_of_birth: new Date('1990-01-01'),
        gender: 'Other',
        position: 'System Administrator',
        department: 'System',
        hire_date: new Date('2024-01-01'),
        status: 'Active',
        contact: {
            email: 'admin@industrialhr.local',
        },
    });

    const employeeDocs = await Employee.insertMany(
        data.employees.map((employee) => ({
            ...employee,
            date_of_birth: toDate(employee.date_of_birth),
            hire_date: toDate(employee.hire_date),
        }))
    );

    const employeeByCode = new Map([[adminEmployee.employee_code, adminEmployee], ...employeeDocs.map((item) => [item.employee_code, item])]);

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        throw new Error('ADMIN_PASSWORD is required when seeding demo data');
    }

    const demoPasswordHash = await bcrypt.hash('password123', 12);
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

    const users = data.users.map((user) => ({
        employee_id: asObjectId(employeeByCode.get(user.employee_code) || adminEmployee),
        username: user.username,
        password_hash: user.username === 'admin' ? adminPasswordHash : demoPasswordHash,
        roles: user.roles,
        is_active: true,
    }));

    const userDocs = await User.insertMany(users);
    const adminUser = userDocs.find((item) => item.username === 'admin') || userDocs[0];

    await EmployeePosition.insertMany(
        data.employeePositions.map((position) => ({
            employee_id: asObjectId(employeeByCode.get(position.employee_code)),
            department_id: asObjectId(departmentByName.get(position.department_name)),
            position_name: position.position_name,
            start_date: toDate(position.start_date),
            end_date: toDate(position.end_date),
            is_current: position.is_current,
        }))
    );

    await Contract.insertMany(
        data.contracts.map((contract) => ({
            employee_id: asObjectId(employeeByCode.get(contract.employee_code)),
            type: contract.type,
            start_date: toDate(contract.start_date),
            end_date: toDate(contract.end_date),
            base_salary: contract.base_salary,
            allowances: contract.allowances,
        }))
    );

    await ShiftAssignment.insertMany(
        data.shiftAssignments.map((assignment) => ({
            employee_id: asObjectId(employeeByCode.get(assignment.employee_code)),
            shift_id: asObjectId(shiftByName.get(assignment.shift_name)),
            work_date: assignment.work_date,
        }))
    );

    await Attendance.insertMany(
        data.attendance.map((record) => ({
            employee_id: asObjectId(employeeByCode.get(record.employee_code)),
            shift_id: asObjectId(shiftByName.get(record.shift_name || 'Morning Shift')),
            work_date: record.work_date,
            check_in: record.check_in,
            check_out: record.check_out,
            worked_hours: record.worked_hours,
            late_minutes: record.late_minutes,
            status: record.status,
            method: record.method,
            device_id: null,
            check_in_face_image: record.check_in_face_image,
            check_out_face_image: record.check_out_face_image,
        }))
    );

    await Overtime.insertMany(
        data.overtime.map((record) => ({
            employee_id: asObjectId(employeeByCode.get(record.employee_code)),
            work_date: record.work_date,
            hours: record.hours,
            type: record.type,
            status: record.status,
            reason: record.reason,
            reviewed_by: record.status === REQUEST_STATUS.APPROVED ? asObjectId(adminUser) : null,
            reviewed_at: record.status === REQUEST_STATUS.APPROVED ? new Date() : null,
            review_note: record.review_note || null,
        }))
    );

    await LeaveRequest.insertMany(
        data.leaveRequests.map((record) => ({
            employee_id: asObjectId(employeeByCode.get(record.employee_code)),
            type: record.type,
            start_date: record.start_date,
            end_date: record.end_date,
            total_days: record.total_days,
            status: record.status,
            reason: record.reason,
            reviewed_by: record.status === REQUEST_STATUS.APPROVED ? asObjectId(adminUser) : null,
            reviewed_at: record.status === REQUEST_STATUS.APPROVED ? new Date() : null,
            review_note: record.review_note || null,
        }))
    );

    await Training.insertMany(
        data.training.map((course) => ({
            course_name: course.course_name,
            sessions: course.sessions.map((session) => ({
                start_date: session.start_date,
                end_date: session.end_date,
                employees: session.employees.map((employee) => ({
                    employee_id: asObjectId(employeeByCode.get(employee.employee_code)),
                    status: employee.status,
                    score: employee.score,
                })),
            })),
        }))
    );

    await Payroll.insertMany(
        data.payroll.map((record) => ({
            employee_id: asObjectId(employeeByCode.get(record.employee_code)),
            month: record.month,
            year: record.year,
            total_work_hours: record.total_work_hours,
            total_overtime_hours: record.total_overtime_hours,
            basic_salary: record.basic_salary,
            overtime_salary: record.overtime_salary,
            allowance: record.allowance,
            deduction: record.deduction,
            net_salary: record.net_salary,
            status: record.status,
            generated_at: record.generated_at,
            generated_by: asObjectId(adminUser),
            calculation_details: record.calculation_details,
        }))
    );

    console.log('Demo seed completed successfully');
    console.log(`Seeded: ${employeeDocs.length} employees, ${shiftDocs.length} shifts, ${departmentDocs.length} departments`);
}

if (require.main === module) {
    seedDemo().catch((error) => {
        console.error('Failed to seed demo data:', error);
        process.exit(1);
    });
}

module.exports = seedDemo;
