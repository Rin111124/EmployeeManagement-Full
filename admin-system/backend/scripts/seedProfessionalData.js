const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const {
    Asset,
    Attendance,
    Contract,
    Department,
    Device,
    Employee,
    EmployeePosition,
    LeaveRequest,
    Overtime,
    Payroll,
    Shift,
    ShiftAssignment,
    Training,
    User,
} = require('../models');
const { REQUEST_STATUS } = require('../constants/workflow');

const SEED_TAG = '[PRO-SEED]';
const DEFAULT_PASSWORD = 'password123';

const departments = [
    { code: 'BOD', name: 'Board of Directors', parent: null, level: 0 },
    { code: 'OPS', name: 'Operations Division', parent: null, level: 0 },
    { code: 'PRD', name: 'Production Department', parent: 'OPS', level: 1 },
    { code: 'ASM', name: 'Assembly Line A', parent: 'PRD', level: 2 },
    { code: 'PKG', name: 'Packaging Line B', parent: 'PRD', level: 2 },
    { code: 'QA', name: 'Quality Assurance', parent: 'OPS', level: 1 },
    { code: 'MNT', name: 'Maintenance', parent: 'OPS', level: 1 },
    { code: 'WH', name: 'Warehouse & Logistics', parent: 'OPS', level: 1 },
    { code: 'HR', name: 'Human Resources', parent: null, level: 0 },
    { code: 'FIN', name: 'Finance & Payroll', parent: null, level: 0 },
    { code: 'IT', name: 'Information Technology', parent: null, level: 0 },
];

const shifts = [
    { shift_name: 'Office Shift', start_time: '08:00', end_time: '17:00', is_night_shift: false, standard_hours: 8, break_mins: 60, min_work_mins_for_break: 240 },
    { shift_name: 'Morning Shift', start_time: '07:00', end_time: '19:00', is_night_shift: false, standard_hours: 12, break_mins: 30, min_work_mins_for_break: 240 },
    { shift_name: 'Night Shift', start_time: '19:00', end_time: '07:00', is_night_shift: true, standard_hours: 12, break_mins: 45, min_work_mins_for_break: 240 },
    { shift_name: 'Warehouse Shift', start_time: '06:30', end_time: '15:30', is_night_shift: false, standard_hours: 8, break_mins: 45, min_work_mins_for_break: 240 },
];

