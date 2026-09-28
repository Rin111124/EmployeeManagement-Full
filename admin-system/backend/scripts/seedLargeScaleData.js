const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const {
    Asset,
    Attendance,
    Contract,
    ContractTemplate,
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
const { ROLES } = require('../constants/roles');

const SEED_TAG = '[ENTERPRISE-LARGE-SEED]';
const DEFAULT_PASSWORD = 'password123';

// 1. Department Hierarchy
const departmentDefs = [
    { code: 'BOD', name: 'Board of Directors', parent: null, level: 0, desc: 'Executive Management and Governance' },
    { code: 'HR', name: 'Human Resources Department', parent: null, level: 0, desc: 'Talent Acquisition, People Operations and HR Compliance' },
    { code: 'FIN', name: 'Finance and Accounting', parent: null, level: 0, desc: 'Financial Planning, Auditing, Tax and Payroll Management' },
    { code: 'IT', name: 'IT and Systems Engineering', parent: null, level: 0, desc: 'Infrastructure, Enterprise Cloud, Cybersecurity and IT Support' },
    { code: 'RND', name: 'Research and Development', parent: null, level: 0, desc: 'Product Engineering, Firmware and Industrial IoT Innovations' },
    { code: 'OPS', name: 'Operations Division', parent: null, level: 0, desc: 'Central Operations, Manufacturing and Quality Management' },
    { code: 'PRD', name: 'Production Department', parent: 'OPS', level: 1, desc: 'Main Manufacturing Plant and Line Assembly' },
    { code: 'ASMA', name: 'Assembly Line 01', parent: 'PRD', level: 2, desc: 'Precision Component Assembly and SMT Lines' },
    { code: 'ASMB', name: 'Assembly Line 02', parent: 'PRD', level: 2, desc: 'Final Mechanical Assembly and Testing' },
    { code: 'PKGA', name: 'Packaging Line 01', parent: 'PRD', level: 2, desc: 'Automated High-Speed Boxing and Sealing' },
    { code: 'PKGB', name: 'Packaging Line 02', parent: 'PRD', level: 2, desc: 'Bulk Packaging, Palletizing and Barcoding' },
    { code: 'QA', name: 'Quality Assurance and Control', parent: 'OPS', level: 1, desc: 'Incoming Material QC, In-process QA and Lab Testing' },
    { code: 'MNT', name: 'Facility and Maintenance', parent: 'OPS', level: 1, desc: 'Robotics Calibration, HVAC, Power and Plant Maintenance' },
    { code: 'WHL', name: 'Warehouse and Logistics', parent: 'OPS', level: 1, desc: 'Raw Material Inventory, Finished Goods and Shipping' },
    { code: 'SCM', name: 'Supply Chain and Procurement', parent: null, level: 0, desc: 'Vendor Sourcing, Purchasing and Material Logistics' },
    { code: 'CS', name: 'Customer Support and Service', parent: null, level: 0, desc: 'Client Operations, Technical Helpdesk and RMA' },
    { code: 'MKT', name: 'Marketing and Communications', parent: null, level: 0, desc: 'Brand Management, Digital Marketing and PR' },
];

// 2. Shifts
const shiftDefs = [
    { shift_name: 'Standard Office Shift', start_time: '08:00', end_time: '17:00', is_night_shift: false, standard_hours: 8, break_mins: 60, min_work_mins_for_break: 240 },
    { shift_name: 'Morning Shift (Line)', start_time: '06:00', end_time: '14:00', is_night_shift: false, standard_hours: 8, break_mins: 30, min_work_mins_for_break: 240 },
    { shift_name: 'Afternoon Shift (Line)', start_time: '14:00', end_time: '22:00', is_night_shift: false, standard_hours: 8, break_mins: 30, min_work_mins_for_break: 240 },
    { shift_name: 'Night Shift (Line)', start_time: '22:00', end_time: '06:00', is_night_shift: true, standard_hours: 8, break_mins: 45, min_work_mins_for_break: 240 },
    { shift_name: '12H Day Shift (Production)', start_time: '07:00', end_time: '19:00', is_night_shift: false, standard_hours: 12, break_mins: 45, min_work_mins_for_break: 240 },
    { shift_name: '12H Night Shift (Production)', start_time: '19:00', end_time: '07:00', is_night_shift: true, standard_hours: 12, break_mins: 45, min_work_mins_for_break: 240 },
    { shift_name: 'Warehouse Logistics Shift', start_time: '07:30', end_time: '16:30', is_night_shift: false, standard_hours: 8, break_mins: 60, min_work_mins_for_break: 240 },
];

// 3. Name generation pools
const firstNames = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Huynh', 'Phan', 'Vu', 'Vo', 'Dang', 'Bui', 'Do', 'Ho', 'Ngo', 'Duong', 'Ly', 'Dinh', 'Dao', 'Doan', 'Ha', 'Trinh', 'Luu'];
const middleNamesMale = ['Van', 'Minh', 'Duc', 'Hoang', 'Quang', 'Thanh', 'Huu', 'Gia', 'Hai', 'Tuan', 'Huy', 'Dinh', 'Quoc', 'Tien', 'Sy', 'Trong', 'The'];
const middleNamesFemale = ['Thi', 'Ngoc', 'Thu', 'Phuong', 'Mai', 'Lan', 'Bao', 'Thao', 'Kim', 'Thanh', 'Huyen', 'Tuyet', 'Nhu', 'My', 'Thuy', 'Hong'];
const lastNamesMale = ['An', 'Binh', 'Cuong', 'Dung', 'Dat', 'Duy', 'Hai', 'Hieu', 'Hung', 'Huy', 'Khoa', 'Lam', 'Long', 'Minh', 'Nam', 'Phong', 'Phuc', 'Quan', 'Son', 'Tam', 'Tan', 'Thang', 'Thinh', 'Tri', 'Trung', 'Tuan', 'Tung', 'Viet', 'Vinh', 'Vuong', 'Kiet', 'Bao', 'Loc'];
const lastNamesFemale = ['Anh', 'Chau', 'Chi', 'Duyen', 'Giang', 'Ha', 'Hoa', 'Huong', 'Khanh', 'Linh', 'Mai', 'Nga', 'Ngan', 'Nhung', 'Oanh', 'Quynh', 'Thao', 'Trang', 'Tuyet', 'Uyen', 'Van', 'Vy', 'Yen', 'Ngoc', 'Loan', 'Tram', 'Thuy'];

const cities = [
    { city: 'Hanoi', prefix: 'HN', dist: 'Cau Giay, Hanoi', addr: 'Cau Giay Street, Hanoi' },
    { city: 'Ho Chi Minh City', prefix: 'SG', dist: 'District 1, Ho Chi Minh City', addr: 'Nguyen Hue Boulevard, District 1, Ho Chi Minh City' },
    { city: 'Da Nang', prefix: 'DN', dist: 'Hai Chau, Da Nang', addr: 'Tran Phu Street, Hai Chau, Da Nang' },
    { city: 'Hai Phong', prefix: 'HP', dist: 'Ngo Quyen, Hai Phong', addr: 'Le Loi Street, Ngo Quyen, Hai Phong' },
    { city: 'Binh Duong', prefix: 'BD', dist: 'Thu Dau Mot, Binh Duong', addr: 'Binh Duong Boulevard, Thu Dau Mot, Binh Duong' },
    { city: 'Bac Ninh', prefix: 'BN', dist: 'Yen Phong, Bac Ninh', addr: 'Yen Phong Industrial Park Residence, Bac Ninh' },
    { city: 'Dong Nai', prefix: 'DN', dist: 'Bien Hoa, Dong Nai', addr: 'Vo Nguyen Giap Street, Bien Hoa, Dong Nai' },
    { city: 'Can Tho', prefix: 'CT', dist: 'Ninh Kieu, Can Tho', addr: '30 Thang 4 Street, Ninh Kieu, Can Tho' },
];

const bankNames = ['Vietcombank', 'Techcombank', 'BIDV', 'ACB', 'MB Bank', 'VPBank', 'TPBank', 'Sacombank'];

const roleStructure = [
    // BOD (3)
    { dept: 'BOD', pos: 'Chief Executive Officer', salary: 75000000, role: ROLES.ADMIN, count: 1 },
    { dept: 'BOD', pos: 'Chief Operating Officer', salary: 65000000, role: ROLES.ADMIN, count: 1 },
    { dept: 'BOD', pos: 'Chief Technology Officer', salary: 60000000, role: ROLES.ADMIN, count: 1 },

    // HR (10)
    { dept: 'HR', pos: 'Head of Human Resources', salary: 38000000, role: ROLES.HR, count: 1 },
    { dept: 'HR', pos: 'Senior HR Business Partner', salary: 26000000, role: ROLES.HR, count: 2 },
    { dept: 'HR', pos: 'Talent Acquisition Lead', salary: 24000000, role: ROLES.HR, count: 2 },
    { dept: 'HR', pos: 'Payroll and Benefits Specialist', salary: 22000000, role: ROLES.HR, count: 2 },
    { dept: 'HR', pos: 'HR Operations Officer', salary: 15000000, role: ROLES.EMPLOYEE, count: 3 },

    // FIN (10)
    { dept: 'FIN', pos: 'Chief Financial Officer', salary: 50000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'FIN', pos: 'Senior Chief Accountant', salary: 32000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'FIN', pos: 'Financial Planning Analyst', salary: 24000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'FIN', pos: 'General Accountant', salary: 18500000, role: ROLES.EMPLOYEE, count: 3 },
    { dept: 'FIN', pos: 'Accounts Payable Specialist', salary: 16000000, role: ROLES.EMPLOYEE, count: 3 },

    // IT (12)
    { dept: 'IT', pos: 'Head of Information Technology', salary: 45000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'IT', pos: 'Senior DevOps Architect', salary: 36000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'IT', pos: 'Senior Backend Engineer', salary: 30000000, role: ROLES.EMPLOYEE, count: 3 },
    { dept: 'IT', pos: 'Frontend & UI Specialist', salary: 26000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'IT', pos: 'Cybersecurity Analyst', salary: 28000000, role: ROLES.EMPLOYEE, count: 1 },
    { dept: 'IT', pos: 'IT Support & Systems Admin', salary: 18000000, role: ROLES.EMPLOYEE, count: 3 },

    // RND (12)
    { dept: 'RND', pos: 'Director of R&D', salary: 52000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'RND', pos: 'Lead IoT Hardware Engineer', salary: 35000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'RND', pos: 'Senior Embedded Firmware Engineer', salary: 32000000, role: ROLES.EMPLOYEE, count: 3 },
    { dept: 'RND', pos: 'AI & Computer Vision Specialist', salary: 34000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'RND', pos: 'Product Prototype Engineer', salary: 22000000, role: ROLES.EMPLOYEE, count: 4 },

    // OPS & PRD Management (6)
    { dept: 'OPS', pos: 'Operations Director', salary: 48000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'PRD', pos: 'Production General Manager', salary: 40000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'PRD', pos: 'Master Production Scheduler', salary: 26000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'PRD', pos: 'Industrial Process Engineer', salary: 24000000, role: ROLES.EMPLOYEE, count: 2 },

    // ASMA Assembly Line 01 (35)
    { dept: 'ASMA', pos: 'Assembly Line 01 Supervisor', salary: 24000000, role: ROLES.MANAGER, count: 2 },
    { dept: 'ASMA', pos: 'Assembly Shift Leader', salary: 18000000, role: ROLES.EMPLOYEE, count: 3 },
    { dept: 'ASMA', pos: 'Senior SMT Machine Operator', salary: 15500000, role: ROLES.EMPLOYEE, count: 6 },
    { dept: 'ASMA', pos: 'Precision Assembly Operator', salary: 12500000, role: ROLES.EMPLOYEE, count: 24 },

    // ASMB Assembly Line 02 (35)
    { dept: 'ASMB', pos: 'Assembly Line 02 Supervisor', salary: 24000000, role: ROLES.MANAGER, count: 2 },
    { dept: 'ASMB', pos: 'Assembly Shift Leader', salary: 18000000, role: ROLES.EMPLOYEE, count: 3 },
    { dept: 'ASMB', pos: 'Senior Mechanical Operator', salary: 15500000, role: ROLES.EMPLOYEE, count: 6 },
    { dept: 'ASMB', pos: 'Mechanical Assembly Operator', salary: 12500000, role: ROLES.EMPLOYEE, count: 24 },

    // PKGA Packaging Line 01 (20)
    { dept: 'PKGA', pos: 'Packaging Line 01 Supervisor', salary: 22000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'PKGA', pos: 'Packaging Line Leader', salary: 17000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'PKGA', pos: 'Automated Sealer Operator', salary: 14500000, role: ROLES.EMPLOYEE, count: 4 },
    { dept: 'PKGA', pos: 'Packaging Operator', salary: 12000000, role: ROLES.EMPLOYEE, count: 13 },

    // PKGB Packaging Line 02 (20)
    { dept: 'PKGB', pos: 'Packaging Line 02 Supervisor', salary: 22000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'PKGB', pos: 'Packaging Line Leader', salary: 17000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'PKGB', pos: 'Bulk Palletizer Operator', salary: 14500000, role: ROLES.EMPLOYEE, count: 4 },
    { dept: 'PKGB', pos: 'Packaging Operator', salary: 12000000, role: ROLES.EMPLOYEE, count: 13 },

    // QA Quality (15)
    { dept: 'QA', pos: 'Quality Assurance Manager', salary: 35000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'QA', pos: 'Lead Quality Engineer', salary: 25000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'QA', pos: 'Reliability Lab Specialist', salary: 20000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'QA', pos: 'Senior Incoming Quality Inspector', salary: 16500000, role: ROLES.EMPLOYEE, count: 4 },
    { dept: 'QA', pos: 'In-Line Quality Inspector', salary: 14000000, role: ROLES.EMPLOYEE, count: 6 },

    // MNT Maintenance (14)
    { dept: 'MNT', pos: 'Facility & Engineering Manager', salary: 33000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'MNT', pos: 'Chief Automation Engineer', salary: 26000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'MNT', pos: 'Senior Electrical Technician', salary: 18500000, role: ROLES.EMPLOYEE, count: 4 },
    { dept: 'MNT', pos: 'Mechanical Maintenance Technician', salary: 16500000, role: ROLES.EMPLOYEE, count: 7 },

    // WHL Warehouse & Logistics (16)
    { dept: 'WHL', pos: 'Warehouse Logistics Manager', salary: 30000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'WHL', pos: 'Inventory Control Supervisor', salary: 21000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'WHL', pos: 'Logistics Dispatcher', salary: 17000000, role: ROLES.EMPLOYEE, count: 3 },
    { dept: 'WHL', pos: 'Certified Forklift Operator', salary: 14500000, role: ROLES.EMPLOYEE, count: 5 },
    { dept: 'WHL', pos: 'Warehouse Material Clerk', salary: 13000000, role: ROLES.EMPLOYEE, count: 5 },

    // SCM Supply Chain (6)
    { dept: 'SCM', pos: 'Supply Chain Manager', salary: 32000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'SCM', pos: 'Senior Strategic Sourcing Specialist', salary: 23000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'SCM', pos: 'Purchasing & Customs Officer', salary: 17500000, role: ROLES.EMPLOYEE, count: 3 },

    // CS Customer Support (5)
    { dept: 'CS', pos: 'Customer Support Lead', salary: 25000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'CS', pos: 'Senior Technical Helpdesk Engineer', salary: 19000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'CS', pos: 'Customer Operations Specialist', salary: 15000000, role: ROLES.EMPLOYEE, count: 2 },

    // MKT Marketing (4)
    { dept: 'MKT', pos: 'Marketing Director', salary: 35000000, role: ROLES.MANAGER, count: 1 },
    { dept: 'MKT', pos: 'Brand & Content Strategist', salary: 22000000, role: ROLES.EMPLOYEE, count: 2 },
    { dept: 'MKT', pos: 'Digital Growth Specialist', salary: 18000000, role: ROLES.EMPLOYEE, count: 1 },
];

function dateOnly(value) {
    const d = new Date(value);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(date, days) {
    const res = new Date(date);
    res.setUTCDate(res.getUTCDate() + days);
    return res;
}

function buildTimestamp(workDateUTC, timeString, offsetMins = 0) {
    const [h, m] = timeString.split(':').map(Number);
    const d = new Date(workDateUTC);
    // Convert VN time (UTC+7) to UTC
    const utcHours = (h - 7 + 24) % 24;
    let dayAdjustment = h < 7 ? -1 : 0;
    d.setUTCDate(d.getUTCDate() + dayAdjustment);
    d.setUTCHours(utcHours, m + offsetMins, 0, 0);
    return d;
}

async function runSeed() {
    console.log('====================================================');
    console.log('STARTING ENTERPRISE LARGE-SCALE DATABASE SEEDING');
    console.log('Target: 220+ Employees, 6 Months Attendance, Full HR');
    console.log('====================================================');

    await connectDB();

    // Clear old data except admin user if exists
    console.log('Clearing existing collections...');
    await Promise.all([
        Employee.deleteMany({}),
        Department.deleteMany({}),
        EmployeePosition.deleteMany({}),
        Shift.deleteMany({}),
        ShiftAssignment.deleteMany({}),
        Attendance.deleteMany({}),
        Overtime.deleteMany({}),
        Contract.deleteMany({}),
        ContractTemplate.deleteMany({}),
        Payroll.deleteMany({}),
        LeaveRequest.deleteMany({}),
        User.deleteMany({}),
        Asset.deleteMany({}),
        Training.deleteMany({}),
        Device.deleteMany({}),
    ]);

    // 1. Seed Contract Templates
    console.log('Seeding contract templates...');
    const templateDocs = await ContractTemplate.insertMany([
        {
            name: 'Standard Probation Agreement',
            description: 'Standard probationary agreement for 2 months under Labor Code',
            contract_type_match: 'Probation',
            is_default: true,
            html_content: '<div class="contract"><h1>PROBATION AGREEMENT</h1><p>Party A: {{COMPANY_NAME}}</p><p>Party B: {{EMPLOYEE_NAME}}</p><p>Position: {{JOB_TITLE}}</p><p>Salary: {{BASE_SALARY}} VND</p></div>',
        },
        {
            name: 'Fixed-Term Employment Contract (1-3 Years)',
            description: 'Official fixed-term contract with full benefits and social insurance',
            contract_type_match: 'Fixed-term',
            is_default: true,
            html_content: '<div class="contract"><h1>EMPLOYMENT CONTRACT</h1><p>Party A: {{COMPANY_NAME}}</p><p>Party B: {{EMPLOYEE_NAME}}</p><p>Position: {{JOB_TITLE}}</p><p>Base Salary: {{BASE_SALARY}} VND</p></div>',
        },
        {
            name: 'Indefinite-Term Employment Contract',
            description: 'Permanent employment contract for long-term personnel',
            contract_type_match: 'Indefinite',
            is_default: true,
            html_content: '<div class="contract"><h1>INDEFINITE EMPLOYMENT CONTRACT</h1><p>Party A: {{COMPANY_NAME}}</p><p>Party B: {{EMPLOYEE_NAME}}</p><p>Permanent Tenure</p></div>',
        },
    ]);
    const templateMap = new Map(templateDocs.map(t => [t.contract_type_match, t._id]));

    // 2. Seed Shifts
    console.log('Seeding shifts...');
    const shiftDocs = await Shift.insertMany(shiftDefs);
    const shiftMap = new Map(shiftDocs.map(s => [s.shift_name, s]));

    // 3. Seed Departments
    console.log('Seeding departments...');
    const deptDocMap = new Map();
    // First pass: Level 0
    for (const d of departmentDefs.filter(x => x.level === 0)) {
        const doc = await Department.create({
            department_name: d.name,
            department_code: d.code,
            parent_id: null,
            level: 0,
            description: d.desc,
        });
        deptDocMap.set(d.code, doc);
    }
    // Second pass: Level 1
    for (const d of departmentDefs.filter(x => x.level === 1)) {
        const parent = deptDocMap.get(d.parent);
        const doc = await Department.create({
            department_name: d.name,
            department_code: d.code,
            parent_id: parent ? parent._id : null,
            level: 1,
            description: d.desc,
        });
        deptDocMap.set(d.code, doc);
    }
    // Third pass: Level 2
    for (const d of departmentDefs.filter(x => x.level === 2)) {
        const parent = deptDocMap.get(d.parent);
        const doc = await Department.create({
            department_name: d.name,
            department_code: d.code,
            parent_id: parent ? parent._id : null,
            level: 2,
            description: d.desc,
        });
        deptDocMap.set(d.code, doc);
    }

    // 4. Generate 220+ Employees
    console.log('Generating 220+ employee profiles...');
    const employeesToInsert = [];
    const rawEmployeeConfigs = [];
    let empCodeCounter = 1;

    let fnIdx = 0;
    let mnMIdx = 0;
    let mnFIdx = 0;
    let lnMIdx = 0;
    let lnFIdx = 0;
    let cityIdx = 0;
    let bankIdx = 0;

    for (const group of roleStructure) {
        for (let i = 0; i < group.count; i++) {
            const code = `EMP${String(empCodeCounter).padStart(3, '0')}`;
            empCodeCounter++;

            const isFemale = (empCodeCounter % 3 === 0) || (group.dept === 'HR' && i % 2 === 0) || (group.dept === 'FIN' && i % 2 === 0) || (group.dept.startsWith('PKG') && i % 2 === 1);
            const gender = isFemale ? 'Female' : 'Male';
            const fn = firstNames[fnIdx % firstNames.length];
            fnIdx++;
            let mn, ln;
            if (isFemale) {
                mn = middleNamesFemale[mnFIdx % middleNamesFemale.length];
                ln = lastNamesFemale[lnFIdx % lastNamesFemale.length];
                mnFIdx++;
                lnFIdx++;
            } else {
                mn = middleNamesMale[mnMIdx % middleNamesMale.length];
                ln = lastNamesMale[lnMIdx % lastNamesMale.length];
                mnMIdx++;
                lnMIdx++;
            }
            const fullName = `${fn} ${mn} ${ln}`;
            const cleanSlug = `${ln.toLowerCase()}.${fn.toLowerCase()}${empCodeCounter}`;

            const birthYear = 1978 + (empCodeCounter % 24);
            const birthMonth = (empCodeCounter % 12) + 1;
            const birthDay = (empCodeCounter % 27) + 1;
            const dob = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));

            const cityObj = cities[cityIdx % cities.length];
            cityIdx++;
            const bankName = bankNames[bankIdx % bankNames.length];
            bankIdx++;

            // Hire dates between 2019 and 2025
            const hireYear = 2019 + (empCodeCounter % 7);
            const hireMonth = (empCodeCounter % 12);
            const hireDay = 1 + (empCodeCounter % 20);
            const hireDate = new Date(Date.UTC(hireYear, hireMonth, hireDay));

            // Status distribution: ~95% Active, ~3% Inactive, ~2% Terminated
            let status = 'Active';
            if (empCodeCounter > 218) status = 'Terminated';
            else if (empCodeCounter > 212) status = 'Inactive';

            const deptDoc = deptDocMap.get(group.dept);

            const empObj = {
                employee_code: code,
                full_name: fullName,
                date_of_birth: dob,
                gender,
                place_of_birth: cityObj.city,
                identity: {
                    number: `0${String(300000000 + empCodeCounter).padStart(11, '0')}`,
                    issue_date: new Date(Date.UTC(2021, 5, 15)),
                    issue_place: 'Police Department of Administrative Management',
                },
                contact: {
                    phone: `09${String(10000000 + empCodeCounter * 37).slice(0, 8)}`,
                    email: `${cleanSlug}@company.local`,
                    permanent_address: `${10 + empCodeCounter} ${cityObj.addr}`,
                    current_address: `${100 + empCodeCounter} ${cityObj.dist}`,
                },
                position: group.pos,
                department: deptDoc ? deptDoc.department_name : group.dept,
                insurance: {
                    tax_code: `80${String(10000000 + empCodeCounter * 23).slice(0, 8)}`,
                    social_insurance: `SI-${String(9000000 + empCodeCounter * 17).slice(0, 7)}`,
                    health_insurance: `HI-${String(8000000 + empCodeCounter * 19).slice(0, 7)}`,
                },
                bank_accounts: [{
                    bank_name: bankName,
                    account_number: `9704${String(100000000000 + empCodeCounter * 9876).slice(0, 12)}`,
                    is_primary: true,
                }],
                status,
                hire_date: hireDate,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanSlug}`,
                face_data: [{
                    label: fullName,
                    image_path: `/faces/dataset/${code.toLowerCase()}.jpg`,
                    provider: 'kiosk_v2',
                    created_at: hireDate,
                }],
            };

            employeesToInsert.push(empObj);
            rawEmployeeConfigs.push({
                code,
                deptCode: group.dept,
                position: group.pos,
                baseSalary: group.salary,
                role: group.role,
                status,
            });
        }
    }

    const insertedEmployees = await Employee.insertMany(employeesToInsert);
    console.log(`Successfully created ${insertedEmployees.length} employee records.`);
    const empByCode = new Map(insertedEmployees.map(e => [e.employee_code, e]));

    // Assign Managers to Departments
    for (const [deptCode, deptDoc] of deptDocMap.entries()) {
        const mgrConfig = rawEmployeeConfigs.find(c => c.deptCode === deptCode && (c.role === ROLES.MANAGER || c.position.includes('Head') || c.position.includes('Director') || c.position.includes('Supervisor')));
        if (mgrConfig) {
            const mgrEmp = empByCode.get(mgrConfig.code);
            if (mgrEmp) {
                deptDoc.manager_id = mgrEmp._id;
                await deptDoc.save();
            }
        }
    }

    // 5. Seed Users & Accounts
    console.log('Seeding users and credentials...');
    const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const usersToInsert = [];

    // Main System Admin
    const ceoEmp = insertedEmployees[0];
    usersToInsert.push({
        employee_id: ceoEmp._id,
        username: 'admin',
        password_hash: defaultPasswordHash,
        roles: [ROLES.ADMIN],
        is_active: true,
    });

    // Department Leads, HR, Managers & Power Users
    for (const config of rawEmployeeConfigs) {
        const emp = empByCode.get(config.code);
        const shouldHaveAccount = config.role !== ROLES.EMPLOYEE || Number(config.code.slice(3)) <= 60;
        if (shouldHaveAccount) {
            const username = config.code.toLowerCase();
            const roles = config.role === ROLES.ADMIN ? [ROLES.ADMIN, ROLES.MANAGER] :
                          config.role === ROLES.HR ? [ROLES.HR, ROLES.MANAGER] :
                          config.role === ROLES.MANAGER ? [ROLES.MANAGER] : [ROLES.EMPLOYEE];

            usersToInsert.push({
                employee_id: emp._id,
                username,
                password_hash: defaultPasswordHash,
                roles,
                is_active: config.status === 'Active',
            });
        }
    }

    const insertedUsers = await User.insertMany(usersToInsert);
    console.log(`Created ${insertedUsers.length} user login accounts.`);
    const reviewerUser = insertedUsers.find(u => u.username === 'emp004') || insertedUsers[0];

    // 6. Seed EmployeePositions & Contracts
    console.log('Seeding employment positions and contracts...');
    const positionsToInsert = [];
    const contractsToInsert = [];

    for (const config of rawEmployeeConfigs) {
        const emp = empByCode.get(config.code);
        const deptDoc = deptDocMap.get(config.deptCode);

        positionsToInsert.push({
            employee_id: emp._id,
            department_id: deptDoc ? deptDoc._id : null,
            position_name: config.position,
            start_date: emp.hire_date,
            end_date: null,
            is_current: true,
        });

        const allowanceMeal = 730000;
        const allowancePos = config.baseSalary >= 40000000 ? 5000000 : config.baseSalary >= 25000000 ? 2500000 : config.baseSalary >= 16000000 ? 1200000 : 500000;
        const contractType = config.baseSalary >= 30000000 ? 'Indefinite' : 'Fixed-term';

        contractsToInsert.push({
            employee_id: emp._id,
            type: contractType,
            start_date: emp.hire_date,
            end_date: contractType === 'Fixed-term' ? addDays(emp.hire_date, 365 * 3) : null,
            base_salary: config.baseSalary,
            allowances: [
                { name: 'Lunch and Meal Allowance', amount: allowanceMeal },
                { name: 'Position Responsibility Allowance', amount: allowancePos },
                { name: 'Transport & Fuel Allowance', amount: 500000 },
            ],
            status: config.status === 'Terminated' ? 'Terminated' : 'Signed',
            template_id: templateMap.get(contractType) || null,
        });
    }

    await EmployeePosition.insertMany(positionsToInsert);
    await Contract.insertMany(contractsToInsert);
    console.log(`Positions and contracts initialized for ${insertedEmployees.length} employees.`);

    // 7. Seed 6 Months of Shift Assignments & Attendance (180 Days!)
    console.log('Generating 6 months (180 days) of Attendance and Shift Assignments...');
    console.log('This will create realistic on-time, late, overtime and missing checkouts...');

    const today = dateOnly(new Date());
    const workingDays = [];
    for (let offset = 180; offset >= 0; offset--) {
        const day = addDays(today, -offset);
        workingDays.push(day);
    }

    const activeEmployees = insertedEmployees.filter(e => e.status === 'Active');
    console.log(`Active employee pool: ${activeEmployees.length} personnel across 180 days.`);

    const assignmentBatches = [];
    const attendanceBatches = [];

    const officeShift = shiftMap.get('Standard Office Shift');
    const morningShift = shiftMap.get('Morning Shift (Line)');
    const afternoonShift = shiftMap.get('Afternoon Shift (Line)');
    const nightShift = shiftMap.get('Night Shift (Line)');
    const day12hShift = shiftMap.get('12H Day Shift (Production)');
    const whShift = shiftMap.get('Warehouse Logistics Shift');

    let totalAttendanceCount = 0;
    let totalAssignmentsCount = 0;

    for (let dayIdx = 0; dayIdx < workingDays.length; dayIdx++) {
        const workDate = workingDays[dayIdx];
        const dayOfWeek = workDate.getUTCDay(); // 0 = Sun, 6 = Sat

        for (let empIdx = 0; empIdx < activeEmployees.length; empIdx++) {
            const emp = activeEmployees[empIdx];
            const cfg = rawEmployeeConfigs[empIdx];
            const dept = cfg.deptCode;

            // Determine Shift for Employee
            let shift = officeShift;
            let isOffDay = (dayOfWeek === 0); // Sunday standard off

            if (['ASMA', 'ASMB', 'PKGA', 'PKGB'].includes(dept)) {
                // 3 shifts rotation
                const cycle = (dayIdx + empIdx) % 3;
                shift = cycle === 0 ? morningShift : cycle === 1 ? afternoonShift : nightShift;
                isOffDay = (dayIdx % 7 === 0);
            } else if (dept === 'PRD' || dept === 'MNT') {
                shift = (dayIdx + empIdx) % 2 === 0 ? day12hShift : officeShift;
                isOffDay = (dayIdx % 7 === 0);
            } else if (dept === 'WHL') {
                shift = whShift;
                isOffDay = (dayOfWeek === 0);
            } else {
                // Office (HR, FIN, IT, BOD, RND, SCM, CS, MKT)
                shift = officeShift;
                isOffDay = (dayOfWeek === 0 || dayOfWeek === 6); // Sat & Sun off
            }

            // Always create ShiftAssignment on non-off days or planned working days
            if (!isOffDay || (dayIdx + empIdx) % 19 === 0) { // occasional weekend shift
                assignmentBatches.push({
                    employee_id: emp._id,
                    shift_id: shift._id,
                    work_date: workDate,
                });
                totalAssignmentsCount++;

                // If today is the current day, handle ongoing shift
                const isToday = (dayIdx === workingDays.length - 1);

                // Probability of attendance record
                const skipCheckin = (dayIdx + empIdx) % 31 === 0; // occasional authorized leave / absence
                if (!skipCheckin) {
                    const isLate = (dayIdx + empIdx) % 11 === 0;
                    const lateMins = isLate ? 5 + ((dayIdx + empIdx) % 25) : 0;
                    const isMissingCheckout = !isToday && ((dayIdx + empIdx) % 47 === 0);
                    const isEarlyCheckout = !isMissingCheckout && ((dayIdx + empIdx) % 29 === 0);
                    const earlyMins = isEarlyCheckout ? -15 : 0;

                    const checkInTime = buildTimestamp(workDate, shift.start_time, lateMins > 0 ? lateMins : -Math.min(10, empIdx % 12));
                    let checkOutTime = buildTimestamp(workDate, shift.end_time, earlyMins);

                    if (shift.is_night_shift) {
                        checkOutTime = addDays(checkOutTime, 1);
                    }

                    // Overtime calculation
                    let workedHours = shift.standard_hours;
                    let otHours = 0;
                    if ((dayIdx + empIdx) % 9 === 0 && !isToday) {
                        otHours = 1.5 + ((dayIdx + empIdx) % 3) * 0.5; // 1.5, 2.0, 2.5 hrs
                        checkOutTime = new Date(checkOutTime.getTime() + otHours * 3600 * 1000);
                        workedHours += otHours;
                    }

                    let status = 'CheckedOut';
                    if (isToday) {
                        status = 'CheckedIn';
                        checkOutTime = null;
                        workedHours = 4;
                    } else if (isMissingCheckout) {
                        status = 'MissingCheckout';
                        checkOutTime = null;
                        workedHours = 0;
                        otHours = 0;
                    }

                    attendanceBatches.push({
                        employee_id: emp._id,
                        shift_id: shift._id,
                        work_date: workDate,
                        check_in: checkInTime,
                        check_out: checkOutTime,
                        worked_hours: workedHours,
                        ot_hours: otHours,
                        late_minutes: lateMins,
                        status,
                        method: (dayIdx + empIdx) % 13 === 0 ? 'manual' : 'face',
                        check_in_face_image: `/faces/kiosk_logs/${emp.employee_code.toLowerCase()}_in_${dayIdx}.jpg`,
                        check_out_face_image: checkOutTime ? `/faces/kiosk_logs/${emp.employee_code.toLowerCase()}_out_${dayIdx}.jpg` : null,
                    });
                    totalAttendanceCount++;
                }
            }

            // Flush batches in chunks of 2500 docs for performance
            if (assignmentBatches.length >= 2500) {
                await ShiftAssignment.insertMany(assignmentBatches);
                assignmentBatches.length = 0;
            }
            if (attendanceBatches.length >= 2500) {
                await Attendance.insertMany(attendanceBatches);
                attendanceBatches.length = 0;
            }
        }
    }

    // Flush remaining
    if (assignmentBatches.length > 0) {
        await ShiftAssignment.insertMany(assignmentBatches);
    }
    if (attendanceBatches.length > 0) {
        await Attendance.insertMany(attendanceBatches);
    }

    console.log(`Inserted ${totalAssignmentsCount} shift assignments and ${totalAttendanceCount} attendance logs across 180 days.`);

    // 8. Seed Overtime Requests
    console.log('Seeding Overtime Requests...');
    const otList = [];
    for (let i = 0; i < activeEmployees.length; i++) {
        const emp = activeEmployees[i];
        if (i % 3 === 0) {
            for (let k = 1; k <= 3; k++) {
                const reqDate = addDays(today, -(k * 40 + (i % 15)));
                const isApproved = (i + k) % 7 !== 0;
                otList.push({
                    employee_id: emp._id,
                    work_date: reqDate,
                    hours: 2.0 + (i % 3),
                    type: (i + k) % 4 === 0 ? 'Weekend Overtime' : 'Weekday Overtime',
                    status: isApproved ? REQUEST_STATUS.APPROVED : REQUEST_STATUS.PENDING,
                    reason: `${SEED_TAG} Production acceleration and end-of-month target fulfillment`,
                    reviewed_by: isApproved ? reviewerUser._id : null,
                    reviewed_at: isApproved ? addDays(reqDate, 1) : null,
                    review_note: isApproved ? 'Approved based on departmental production plan.' : null,
                });
            }
        }
    }
    await Overtime.insertMany(otList);
    console.log(`Created ${otList.length} overtime request records.`);

    // 9. Seed Leave Requests
    console.log('Seeding Leave Requests...');
    const leaveTypes = ['Annual Leave', 'Sick Leave', 'Compensatory Leave', 'Unpaid Leave'];
    const leaveList = [];
    for (let i = 0; i < activeEmployees.length; i++) {
        const emp = activeEmployees[i];
        if (i % 4 === 0) {
            for (let k = 1; k <= 2; k++) {
                const startDate = addDays(today, -(k * 60 + (i % 20)));
                const days = (i + k) % 3 === 0 ? 2 : 1;
                const isApproved = (i + k) % 5 !== 0;
                leaveList.push({
                    employee_id: emp._id,
                    type: leaveTypes[(i + k) % leaveTypes.length],
                    start_date: startDate,
                    end_date: addDays(startDate, days - 1),
                    total_days: days,
                    status: isApproved ? REQUEST_STATUS.APPROVED : REQUEST_STATUS.PENDING,
                    reason: `${SEED_TAG} Personal planned leave and family matter`,
                    reviewed_by: isApproved ? reviewerUser._id : null,
                    reviewed_at: isApproved ? addDays(startDate, -2) : null,
                    review_note: isApproved ? 'Staffing coverage verified. Leave approved.' : null,
                });
            }
        }
    }
    await LeaveRequest.insertMany(leaveList);
    console.log(`Created ${leaveList.length} leave requests.`);

    // 10. Seed 6 Months of Payroll for All Employees
    console.log('Generating 6 months of historical payroll calculations...');
    const payrollList = [];
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth() + 1; // 1-12

    for (let mOffset = 5; mOffset >= 0; mOffset--) {
        let m = currentMonth - mOffset;
        let y = currentYear;
        if (m <= 0) {
            m += 12;
            y -= 1;
        }

        const isCurrentOngoingMonth = (mOffset === 0);

        for (let i = 0; i < insertedEmployees.length; i++) {
            const emp = insertedEmployees[i];
            const cfg = rawEmployeeConfigs[i];
            if (emp.status === 'Terminated' && mOffset <= 1) continue;

            const baseSalary = cfg.baseSalary;
            const allowance = baseSalary >= 30000000 ? 5500000 : baseSalary >= 18000000 ? 2500000 : 1500000;
            const standardHours = 176;
            const workHours = isCurrentOngoingMonth ? 130 : 168 + ((i + m) % 9);
            const otHours = ((i + m) % 3 === 0) ? 6 + (i % 8) : 0;
            const hourlyRate = baseSalary / standardHours;
            const overtimeSalary = Math.round(otHours * hourlyRate * 1.5);

            // Deductions (PIT tax + Social Insurance 10.5%)
            const socialInsuranceDeduction = Math.round(Math.min(baseSalary, 36000000) * 0.105);
            const taxableIncome = Math.max(0, baseSalary + allowance - 11000000 - socialInsuranceDeduction);
            const pitTax = taxableIncome > 0 ? Math.round(taxableIncome * 0.1) : 0;
            const deduction = socialInsuranceDeduction + pitTax;

            const netSalary = Math.max(0, baseSalary + allowance + overtimeSalary - deduction);

            payrollList.push({
                employee_id: emp._id,
                month: m,
                year: y,
                total_work_hours: workHours,
                total_overtime_hours: otHours,
                basic_salary: baseSalary,
                overtime_salary: overtimeSalary,
                allowance,
                deduction,
                net_salary: netSalary,
                status: isCurrentOngoingMonth ? 'Draft' : 'Finalized',
                generated_at: addDays(new Date(Date.UTC(y, m - 1, 28)), 0),
                generated_by: reviewerUser._id,
                calculation_details: {
                    standard_month_hours: standardHours,
                    hourly_rate: Math.round(hourlyRate),
                    social_insurance_deduction: socialInsuranceDeduction,
                    tax_deduction: pitTax,
                    days_worked: Math.round(workHours / 8),
                    overtime_records_count: otHours > 0 ? 3 : 0,
                    seed_tag: SEED_TAG,
                },
            });
        }
    }
    await Payroll.insertMany(payrollList);
    console.log(`Calculated and seeded ${payrollList.length} payroll records across 6 months.`);

    // 11. Seed 150+ Physical Assets
    console.log('Seeding 150+ enterprise hardware and industrial assets...');
    const assetCategories = [
        { cat: 'Laptop', names: ['Lenovo ThinkPad T14 Gen 4', 'Dell Latitude 7440', 'MacBook Pro 14 M3', 'HP EliteBook 840 G10'], cost: 26000000 },
        { cat: 'Desktop', names: ['Dell OptiPlex 7010 Tower', 'HP EliteDesk 800 G9 Workstation', 'Custom CAD Design Workstation'], cost: 22000000 },
        { cat: 'Tablet', names: ['Zebra TC57 Industrial Terminal', 'Apple iPad Air 11" QC Kit', 'Samsung Galaxy Tab Active4 Pro'], cost: 16500000 },
        { cat: 'Peripherals', names: ['Dell UltraSharp 27" 4K Monitor', 'Honeywell Industrial 2D Scanner', 'Zebra ZT411 Barcode Printer'], cost: 7500000 },
        { cat: 'Storage', names: ['Synology Enterprise NAS Rack 48TB', 'High-Speed SAN Storage Array'], cost: 45000000 },
    ];

    const assetList = [];
    for (let i = 1; i <= 160; i++) {
        const catObj = assetCategories[i % assetCategories.length];
        const assetName = `${catObj.names[i % catObj.names.length]} #${String(i).padStart(3, '0')}`;
        const serial = `ASSET-${catObj.cat.slice(0, 3).toUpperCase()}-${String(1000 + i)}`;
        const assignedEmp = (i <= activeEmployees.length) ? activeEmployees[i - 1] : null;

        let status = 'Available';
        if (assignedEmp) status = 'Assigned';
        else if (i % 7 === 0) status = 'Maintenance';

        assetList.push({
            asset_name: assetName,
            category: catObj.cat,
            serial_number: serial,
            status,
            assigned_to: assignedEmp ? assignedEmp._id : null,
            assigned_date: assignedEmp ? addDays(today, -(i * 2 + 10)) : null,
            purchase_date: addDays(today, -(400 + i * 3)),
            purchase_cost: catObj.cost + (i % 5) * 1000000,
            warranty_until: addDays(today, 365 * 2 - i),
            location: ['Main Plant A', 'Main Plant B', 'HQ Floor 3', 'Central Warehouse', 'R&D Laboratory', 'IT Server Room'][i % 6],
            notes: `${SEED_TAG} Enterprise tracked device`,
        });
    }
    await Asset.insertMany(assetList);
    console.log(`Created ${assetList.length} physical assets.`);

    // 12. Seed 14 IoT Face Kiosks & Hardware Terminals
    console.log('Seeding 14 IoT Face Recognition Terminals...');
    const devicesList = [
        { name: 'Main Gate Face Terminal 01', ip: '192.168.1.101', port: 8081, loc: 'Main Security Gate Entrance' },
        { name: 'Main Gate Face Terminal 02', ip: '192.168.1.102', port: 8082, loc: 'Main Security Gate Exit' },
        { name: 'Plant 1 Turnstile Kiosk A', ip: '192.168.2.110', port: 8080, loc: 'Assembly Line 01 Air Shower Lobby' },
        { name: 'Plant 1 Turnstile Kiosk B', ip: '192.168.2.111', port: 8080, loc: 'Assembly Line 02 Entrance' },
        { name: 'Plant 2 Packaging Gate Kiosk', ip: '192.168.2.120', port: 8080, loc: 'Packaging Plant Main Lobby' },
        { name: 'Warehouse Loading Dock Terminal', ip: '192.168.3.150', port: 8080, loc: 'Warehouse Bay 4 Logistics Entrance' },
        { name: 'R&D High-Security Biometric Door', ip: '192.168.4.201', port: 8443, loc: 'R&D Innovation Lab Security Door' },
        { name: 'Central Server Room Bio Scanner', ip: '192.168.4.202', port: 8443, loc: 'Data Center Tier 3 Entry' },
        { name: 'HQ 2nd Floor Office Kiosk', ip: '192.168.10.11', port: 8080, loc: 'HR & Finance Lobby' },
        { name: 'HQ 3rd Floor Executive Terminal', ip: '192.168.10.12', port: 8080, loc: 'Executive Boardroom Entrance' },
        { name: 'Staff Canteen Access Terminal 01', ip: '192.168.5.50', port: 8080, loc: 'Cafeteria Entrance North' },
        { name: 'Staff Canteen Access Terminal 02', ip: '192.168.5.51', port: 8080, loc: 'Cafeteria Entrance South' },
        { name: 'Maintenance Workshop Kiosk', ip: '192.168.2.190', port: 8080, loc: 'Engineering & Maintenance Workshop' },
        { name: 'Backup Mobile Kiosk Unit', ip: '192.168.9.99', port: 8080, loc: 'Mobile Inspection Standby Unit' },
    ];

    for (let i = 0; i < devicesList.length; i++) {
        const d = devicesList[i];
        await Device.create({
            device_name: d.name,
            ip_address: d.ip,
            port: d.port,
            location: d.loc,
            device_type: 'face',
            status: 'approved',
            can_access_db: true,
            last_sync: addDays(today, -1),
            metadata: {
                model: 'AI-FaceStation-Enterprise-4K',
                firmware: 'v3.8.4-prod',
                seed: SEED_TAG,
            },
        });
    }
    console.log(`Created ${devicesList.length} biometric face kiosks.`);

    // 13. Seed Training Courses & Enrollments
    console.log('Seeding Training Courses & Sessions...');
    const courses = [
        'ISO 9001:2015 Quality Management Systems in High-Tech Manufacturing',
        'Workplace Safety, Electrical Lockout-Tagout (LOTO) & PPE Protocols',
        'Enterprise Cybersecurity, Phishing Defense & Data Protection 2026',
        '5S Methodology & Kaizen Continuous Improvement Workshop',
        'Certified Forklift & Heavy Warehouse Equipment Operation',
        'Advanced Supervisory Leadership & Conflict Management for Line Leads',
        'ESD Protection & Cleanroom Protocols for Precision Assembly',
        'Fire Protection, Emergency Evacuation & Industrial First Aid',
    ];

    const trainingList = [];
    for (let i = 0; i < courses.length; i++) {
        const enrolledEmployees = activeEmployees.slice(i * 15, i * 15 + 25).map((e, idx) => ({
            employee_id: e._id,
            status: idx % 6 === 0 ? 'in_progress' : 'completed',
            score: idx % 6 === 0 ? 75 + (idx % 10) : 85 + (idx % 15),
        }));

        trainingList.push({
            course_name: courses[i],
            sessions: [
                {
                    start_date: addDays(today, -(90 - i * 10)),
                    end_date: addDays(today, -(88 - i * 10)),
                    employees: enrolledEmployees,
                },
                {
                    start_date: addDays(today, -(30 - i * 3)),
                    end_date: addDays(today, -(28 - i * 3)),
                    employees: enrolledEmployees.slice(0, 10),
                },
            ],
        });
    }
    await Training.insertMany(trainingList);
    console.log(`Created ${trainingList.length} training courses with employee sessions.`);

    console.log('====================================================');
    console.log('LARGE-SCALE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Summary of Seeded Entities:');
    console.table({
        Employees: insertedEmployees.length,
        Departments: deptDocMap.size,
        Shifts: shiftDocs.length,
        Users: insertedUsers.length,
        Positions: positionsToInsert.length,
        Contracts: contractsToInsert.length,
        AttendanceLogs: totalAttendanceCount,
        ShiftAssignments: totalAssignmentsCount,
        OvertimeRequests: otList.length,
        LeaveRequests: leaveList.length,
        PayrollRecords: payrollList.length,
        Assets: assetList.length,
        Devices: devicesList.length,
        Trainings: trainingList.length,
    });
    console.log(`Default credentials for admin: username 'admin' | password: '${DEFAULT_PASSWORD}'`);
    console.log(`Default credentials for staff: username 'emp001', 'emp002'... | password: '${DEFAULT_PASSWORD}'`);
    console.log('====================================================');
}

if (require.main === module) {
    runSeed()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Error seeding large scale data:', err);
            process.exit(1);
        });
}

module.exports = runSeed;
