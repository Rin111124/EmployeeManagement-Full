const { REQUEST_STATUS } = require('../constants/workflow');

function daysAgo(days) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}

function atTime(date, hours, minutes) {
    const value = new Date(date);
    value.setHours(hours, minutes, 0, 0);
    return value;
}

function buildDemoSeedData() {
    const baseDate = new Date();
    const currentYear = baseDate.getFullYear();
    const currentMonth = baseDate.getMonth() + 1;
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const departments = [
        { department_name: 'Operations', parent_name: null },
        { department_name: 'Production', parent_name: 'Operations' },
        { department_name: 'Assembly', parent_name: 'Production' },
        { department_name: 'Quality Assurance', parent_name: 'Operations' },
        { department_name: 'Maintenance', parent_name: 'Operations' },
        { department_name: 'Human Resources', parent_name: null },
        { department_name: 'IT Support', parent_name: null },
    ];

    const shifts = [
        { shift_name: 'Morning Shift', start_time: '08:00', end_time: '20:00', is_night_shift: false, standard_hours: 12 },
        { shift_name: 'Night Shift', start_time: '20:00', end_time: '08:00', is_night_shift: true, standard_hours: 12 },
    ];

    const employees = [
        {
            employee_code: 'EMP001',
            full_name: 'Nguyen Minh An',
            date_of_birth: '1992-04-12',
            gender: 'Male',
            place_of_birth: 'Ha Noi',
            contact: {
                phone: '0901000001',
                email: 'an.nguyen@industrialhr.local',
                permanent_address: 'Dong Da, Ha Noi',
                current_address: 'Cau Giay, Ha Noi',
            },
            position: 'Production Supervisor',
            department: 'Production',
            insurance: {
                tax_code: 'TIN-100001',
                social_insurance: 'SI-100001',
                health_insurance: 'HI-100001',
            },
            bank_accounts: [{ bank_name: 'Vietcombank', account_number: '0011000001', is_primary: true }],
            status: 'Active',
            hire_date: '2021-03-15',
            face_data: [{ label: 'Nguyen Minh An', image_path: '/faces/an.jpg', provider: 'manual' }],
        },
        {
            employee_code: 'EMP002',
            full_name: 'Tran Thu Ha',
            date_of_birth: '1995-09-20',
            gender: 'Female',
            place_of_birth: 'Hai Phong',
            contact: {
                phone: '0901000002',
                email: 'ha.tran@industrialhr.local',
                permanent_address: 'Le Chan, Hai Phong',
                current_address: 'Bac Tu Liem, Ha Noi',
            },
            position: 'QA Engineer',
            department: 'Quality Assurance',
            insurance: {
                tax_code: 'TIN-100002',
                social_insurance: 'SI-100002',
                health_insurance: 'HI-100002',
            },
            bank_accounts: [{ bank_name: 'Techcombank', account_number: '0011000002', is_primary: true }],
            status: 'Active',
            hire_date: '2022-06-01',
            face_data: [{ label: 'Tran Thu Ha', image_path: '/faces/ha.jpg', provider: 'manual' }],
        },
        {
            employee_code: 'EMP003',
            full_name: 'Le Quang Huy',
            date_of_birth: '1990-11-05',
            gender: 'Male',
            place_of_birth: 'Da Nang',
            contact: {
                phone: '0901000003',
                email: 'huy.le@industrialhr.local',
                permanent_address: 'Hai Chau, Da Nang',
                current_address: 'Thu Duc, Ho Chi Minh City',
            },
            position: 'Maintenance Technician',
            department: 'Maintenance',
            insurance: {
                tax_code: 'TIN-100003',
                social_insurance: 'SI-100003',
                health_insurance: 'HI-100003',
            },
            bank_accounts: [{ bank_name: 'BIDV', account_number: '0011000003', is_primary: true }],
            status: 'Active',
            hire_date: '2020-02-10',
            face_data: [{ label: 'Le Quang Huy', image_path: '/faces/huy.jpg', provider: 'manual' }],
        },
        {
            employee_code: 'EMP004',
            full_name: 'Pham Gia Linh',
            date_of_birth: '1997-01-18',
            gender: 'Female',
            place_of_birth: 'Binh Duong',
            contact: {
                phone: '0901000004',
                email: 'linh.pham@industrialhr.local',
                permanent_address: 'Thu Dau Mot, Binh Duong',
                current_address: 'District 7, Ho Chi Minh City',
            },
            position: 'Assembly Lead',
            department: 'Assembly',
            insurance: {
                tax_code: 'TIN-100004',
                social_insurance: 'SI-100004',
                health_insurance: 'HI-100004',
            },
            bank_accounts: [{ bank_name: 'ACB', account_number: '0011000004', is_primary: true }],
            status: 'Active',
            hire_date: '2023-01-09',
            face_data: [{ label: 'Pham Gia Linh', image_path: '/faces/linh.jpg', provider: 'manual' }],
        },
        {
            employee_code: 'EMP005',
            full_name: 'Doan Minh Khoa',
            date_of_birth: '1988-08-30',
            gender: 'Male',
            place_of_birth: 'Can Tho',
            contact: {
                phone: '0901000005',
                email: 'khoa.doan@industrialhr.local',
                permanent_address: 'Ninh Kieu, Can Tho',
                current_address: 'Tan Phu, Ho Chi Minh City',
            },
            position: 'HR Specialist',
            department: 'Human Resources',
            insurance: {
                tax_code: 'TIN-100005',
                social_insurance: 'SI-100005',
                health_insurance: 'HI-100005',
            },
            bank_accounts: [{ bank_name: 'MB Bank', account_number: '0011000005', is_primary: true }],
            status: 'Active',
            hire_date: '2019-07-22',
            face_data: [{ label: 'Doan Minh Khoa', image_path: '/faces/khoa.jpg', provider: 'manual' }],
        },
        {
            employee_code: 'EMP006',
            full_name: 'Bui Thi Ngoc',
            date_of_birth: '1999-12-02',
            gender: 'Female',
            place_of_birth: 'Hai Duong',
            contact: {
                phone: '0901000006',
                email: 'ngoc.bui@industrialhr.local',
                permanent_address: 'Hai Duong City',
                current_address: 'Thu Duc, Ho Chi Minh City',
            },
            position: 'IT Support Specialist',
            department: 'IT Support',
            insurance: {
                tax_code: 'TIN-100006',
                social_insurance: 'SI-100006',
                health_insurance: 'HI-100006',
            },
            bank_accounts: [{ bank_name: 'VietinBank', account_number: '0011000006', is_primary: true }],
            status: 'Active',
            hire_date: '2024-05-14',
            face_data: [{ label: 'Bui Thi Ngoc', image_path: '/faces/ngoc.jpg', provider: 'manual' }],
        },
    ];

    const users = [
        { username: 'admin', employee_code: 'ADMIN001', roles: ['Admin'] },
        { username: 'hr.khoa', employee_code: 'EMP005', roles: ['HR'] },
        { username: 'an.nguyen', employee_code: 'EMP001', roles: ['Employee'] },
        { username: 'ha.tran', employee_code: 'EMP002', roles: ['Employee'] },
        { username: 'huy.le', employee_code: 'EMP003', roles: ['Employee'] },
        { username: 'linh.pham', employee_code: 'EMP004', roles: ['Employee'] },
        { username: 'ngoc.bui', employee_code: 'EMP006', roles: ['Employee'] },
    ];

    const contracts = [
        { employee_code: 'EMP001', type: 'Full-time', start_date: '2021-03-15', end_date: null, base_salary: 18500000, allowances: [{ name: 'Meal allowance', amount: 700000 }, { name: 'Transport', amount: 500000 }], status: 'Approved' },
        { employee_code: 'EMP002', type: 'Full-time', start_date: '2022-06-01', end_date: null, base_salary: 17200000, allowances: [{ name: 'Meal allowance', amount: 600000 }], status: 'Approved' },
        { employee_code: 'EMP003', type: 'Full-time', start_date: '2020-02-10', end_date: null, base_salary: 16800000, allowances: [{ name: 'Tool allowance', amount: 450000 }], status: 'Approved' },
        { employee_code: 'EMP004', type: 'Full-time', start_date: '2023-01-09', end_date: null, base_salary: 17800000, allowances: [{ name: 'Shift allowance', amount: 900000 }], status: 'Approved' },
        { employee_code: 'EMP005', type: 'Full-time', start_date: '2019-07-22', end_date: null, base_salary: 20500000, allowances: [{ name: 'Management allowance', amount: 1200000 }], status: 'Approved' },
        { employee_code: 'EMP006', type: 'Full-time', start_date: '2024-05-14', end_date: null, base_salary: 16000000, allowances: [{ name: 'Transport', amount: 400000 }], status: 'Approved' },
    ];

    const employeePositions = [
        { employee_code: 'EMP001', department_name: 'Production', position_name: 'Production Supervisor', start_date: '2021-03-15', end_date: null, is_current: true },
        { employee_code: 'EMP002', department_name: 'Quality Assurance', position_name: 'QA Engineer', start_date: '2022-06-01', end_date: null, is_current: true },
        { employee_code: 'EMP003', department_name: 'Maintenance', position_name: 'Maintenance Technician', start_date: '2020-02-10', end_date: null, is_current: true },
        { employee_code: 'EMP004', department_name: 'Assembly', position_name: 'Assembly Lead', start_date: '2023-01-09', end_date: null, is_current: true },
        { employee_code: 'EMP005', department_name: 'Human Resources', position_name: 'HR Specialist', start_date: '2019-07-22', end_date: null, is_current: true },
        { employee_code: 'EMP006', department_name: 'IT Support', position_name: 'IT Support Specialist', start_date: '2024-05-14', end_date: null, is_current: true },
    ];

    const shiftAssignments = [
        { employee_code: 'EMP001', shift_name: 'Morning Shift', work_date: startOfDay(daysAgo(1)) },
        { employee_code: 'EMP002', shift_name: 'Morning Shift', work_date: startOfDay(daysAgo(1)) },
        { employee_code: 'EMP003', shift_name: 'Night Shift', work_date: startOfDay(daysAgo(1)) },
        { employee_code: 'EMP004', shift_name: 'Night Shift', work_date: startOfDay(daysAgo(1)) },
        { employee_code: 'EMP005', shift_name: 'Morning Shift', work_date: startOfDay(daysAgo(1)) },
        { employee_code: 'EMP006', shift_name: 'Night Shift', work_date: startOfDay(daysAgo(1)) },
    ];

    const attendance = [
        { employee_code: 'EMP001', shift_name: 'Morning Shift', work_date: startOfDay(daysAgo(1)), check_in: atTime(daysAgo(1), 8, 8), check_out: atTime(daysAgo(1), 20, 12), worked_hours: 11.9, late_minutes: 8, status: 'CheckedOut', method: 'face', check_in_face_image: '/faces/an-in.jpg', check_out_face_image: '/faces/an-out.jpg' },
        { employee_code: 'EMP002', shift_name: 'Morning Shift', work_date: startOfDay(daysAgo(1)), check_in: atTime(daysAgo(1), 8, 0), check_out: atTime(daysAgo(1), 20, 2), worked_hours: 12, late_minutes: 0, status: 'CheckedOut', method: 'face', check_in_face_image: '/faces/ha-in.jpg', check_out_face_image: '/faces/ha-out.jpg' },
        { employee_code: 'EMP003', shift_name: 'Night Shift', work_date: startOfDay(daysAgo(1)), check_in: atTime(daysAgo(1), 20, 3), check_out: atTime(baseDate, 8, 5), worked_hours: 12, late_minutes: 3, status: 'CheckedOut', method: 'manual', check_in_face_image: '/faces/huy-in.jpg', check_out_face_image: '/faces/huy-out.jpg' },
        { employee_code: 'EMP004', shift_name: 'Night Shift', work_date: startOfDay(daysAgo(2)), check_in: atTime(daysAgo(2), 20, 0), check_out: atTime(daysAgo(1), 8, 0), worked_hours: 12, late_minutes: 0, status: 'CheckedOut', method: 'face', check_in_face_image: '/faces/linh-in.jpg', check_out_face_image: '/faces/linh-out.jpg' },
        { employee_code: 'EMP005', shift_name: 'Morning Shift', work_date: startOfDay(daysAgo(2)), check_in: atTime(daysAgo(2), 8, 10), check_out: atTime(daysAgo(2), 20, 1), worked_hours: 11.85, late_minutes: 10, status: 'CheckedOut', method: 'face', check_in_face_image: '/faces/khoa-in.jpg', check_out_face_image: '/faces/khoa-out.jpg' },
        { employee_code: 'EMP006', shift_name: 'Night Shift', work_date: startOfDay(daysAgo(2)), check_in: atTime(daysAgo(2), 20, 0), check_out: atTime(daysAgo(1), 8, 10), worked_hours: 12.1, late_minutes: 0, status: 'CheckedOut', method: 'manual', check_in_face_image: '/faces/ngoc-in.jpg', check_out_face_image: '/faces/ngoc-out.jpg' },
        { employee_code: 'EMP001', shift_name: 'Morning Shift', work_date: startOfDay(daysAgo(3)), check_in: atTime(daysAgo(3), 8, 5), check_out: atTime(daysAgo(3), 20, 0), worked_hours: 11.92, late_minutes: 5, status: 'CheckedOut', method: 'face', check_in_face_image: '/faces/an-in-2.jpg', check_out_face_image: '/faces/an-out-2.jpg' },
        { employee_code: 'EMP002', shift_name: 'Morning Shift', work_date: startOfDay(daysAgo(3)), check_in: atTime(daysAgo(3), 8, 0), check_out: atTime(daysAgo(3), 20, 0), worked_hours: 12, late_minutes: 0, status: 'CheckedOut', method: 'face', check_in_face_image: '/faces/ha-in-2.jpg', check_out_face_image: '/faces/ha-out-2.jpg' },
    ];

    const overtime = [
        { employee_code: 'EMP001', work_date: startOfDay(daysAgo(1)), hours: 2, type: 'Weekday Overtime', status: REQUEST_STATUS.APPROVED, reason: 'Urgent line inspection', review_note: 'Approved for production support' },
        { employee_code: 'EMP003', work_date: startOfDay(daysAgo(2)), hours: 1.5, type: 'Night Shift Extension', status: REQUEST_STATUS.APPROVED, reason: 'Machine calibration', review_note: 'Approved by maintenance lead' },
        { employee_code: 'EMP004', work_date: startOfDay(daysAgo(3)), hours: 3, type: 'Weekend Overtime', status: REQUEST_STATUS.PENDING, reason: 'Training prep' },
        { employee_code: 'EMP006', work_date: startOfDay(daysAgo(4)), hours: 2.5, type: 'System Upgrade', status: REQUEST_STATUS.APPROVED, reason: 'Server maintenance window', review_note: 'Approved by IT manager' },
    ];

    const leaveRequests = [
        { employee_code: 'EMP002', type: 'Annual Leave', start_date: startOfDay(daysAgo(10)), end_date: startOfDay(daysAgo(8)), total_days: 3, status: REQUEST_STATUS.APPROVED, reason: 'Family trip', review_note: 'Approved in advance' },
        { employee_code: 'EMP004', type: 'Sick Leave', start_date: startOfDay(daysAgo(5)), end_date: startOfDay(daysAgo(5)), total_days: 1, status: REQUEST_STATUS.APPROVED, reason: 'Medical appointment' },
        { employee_code: 'EMP006', type: 'Personal Leave', start_date: startOfDay(daysAgo(2)), end_date: startOfDay(daysAgo(2)), total_days: 1, status: REQUEST_STATUS.PENDING, reason: 'Personal errand' },
    ];

    const training = [
        {
            course_name: 'Industrial Safety Basics',
            sessions: [
                {
                    start_date: startOfDay(daysAgo(21)),
                    end_date: startOfDay(daysAgo(19)),
                    employees: [
                        { employee_code: 'EMP001', status: 'completed', score: 96 },
                        { employee_code: 'EMP002', status: 'completed', score: 94 },
                        { employee_code: 'EMP004', status: 'completed', score: 91 },
                    ],
                },
            ],
        },
        {
            course_name: 'Quality Control Standards',
            sessions: [
                {
                    start_date: startOfDay(daysAgo(14)),
                    end_date: startOfDay(daysAgo(12)),
                    employees: [
                        { employee_code: 'EMP002', status: 'completed', score: 98 },
                        { employee_code: 'EMP005', status: 'completed', score: 95 },
                    ],
                },
            ],
        },
        {
            course_name: 'Machine Maintenance 101',
            sessions: [
                {
                    start_date: startOfDay(daysAgo(18)),
                    end_date: startOfDay(daysAgo(16)),
                    employees: [
                        { employee_code: 'EMP003', status: 'completed', score: 97 },
                        { employee_code: 'EMP006', status: 'in_progress', score: 88 },
                    ],
                },
            ],
        },
        {
            course_name: 'Leadership for Supervisors',
            sessions: [
                {
                    start_date: startOfDay(daysAgo(9)),
                    end_date: startOfDay(daysAgo(7)),
                    employees: [
                        { employee_code: 'EMP001', status: 'completed', score: 93 },
                        { employee_code: 'EMP005', status: 'completed', score: 99 },
                    ],
                },
            ],
        },
    ];

    const payroll = employees.map((employee, index) => {
        const baseSalary = contracts[index].base_salary;
        const allowance = contracts[index].allowances.reduce((sum, item) => sum + item.amount, 0);
        const overtimeHours = index % 2 === 0 ? 2 + index * 0.25 : 1.5 + index * 0.2;
        const overtimeSalary = Math.round((overtimeHours * (baseSalary / 176) * 1.5) * 100) / 100;
        const deduction = index % 3 === 0 ? 150000 : 0;
        return {
            employee_code: employee.employee_code,
            month: previousMonth,
            year: previousYear,
            total_work_hours: 176 - index * 1.5,
            total_overtime_hours: Math.round(overtimeHours * 100) / 100,
            basic_salary: baseSalary,
            overtime_salary: overtimeSalary,
            allowance,
            deduction,
            net_salary: Math.round((baseSalary + allowance + overtimeSalary - deduction) * 100) / 100,
            status: 'Finalized',
            generated_at: daysAgo(6),
            calculation_details: {
                standard_month_hours: 176,
                overtime_rate: 1.5,
                attendance_record_count: 20 + index,
                overtime_record_count: 1 + (index % 2),
            },
        };
    });

    return {
        departments,
        shifts,
        employees,
        users,
        contracts,
        employeePositions,
        shiftAssignments,
        attendance,
        overtime,
        leaveRequests,
        training,
        payroll,
    };
}

module.exports = buildDemoSeedData;