const people = [
    ['PRO001', 'Nguyen Hoang Anh', 'Male', 'Production Manager', 'PRD', 34000000, '2018-03-12'],
    ['PRO002', 'Tran Minh Chau', 'Female', 'HR Manager', 'HR', 30000000, '2019-06-03'],
    ['PRO003', 'Le Quang Dung', 'Male', 'Finance Manager', 'FIN', 32000000, '2018-11-15'],
    ['PRO004', 'Pham Thu Giang', 'Female', 'IT Manager', 'IT', 33000000, '2020-02-17'],
    ['PRO005', 'Do Van Hai', 'Male', 'QA Lead', 'QA', 26500000, '2020-07-20'],
    ['PRO006', 'Bui Ngoc Khanh', 'Female', 'Maintenance Lead', 'MNT', 25500000, '2019-09-09'],
    ['PRO007', 'Vu Thanh Lam', 'Male', 'Warehouse Supervisor', 'WH', 23500000, '2021-01-11'],
    ['PRO008', 'Hoang Mai Linh', 'Female', 'Payroll Specialist', 'FIN', 21000000, '2021-05-05'],
    ['PRO009', 'Dang Tuan Minh', 'Male', 'HR Business Partner', 'HR', 22000000, '2021-08-18'],
    ['PRO010', 'Ngo Bao Ngoc', 'Female', 'Systems Administrator', 'IT', 24000000, '2022-04-22'],
    ['PRO011', 'Phan Quoc Phong', 'Male', 'Assembly Supervisor', 'ASM', 22000000, '2020-10-10'],
    ['PRO012', 'Ta Minh Quan', 'Male', 'Packaging Supervisor', 'PKG', 21500000, '2021-03-08'],
    ['PRO013', 'Nguyen Lan Anh', 'Female', 'QA Engineer', 'QA', 18500000, '2022-01-12'],
    ['PRO014', 'Tran Viet Anh', 'Male', 'QA Engineer', 'QA', 18200000, '2022-08-01'],
    ['PRO015', 'Le Thu Ha', 'Female', 'QA Inspector', 'QA', 14500000, '2023-02-14'],
    ['PRO016', 'Pham Minh Kiet', 'Male', 'QA Inspector', 'QA', 14500000, '2023-05-23'],
    ['PRO017', 'Bui Gia Bao', 'Male', 'Maintenance Technician', 'MNT', 16000000, '2021-12-07'],
    ['PRO018', 'Vo Thanh Dat', 'Male', 'Maintenance Technician', 'MNT', 15800000, '2022-06-16'],
    ['PRO019', 'Dang Nhat Nam', 'Male', 'Electrical Technician', 'MNT', 17000000, '2020-12-03'],
    ['PRO020', 'Mai Phuong Thao', 'Female', 'Inventory Controller', 'WH', 15500000, '2022-09-19'],
    ['PRO021', 'Cao Duc Tri', 'Male', 'Forklift Operator', 'WH', 13500000, '2023-01-09'],
    ['PRO022', 'Ly Thanh Tu', 'Male', 'Warehouse Clerk', 'WH', 13000000, '2023-06-26'],
    ['PRO023', 'Nguyen Bao Chau', 'Female', 'Production Planner', 'PRD', 20500000, '2020-04-06'],
    ['PRO024', 'Ho Sy Cuong', 'Male', 'Line Leader', 'ASM', 17000000, '2021-07-12'],
    ['PRO025', 'Duong My Duyen', 'Female', 'Line Leader', 'PKG', 16800000, '2021-10-04'],
    ['PRO026', 'Le Van Duc', 'Male', 'Machine Operator', 'ASM', 12500000, '2023-03-01'],
    ['PRO027', 'Tran Huu Loc', 'Male', 'Machine Operator', 'ASM', 12600000, '2023-03-15'],
    ['PRO028', 'Pham Quynh Nhu', 'Female', 'Assembly Operator', 'ASM', 11800000, '2023-07-01'],
    ['PRO029', 'Bui Thi Oanh', 'Female', 'Assembly Operator', 'ASM', 11800000, '2023-07-18'],
    ['PRO030', 'Vo Minh Phuc', 'Male', 'Assembly Operator', 'ASM', 11900000, '2023-08-10'],
    ['PRO031', 'Dang Thi Quynh', 'Female', 'Assembly Operator', 'ASM', 11800000, '2023-08-28'],
    ['PRO032', 'Mai Van Son', 'Male', 'Assembly Operator', 'ASM', 11900000, '2024-01-08'],
    ['PRO033', 'Cao Thi Thanh', 'Female', 'Packaging Operator', 'PKG', 11600000, '2023-04-03'],
    ['PRO034', 'Ly Van Thang', 'Male', 'Packaging Operator', 'PKG', 11600000, '2023-04-24'],
    ['PRO035', 'Nguyen Thi Uyen', 'Female', 'Packaging Operator', 'PKG', 11600000, '2023-09-05'],
    ['PRO036', 'Hoang Van Vinh', 'Male', 'Packaging Operator', 'PKG', 11700000, '2023-11-13'],
    ['PRO037', 'Phan Thi Xuan', 'Female', 'Packaging Operator', 'PKG', 11600000, '2024-02-19'],
    ['PRO038', 'Ta Hoang Yen', 'Female', 'Packaging Operator', 'PKG', 11600000, '2024-03-11'],
    ['PRO039', 'Nguyen Quoc Bao', 'Male', 'Shift Coordinator', 'PRD', 19000000, '2022-10-17'],
    ['PRO040', 'Tran Kim Chi', 'Female', 'Receptionist', 'HR', 12500000, '2024-04-01'],
    ['PRO041', 'Le Manh Hung', 'Male', 'Backend Support Engineer', 'IT', 21000000, '2022-12-12'],
    ['PRO042', 'Pham Anh Khoa', 'Male', 'Network Engineer', 'IT', 21500000, '2021-11-22'],
    ['PRO043', 'Bui Thuy Tien', 'Female', 'Accountant', 'FIN', 18500000, '2020-09-14'],
    ['PRO044', 'Vo Ngoc Mai', 'Female', 'Cost Controller', 'FIN', 19500000, '2021-06-21'],
    ['PRO045', 'Dang Huy Hoang', 'Male', 'Production Operator', 'PRD', 12200000, '2024-02-05'],
    ['PRO046', 'Mai Thu Trang', 'Female', 'Production Operator', 'PRD', 12200000, '2024-02-26'],
    ['PRO047', 'Cao Minh Tuan', 'Male', 'Production Operator', 'PRD', 12200000, '2024-03-18'],
    ['PRO048', 'Ly Hoai Nam', 'Male', 'Production Operator', 'PRD', 12200000, '2024-04-08'],
];

function dateOnly(value) {
    const date = new Date(value);
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function addDays(date, days) {
    const value = new Date(date);
    value.setDate(value.getDate() + days);
    return value;
}

function atTime(date, hhmm, offsetMinutes = 0) {
    const [hour, minute] = hhmm.split(':').map(Number);
    const value = dateOnly(date);
    value.setHours(hour, minute + offsetMinutes, 0, 0);
    return value;
}

function previousMonthPeriod() {
    const now = new Date();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return { month, year };
}

function departmentFor(code, departmentByCode) {
    const department = departmentByCode.get(code);
    if (!department) throw new Error(`Missing department ${code}`);
    return department;
}

function shiftFor(name, shiftByName) {
    const shift = shiftByName.get(name);
    if (!shift) throw new Error(`Missing shift ${name}`);
    return shift;
}

function shiftNameFor(person, dayIndex) {
    const departmentCode = person[4];
    if (['HR', 'FIN', 'IT', 'BOD'].includes(departmentCode)) return 'Office Shift';
    if (departmentCode === 'WH') return 'Warehouse Shift';
    if (['ASM', 'PKG', 'PRD', 'QA', 'MNT'].includes(departmentCode)) {
        return (dayIndex + Number(person[0].slice(3))) % 3 === 0 ? 'Night Shift' : 'Morning Shift';
    }
    return 'Office Shift';
}

function workedHoursFor(shiftName, dayIndex) {
    if (shiftName === 'Office Shift') return dayIndex % 8 === 0 ? 7.5 : 8;
    if (shiftName === 'Warehouse Shift') return dayIndex % 7 === 0 ? 7.75 : 8.25;
    return dayIndex % 6 === 0 ? 11.25 : 11.5;
}

function createAttendanceTimes(workDate, shift, dayIndex, employeeIndex) {
    const latePattern = (dayIndex + employeeIndex) % 11;
    const earlyPattern = (dayIndex + employeeIndex) % 13;
    const lateMinutes = latePattern === 0 ? 18 : latePattern === 3 ? 6 : 0;
    const earlyMinutes = earlyPattern === 0 ? -12 : 0;
    const checkIn = atTime(workDate, shift.start_time, lateMinutes ? lateMinutes : -Math.min(5, employeeIndex % 6));
    let checkOut = atTime(workDate, shift.end_time, earlyMinutes);
    if (shift.is_night_shift || shift.end_time < shift.start_time) {
        checkOut = addDays(checkOut, 1);
    }
    return { checkIn, checkOut, lateMinutes };
}

async function upsertByIdOrFilter(Model, filter, payload) {
    return Model.findOneAndUpdate(filter, payload, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
}

async function seedProfessionalData() {
    await connectDB();

    const summary = {
        departments: 0,
        shifts: 0,
        employees: 0,
        users: 0,
        contracts: 0,
        positions: 0,
        assignments: 0,
        attendance: 0,
        overtime: 0,
        leaveRequests: 0,
        payroll: 0,
        assets: 0,
        devices: 0,
        training: 0,
    };

    const departmentByCode = new Map();
    for (const item of departments) {
        const parent = item.parent ? departmentByCode.get(item.parent) : null;
        const department = await upsertByIdOrFilter(Department, { department_code: item.code }, {
            department_name: item.name,
            department_code: item.code,
            parent_id: parent?._id || null,
            level: item.level,
            description: `${SEED_TAG} Professional organization unit`,
        });
        departmentByCode.set(item.code, department);
        summary.departments += 1;
    }

    const shiftByName = new Map();
    for (const item of shifts) {
        const shift = await upsertByIdOrFilter(Shift, { shift_name: item.shift_name }, item);
        shiftByName.set(item.shift_name, shift);
        summary.shifts += 1;
    }

    const employeeByCode = new Map();
    for (let index = 0; index < people.length; index += 1) {
        const [code, fullName, gender, position, departmentCode, baseSalary, hireDate] = people[index];
        const department = departmentFor(departmentCode, departmentByCode);
        const birthYear = 1985 + (index % 18);
        const employee = await upsertByIdOrFilter(Employee, { employee_code: code }, {
            employee_code: code,
            full_name: fullName,
            date_of_birth: new Date(`${birthYear}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 25) + 1).padStart(2, '0')}`),
            gender,
            place_of_birth: ['Ha Noi', 'Hai Phong', 'Da Nang', 'Can Tho', 'Binh Duong'][index % 5],
            identity: {
                number: `0${String(320000000 + index).padStart(11, '0')}`,
                issue_date: new Date('2021-01-15'),
                issue_place: 'Ministry of Public Security',
            },
            contact: {
                phone: `09${String(10000000 + index).padStart(8, '0')}`,
                email: `${code.toLowerCase()}@employee.local`,
                permanent_address: `${12 + index} Nguyen Trai Street, Ha Noi`,
                current_address: `${20 + index} Industrial Park Residence, Bac Ninh`,
            },
            position,
            department: department.department_name,
            insurance: {
                tax_code: `PIT-${String(700000 + index)}`,
                social_insurance: `SI-${String(880000 + index)}`,
                health_insurance: `HI-${String(990000 + index)}`,
            },
            bank_accounts: [{
                bank_name: ['Vietcombank', 'Techcombank', 'BIDV', 'ACB', 'MB Bank'][index % 5],
                account_number: `9704${String(100000000 + index).padStart(9, '0')}`,
                is_primary: true,
            }],
            status: index >= 45 ? 'Inactive' : 'Active',
            hire_date: new Date(hireDate),
            face_data: [{
                label: fullName,
                image_path: `/faces/professional/${code.toLowerCase()}.jpg`,
                provider: 'seed',
            }],
        });
        employeeByCode.set(code, { employee, baseSalary, departmentCode, position });
        summary.employees += 1;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const roleMap = new Map([
        ['PRO001', ['Manager']],
        ['PRO002', ['HR']],
        ['PRO003', ['Manager']],
        ['PRO004', ['Manager']],
        ['PRO005', ['Manager']],
        ['PRO006', ['Manager']],
        ['PRO007', ['Manager']],
        ['PRO008', ['HR']],
    ]);
    for (const [code, record] of employeeByCode.entries()) {
        if (!roleMap.has(code) && Number(code.slice(3)) > 20) continue;
        await upsertByIdOrFilter(User, { username: code.toLowerCase() }, {
            employee_id: record.employee._id,
            username: code.toLowerCase(),
            password_hash: passwordHash,
            roles: roleMap.get(code) || ['Employee'],
            is_active: true,
        });
        summary.users += 1;
    }

    for (const [code, record] of employeeByCode.entries()) {
        const department = departmentFor(record.departmentCode, departmentByCode);
        const allowance = record.baseSalary >= 20000000 ? 1200000 : record.baseSalary >= 15000000 ? 800000 : 600000;
        await upsertByIdOrFilter(EmployeePosition, { employee_id: record.employee._id, is_current: true }, {
            employee_id: record.employee._id,
            department_id: department._id,
            position_name: record.position,
            start_date: record.employee.hire_date,
            end_date: null,
            is_current: true,
        });
        await upsertByIdOrFilter(Contract, { employee_id: record.employee._id, start_date: record.employee.hire_date }, {
            employee_id: record.employee._id,
            type: 'Full-time',
            start_date: record.employee.hire_date,
            end_date: null,
            base_salary: record.baseSalary,
            allowances: [
                { name: 'Meal allowance', amount: 600000 },
                { name: 'Position allowance', amount: allowance },
            ],
            status: 'Signed',
        });
        summary.positions += 1;
        summary.contracts += 1;
    }

    const today = dateOnly(new Date());
    const workingDays = [];
    for (let offset = 45; offset >= 1; offset -= 1) {
        const day = addDays(today, -offset);
        if (![0].includes(day.getDay())) workingDays.push(day);
    }

    const activePeople = people.filter((item) => Number(item[0].slice(3)) <= 45);
    const activeEmployeeIds = activePeople.map((person) => employeeByCode.get(person[0]).employee._id);
    await Promise.all([
        ShiftAssignment.deleteMany({ employee_id: { $in: activeEmployeeIds } }),
        Attendance.deleteMany({ employee_id: { $in: activeEmployeeIds } }),
    ]);

    for (let dayIndex = 0; dayIndex < workingDays.length; dayIndex += 1) {
        const workDate = workingDays[dayIndex];
        for (let employeeIndex = 0; employeeIndex < activePeople.length; employeeIndex += 1) {
            const person = activePeople[employeeIndex];
            const record = employeeByCode.get(person[0]);
            const shift = shiftFor(shiftNameFor(person, dayIndex), shiftByName);

            await upsertByIdOrFilter(ShiftAssignment, { employee_id: record.employee._id, work_date: dateOnly(workDate) }, {
                employee_id: record.employee._id,
                shift_id: shift._id,
                work_date: dateOnly(workDate),
            });
            summary.assignments += 1;

            if ((dayIndex + employeeIndex) % 17 === 0) continue;

            const { checkIn, checkOut, lateMinutes } = createAttendanceTimes(workDate, shift, dayIndex, employeeIndex);
            const missingCheckout = (dayIndex + employeeIndex) % 37 === 0;
            await upsertByIdOrFilter(Attendance, { employee_id: record.employee._id, work_date: dateOnly(workDate) }, {
                employee_id: record.employee._id,
                shift_id: shift._id,
                work_date: dateOnly(workDate),
                check_in: checkIn,
                check_out: missingCheckout ? null : checkOut,
                worked_hours: missingCheckout ? 0 : workedHoursFor(shift.shift_name, dayIndex),
                late_minutes: lateMinutes,
                status: missingCheckout ? 'MissingCheckout' : 'CheckedOut',
                method: (dayIndex + employeeIndex) % 9 === 0 ? 'manual' : 'face',
                check_in_face_image: `/faces/professional/checkins/${person[0]}-${dayIndex}-in.jpg`,
                check_out_face_image: missingCheckout ? null : `/faces/professional/checkins/${person[0]}-${dayIndex}-out.jpg`,
            });
            summary.attendance += 1;
        }
    }

    await Promise.all([
        Overtime.deleteMany({ reason: new RegExp(SEED_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }),
        LeaveRequest.deleteMany({ reason: new RegExp(SEED_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }),
    ]);

    const reviewer = await User.findOne({ username: 'pro002' });
    for (let i = 0; i < activePeople.length; i += 1) {
        const person = activePeople[i];
        const record = employeeByCode.get(person[0]);
        if (i % 4 === 0) {
            await Overtime.create({
                employee_id: record.employee._id,
                work_date: addDays(today, -((i % 20) + 4)),
                hours: 1.5 + (i % 4) * 0.5,
                type: i % 8 === 0 ? 'Weekend Overtime' : 'Weekday Overtime',
                status: i % 12 === 0 ? REQUEST_STATUS.PENDING : REQUEST_STATUS.APPROVED,
                reason: `${SEED_TAG} Production recovery and shipment commitment`,
                reviewed_by: i % 12 === 0 ? null : reviewer?._id || null,
                reviewed_at: i % 12 === 0 ? null : new Date(),
                review_note: i % 12 === 0 ? null : 'Reviewed against production plan and approved.',
            });
            summary.overtime += 1;
        }
        if (i % 7 === 0) {
            const start = addDays(today, -((i % 25) + 6));
            await LeaveRequest.create({
                employee_id: record.employee._id,
                type: i % 14 === 0 ? 'Sick Leave' : 'Annual Leave',
                start_date: start,
                end_date: addDays(start, i % 14 === 0 ? 0 : 1),
                total_days: i % 14 === 0 ? 1 : 2,
                status: i % 21 === 0 ? REQUEST_STATUS.PENDING : REQUEST_STATUS.APPROVED,
                reason: `${SEED_TAG} Planned leave request`,
                reviewed_by: i % 21 === 0 ? null : reviewer?._id || null,
                reviewed_at: i % 21 === 0 ? null : new Date(),
                review_note: i % 21 === 0 ? null : 'Leave balance and staffing coverage verified.',
            });
            summary.leaveRequests += 1;
        }
    }

    const { month, year } = previousMonthPeriod();
    for (const [code, record] of employeeByCode.entries()) {
        if (Number(code.slice(3)) > 45) continue;
        const allowance = record.baseSalary >= 20000000 ? 1800000 : 1200000;
        const overtimeHours = Number(code.slice(3)) % 4 === 0 ? 6 : Number(code.slice(3)) % 3 === 0 ? 3.5 : 1.5;
        const overtimeSalary = Math.round(overtimeHours * (record.baseSalary / 176) * 1.5);
        const workHours = 168 + (Number(code.slice(3)) % 9);
        const deduction = Number(code.slice(3)) % 10 === 0 ? 200000 : 0;
        await upsertByIdOrFilter(Payroll, { employee_id: record.employee._id, month, year }, {
            employee_id: record.employee._id,
            month,
            year,
            total_work_hours: workHours,
            total_overtime_hours: overtimeHours,
            basic_salary: record.baseSalary,
            overtime_salary: overtimeSalary,
            allowance,
            deduction,
            net_salary: record.baseSalary + allowance + overtimeSalary - deduction,
            status: 'Finalized',
            generated_at: addDays(today, -5),
            generated_by: reviewer?._id || null,
            calculation_details: {
                standard_month_hours: 176,
                attendance_record_count: 22,
                overtime_record_count: overtimeHours > 0 ? 1 : 0,
                seed: SEED_TAG,
            },
        });
        summary.payroll += 1;
    }

    const assetCategories = ['Laptop', 'Desktop', 'Mobile', 'Tablet', 'Peripherals'];
    for (let i = 0; i < 70; i += 1) {
        const assignedPerson = i < activePeople.length ? employeeByCode.get(activePeople[i][0])?.employee : null;
        await upsertByIdOrFilter(Asset, { serial_number: `PRO-ASSET-${String(i + 1).padStart(4, '0')}` }, {
            asset_name: `${assetCategories[i % assetCategories.length]} ${i < 20 ? 'Dell Latitude' : i < 40 ? 'Industrial Tablet' : 'Workstation Kit'} ${String(i + 1).padStart(2, '0')}`,
            category: assetCategories[i % assetCategories.length],
            serial_number: `PRO-ASSET-${String(i + 1).padStart(4, '0')}`,
            status: assignedPerson ? 'Assigned' : i % 9 === 0 ? 'Maintenance' : 'Available',
            assigned_to: assignedPerson?._id || null,
            assigned_date: assignedPerson ? addDays(today, -(i + 15)) : null,
            purchase_date: addDays(today, -(200 + i * 3)),
            purchase_cost: 3500000 + (i % 12) * 1250000,
            warranty_until: addDays(today, 365 + i),
            location: ['Head Office', 'Assembly Line A', 'Packaging Line B', 'Warehouse', 'QA Lab'][i % 5],
            notes: `${SEED_TAG} Professionally seeded asset inventory`,
        });
        summary.assets += 1;
    }

    for (let i = 0; i < 8; i += 1) {
        await Device.collection.updateOne(
            { ip_address: `192.168.10.${50 + i}` },
            {
                $set: {
                    device_name: `Kiosk Terminal ${String(i + 1).padStart(2, '0')}`,
                    ip_address: `192.168.10.${50 + i}`,
                    port: 8080 + i,
                    location: ['Main Gate', 'Assembly Entrance', 'Packaging Entrance', 'Warehouse Gate'][i % 4],
                    device_type: 'face',
                    status: i === 7 ? 'pending' : 'approved',
                    can_access_db: i !== 7,
                    last_sync: addDays(today, -1),
                    metadata: { seed: SEED_TAG, model: 'Face Kiosk Pro' },
                    api_key_hash: `pro-seed-api-key-hash-${i + 1}`,
                    updatedAt: new Date(),
                },
                $setOnInsert: {
                    createdAt: new Date(),
                },
            },
            { upsert: true },
        );
        summary.devices += 1;
    }

    const trainingCourses = [
        'ISO 9001 Quality Awareness',
        'Lockout Tagout Safety',
        'Forklift Safety Certification',
        'Payroll and Attendance Policy',
        'Data Security for Office Staff',
        'Line Leader Coaching Program',
    ];
    for (let i = 0; i < trainingCourses.length; i += 1) {
        const selected = activePeople.slice(i * 6, i * 6 + 12).map((person, idx) => ({
            employee_id: employeeByCode.get(person[0]).employee._id,
            status: idx % 5 === 0 ? 'in_progress' : 'completed',
            score: idx % 5 === 0 ? 75 + idx : 82 + (idx % 15),
        }));
        await upsertByIdOrFilter(Training, { course_name: `${SEED_TAG} ${trainingCourses[i]}` }, {
            course_name: `${SEED_TAG} ${trainingCourses[i]}`,
            sessions: [{
                start_date: addDays(today, -(30 - i * 3)),
                end_date: addDays(today, -(28 - i * 3)),
                employees: selected,
            }],
        });
        summary.training += 1;
    }

    console.log('Professional seed completed successfully');
    console.table(summary);
    console.log(`Default password for seeded PRO users: ${DEFAULT_PASSWORD}`);
}

if (require.main === module) {
    seedProfessionalData()
        .catch((error) => {
            console.error('Failed to seed professional data:', error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await mongoose.disconnect();
        });
}

module.exports = seedProfessionalData;
