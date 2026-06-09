const axios = require('axios');
const {
    Asset,
    Attendance,
    Contract,
    Employee,
    LeaveRequest,
    Overtime,
    Payroll,
    Shift,
    ShiftAssignment,
    Training,
} = require('../models');
const env = require('../config/env');

function startOfDay(date = new Date()) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function endOfDay(date = new Date()) {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
}

function getMonthRange(offset = 0) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
    return { start, end, month: start.getMonth() + 1, year: start.getFullYear(), label: `${start.getMonth() + 1}/${start.getFullYear()}` };
}

function getYearRange(year = new Date().getFullYear()) {
    return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
        year,
        label: String(year),
    };
}

function getWeekRange(offset = 0) {
    const now = new Date();
    const day = now.getDay() || 7;
    const start = startOfDay(now);
    start.setDate(start.getDate() - day + 1 + offset * 7);
    const end = endOfDay(start);
    end.setDate(end.getDate() + 6);
    return { start, end, type: 'week', label: offset === -1 ? 'tuần trước' : 'tuần này' };
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0111/g, 'd')
        .replace(/\u0110/g, 'D')
        .toLowerCase();
}

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toRegex(value) {
    return new RegExp(escapeRegex(value), 'i');
}

function workDateFromDate(value = new Date()) {
    const date = new Date(value);
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function getWorkDates(range) {
    const dates = [];
    const cursor = workDateFromDate(range.start);
    const end = workDateFromDate(range.end);
    while (cursor <= end) {
        dates.push(new Date(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
}

function parseHour(value) {
    const [hour] = String(value || '').split(':').map(Number);
    return Number.isFinite(hour) ? hour : null;
}

function isNightShiftConfig(shift) {
    if (shift?.is_night_shift) return true;
    const start = parseHour(shift?.start_time);
    const end = parseHour(shift?.end_time);
    if (start === null || end === null) return false;
    return start >= 18 || end <= 8 || start > end;
}

function getRequestedShiftKind(question) {
    const text = normalizeText(question);
    if (/(night shift|ca dem|ca toi|ca khuya|ca ban dem|lam dem|truc dem)/.test(text)) return 'night';
    if (/(day shift|morning shift|ca ngay|ca sang|ca hanh chinh|ca chieu)/.test(text)) return 'day';
    return null;
}

function parseTimeRange(question) {
    const text = normalizeText(question);
    
    // 1. Kiểm tra các mốc thời gian đặc biệt trước
    if (/hom nay|today/.test(text)) {
        return { start: startOfDay(), end: endOfDay(), type: 'today', label: 'hôm nay' };
    }
    if (/hom qua|yesterday/.test(text)) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday), type: 'day', label: 'hôm qua' };
    }
    if (/tuan truoc|last week/.test(text)) {
        return getWeekRange(-1);
    }
    if (/tuan nay|this week/.test(text)) {
        return getWeekRange(0);
    }
    if (/thang truoc|last month/.test(text)) {
        return { ...getMonthRange(-1), type: 'month' };
    }
    if (/nam nay|this year/.test(text)) {
        return { ...getYearRange(), type: 'year' };
    }

    // 2. Kiểm tra định dạng Tháng/Năm (Tháng 5/2026, 05-2026, May 2026)
    // Ưu tiên cái này trước vì định dạng 5/2026 thường bị nhầm thành ngày 5 tháng 2026 (lỗi)
    const monthYearRegex = /(?:thang|month|m)\s*(\d{1,2})(?:[\/\-\s]+(\d{4}))?/;
    const monthYearMatch = text.match(monthYearRegex);
    if (monthYearMatch && !text.includes('ngay') && !text.includes('date')) {
        const month = Math.max(1, Math.min(12, Number(monthYearMatch[1])));
        const year = Number(monthYearMatch[2] || new Date().getFullYear());
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        return { start, end, month, year, type: 'month', label: `${month}/${year}` };
    }

    // 3. Kiểm tra định dạng Ngày/Tháng/Năm (Ngay 5/12/2026, 05-12, 05/12/2026)
    const dayMonthYearRegex = /(?:ngay|date)?\s*(\d{1,2})\s*(?:thang|\/|-)\s*(\d{1,2})(?:\s*(?:nam|\/|-)\s*(\d{4}))?/;
    const dayMatch = text.match(dayMonthYearRegex);
    if (dayMatch) {
        const day = Math.max(1, Math.min(31, Number(dayMatch[1])));
        const month = Math.max(1, Math.min(12, Number(dayMatch[2])));
        const year = Number(dayMatch[3] || new Date().getFullYear());
        const date = new Date(year, month - 1, day);
        return {
            start: startOfDay(date),
            end: endOfDay(date),
            day, month, year,
            type: 'day',
            label: `${day}/${month}/${year}`,
        };
    }

    // 4. Kiểm tra định dạng Năm (Nam 2026, Year 2026)
    const yearMatch = text.match(/(?:nam|year)\s*(\d{4})/);
    if (yearMatch) {
        return { ...getYearRange(Number(yearMatch[1])), type: 'year' };
    }

    // Mặc định: Tháng hiện tại
    return { ...getMonthRange(0), type: 'month' };
}

function detectIntent(question) {
    const text = normalizeText(question);

    if (wantsAbsentEmployees(question)) return 'attendance_stats';
    if (/tro giup|help|hoi duoc gi|lam duoc gi|huong dan/.test(text)) return 'help';
    if (/(tai san|asset|laptop|desktop|thiet bi cap|serial|bao hanh)/.test(text)) return 'asset_stats';
    if (/(dao tao|training|khoa hoc|course)/.test(text)) return 'training_stats';
    if (/(hop dong|contract|het han|sap het han|ky hop dong)/.test(text)) return 'contract_stats';
    if (/(tang ca|overtime|ot\b|lam them)/.test(text)) return 'overtime_stats';
    if (/(luong|payroll|salary|thu nhap|chi phi|net salary)/.test(text)) return 'payroll_stats';
    if (/(nghi phep|leave|don nghi|phep)/.test(text)) return 'leave_stats';
    if (/(cham cong|di muon|late|vang|absent|khong di lam|khong cham cong|chua check.?in|chua check.?out|checkout|co mat|di lam|check.?in|attendance|gio lam)/.test(text)) return 'attendance_stats';
    if (/(bo phan|phong ban|department|phong|ban).*(nhan vien|employee|headcount|thong ke|thong tin|danh sach|hien thi|bao nhieu)|(?:thong ke|thong tin|danh sach|hien thi|toan bo|bao nhieu|so luong).*(nhan vien).*(bo phan|phong ban|department|phong|ban)|(?:thong ke|thong tin|danh sach|hien thi|toan bo|bao nhieu|so luong).*(bo phan|phong ban|department|phong|ban)/.test(text)) return 'department_stats';
    if (/(tim|search|tra cuu|hien thi|thong tin|danh sach|nhan vien|employee|ma nv|ma nhan vien)/.test(text)) return 'employee_search';
    return 'overview';
}

function extractAfterKeyword(question, keywords) {
    const source = String(question || '').trim();
    for (const keyword of keywords) {
        const regex = new RegExp(`${keyword}\\s+(.+)`, 'i');
        const match = source.match(regex);
        if (match?.[1]) return match[1];
    }
    return '';
}

function cleanTerm(value) {
    return String(value || '')
        .replace(/^(?:cua|của|thuoc|thuộc|la|là)\s+/i, '')
        .replace(/\s+(?:la gi|là gì|nhu the nao|như thế nào)$/i, '')
        .replace(/\s+(?:co|có|bao nhieu|bao nhiêu|gom|gồm|co nhung ai|có những ai|nhung ai|những ai|dang lam gi|đang làm gì).*$/i, '')
        .replace(/\s+(?:trong ngay|trong ngày|hom nay|hôm nay|hom qua|hôm qua|thang nay|tháng này|tuan nay|tuần này).*$/i, '')
        .replace(/[?!.]+$/g, '')
        .trim();
}

function extractDepartmentTerm(question) {
    const term = extractAfterKeyword(question, ['bộ phận', 'bo phan', 'phòng ban', 'phong ban', 'department', 'phòng', 'phong']);
    return cleanTerm(term);
}

function extractSearchTerm(question) {
    const term = extractAfterKeyword(question, ['tên', 'ten', 'mã', 'ma', 'code', 'search', 'tìm', 'tim', 'tra cứu', 'tra cuu', 'nhân viên', 'nhan vien']);
    return cleanTerm(term || question);
}

function extractStatus(question, allowed) {
    const text = normalizeText(question);
    const statusMap = [
        ['Active', /dang hoat dong|active|con lam|dang lam/],
        ['Inactive', /tam ngung|inactive/],
        ['Terminated', /da nghi|nghi viec|terminated/],
        ['Pending', /cho duyet|pending|dang cho/],
        ['Approved', /da duyet|approved/],
        ['Rejected', /tu choi|rejected/],
        ['Cancelled', /da huy|cancelled|canceled/],
        ['Draft', /nhap|draft/],
        ['Signed', /da ky|signed/],
        ['Finalized', /chot|finalized/],
        ['Available', /san sang|available|chua cap/],
        ['Assigned', /da cap|assigned/],
        ['Maintenance', /bao tri|maintenance/],
        ['Broken', /hong|broken/],
        ['Lost', /mat|lost/],
    ];

    for (const [status, regex] of statusMap) {
        if (regex.test(text) && (!allowed || allowed.includes(status))) return status;
    }
    return null;
}

function wantsDetails(question) {
    return /(hien thi|toan bo|day du|chi tiet|danh sach|thong tin|liet ke|show|list|detail)/.test(normalizeText(question));
}

function isTopQuery(question) {
    return /(top|nhieu nhat|cao nhat|lon nhat|it nhat|thap nhat)/.test(normalizeText(question));
}

function wantsAbsentEmployees(question) {
    return /(vang|absent|khong di lam|khong lam|nghi lam|khong cham cong|chua cham cong|chua check.?in|chua den|khong co mat)/.test(normalizeText(question));
}

function wantsLateEmployees(question) {
    return /(di muon|late|muon gio|tre gio|den muon)/.test(normalizeText(question));
}

function wantsPresentEmployees(question) {
    const text = normalizeText(question);
    return /(ai|nhan vien|danh sach|hien thi|liet ke|tim).*(da di lam|co mat|da cham cong|da check.?in|di lam hom nay)|(?:da di lam|co mat|da cham cong|da check.?in).*(ai|nhan vien|danh sach|hien thi|liet ke|tim)/.test(text);
}

function wantsMissingCheckoutEmployees(question) {
    return /(chua check.?out|chua checkout|quen check.?out|missing.?checkout|missing checkout|chua cham cong ra|chua ra ve)/.test(normalizeText(question));
}

function wantsShiftEmployees(question) {
    return getRequestedShiftKind(question) !== null;
}

function formatDate(value) {
    return value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có';
}

function formatMoney(value) {
    return `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} VND`;
}

function employeePublicShape(employee) {
    const contact = employee.contact || {};
    const insurance = employee.insurance || {};
    const bankAccounts = Array.isArray(employee.bank_accounts) ? employee.bank_accounts : [];

    return {
        id: employee._id,
        employee_code: employee.employee_code,
        full_name: employee.full_name,
        date_of_birth: employee.date_of_birth,
        gender: employee.gender,
        department: employee.department,
        position: employee.position,
        status: employee.status,
        hire_date: employee.hire_date,
        contact: {
            email: contact.email,
            phone: contact.phone,
            permanent_address: contact.permanent_address,
            current_address: contact.current_address,
        },
        insurance: {
            tax_code: insurance.tax_code,
            social_insurance: insurance.social_insurance,
            health_insurance: insurance.health_insurance,
        },
        bank_accounts: bankAccounts.map((account) => ({
            bank_name: account.bank_name,
            account_number: account.account_number,
            account_holder: account.account_holder,
        })),
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
    };
}

async function searchEmployees(question) {
    const term = extractSearchTerm(question);
    const status = extractStatus(question, ['Active', 'Inactive', 'Terminated']);
    const department = extractDepartmentTerm(question);
    const query = {};

    if (status) query.status = status;
    if (department) query.department = toRegex(department);

    if (term && !department) {
        const regex = toRegex(term);
        query.$or = [
            { full_name: regex },
            { employee_code: regex },
            { department: regex },
            { position: regex },
            { 'contact.email': regex },
            { 'contact.phone': regex },
        ];
    }

    const employees = await Employee.find(query)
        .select('employee_code full_name date_of_birth gender contact department position status hire_date insurance bank_accounts createdAt updatedAt')
        .sort({ department: 1, full_name: 1 })
        .limit(wantsDetails(question) ? 100 : 30)
        .lean();

    return {
        term,
        department,
        status,
        includeDetails: wantsDetails(question),
        count: employees.length,
        employees: employees.map(employeePublicShape),
    };
}

async function getDepartmentStats(question) {
    const department = extractDepartmentTerm(question);
    const match = department ? { department: toRegex(department) } : {};
    const includeDetails = wantsDetails(question);

    const [total, active, inactive, terminated, employees, byPosition] = await Promise.all([
        Employee.countDocuments(match),
        Employee.countDocuments({ ...match, status: 'Active' }),
        Employee.countDocuments({ ...match, status: 'Inactive' }),
        Employee.countDocuments({ ...match, status: 'Terminated' }),
        Employee.find(match)
            .select('employee_code full_name date_of_birth gender contact department position status hire_date insurance bank_accounts createdAt updatedAt')
            .sort({ status: 1, full_name: 1 })
            .limit(includeDetails ? 100 : 30)
            .lean(),
        Employee.aggregate([
            { $match: match },
            { $group: { _id: '$position', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
    ]);

    return {
        department: department || 'tất cả',
        includeDetails,
        total,
        active,
        inactive,
        terminated,
        byPosition,
        employees: employees.map(employeePublicShape),
    };
}

async function getAttendanceStats(question) {
    const range = parseTimeRange(question);
    const department = extractDepartmentTerm(question);
    const employeeMatch = department ? await Employee.find({ department: toRegex(department) }).select('_id').lean() : null;
    const match = { work_date: { $gte: range.start, $lte: range.end } };
    if (employeeMatch) match.employee_id = { $in: employeeMatch.map((employee) => employee._id) };
    if (wantsLateEmployees(question)) match.late_minutes = { $gt: 0 };

    const [activeEmployees, records, lateCount, byStatus, topLate] = await Promise.all([
        Employee.countDocuments(department ? { department: toRegex(department), status: 'Active' } : { status: 'Active' }),
        Attendance.countDocuments(match),
        Attendance.countDocuments({ ...match, late_minutes: { $gt: 0 } }),
        Attendance.aggregate([
            { $match: match },
            { $group: { _id: '$status', count: { $sum: 1 }, worked_hours: { $sum: '$worked_hours' }, late_minutes: { $sum: '$late_minutes' } } },
            { $sort: { count: -1 } },
        ]),
        Attendance.aggregate([
            { $match: { ...match, late_minutes: { $gt: 0 } } },
            { $group: { _id: '$employee_id', count: { $sum: 1 }, late_minutes: { $sum: '$late_minutes' } } },
            { $sort: { late_minutes: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' } },
            { $unwind: '$employee' },
            { $project: { count: 1, late_minutes: 1, 'employee.employee_code': 1, 'employee.full_name': 1, 'employee.department': 1 } },
        ]),
    ]);

    let absentEmployees = [];
    let onLeaveEmployees = [];
    let lateEmployees = [];
    let presentEmployees = [];
    let missingCheckoutEmployees = [];
    let shiftEmployees = [];
    const shiftKind = getRequestedShiftKind(question);

    if (shiftKind) {
        const allShifts = await Shift.find({}).select('shift_name start_time end_time is_night_shift').lean();
        const matchedShifts = allShifts.filter((shift) => (
            shiftKind === 'night' ? isNightShiftConfig(shift) : !isNightShiftConfig(shift)
        ));
        const assignments = matchedShifts.length > 0
            ? await ShiftAssignment.find({
                work_date: { $gte: range.start, $lte: range.end },
                shift_id: { $in: matchedShifts.map((shift) => shift._id) },
            })
                .populate('employee_id', 'employee_code full_name department position status contact.email contact.phone hire_date')
                .populate('shift_id', 'shift_name start_time end_time is_night_shift')
                .sort({ work_date: 1 })
                .lean()
            : [];

        const assignmentEmployeeIds = assignments
            .map((assignment) => assignment.employee_id?._id || assignment.employee_id)
            .filter(Boolean);
        const attendanceRecords = assignmentEmployeeIds.length > 0
            ? await Attendance.find({
                employee_id: { $in: assignmentEmployeeIds },
                work_date: { $gte: range.start, $lte: range.end },
            }).select('employee_id work_date check_in check_out late_minutes status worked_hours').lean()
            : [];
        const attendanceByEmployeeAndDate = new Map(
            attendanceRecords.map((record) => [`${record.employee_id}:${new Date(record.work_date).toISOString()}`, record]),
        );

        shiftEmployees = assignments
            .filter((assignment) => assignment.employee_id)
            .filter((assignment) => !department || toRegex(department).test(assignment.employee_id.department || ''))
            .map((assignment) => {
                const record = attendanceByEmployeeAndDate.get(`${assignment.employee_id._id}:${new Date(assignment.work_date).toISOString()}`);
                return {
                    employee: employeePublicShape(assignment.employee_id),
                    shift: assignment.shift_id,
                    work_date: assignment.work_date,
                    check_in: record?.check_in || null,
                    check_out: record?.check_out || null,
                    status: record?.status || 'Chưa chấm công',
                    late_minutes: record?.late_minutes || 0,
                    worked_hours: record?.worked_hours || 0,
                };
            });
    }

    if (wantsLateEmployees(question)) {
        const lateRecords = await Attendance.find({
            ...match,
            late_minutes: { $gt: 0 },
        })
            .populate('employee_id', 'employee_code full_name department position status contact.email contact.phone hire_date')
            .sort({ late_minutes: -1, check_in: 1 })
            .limit(100)
            .lean();

        lateEmployees = lateRecords
            .filter((record) => record.employee_id)
            .map((record) => ({
                employee: employeePublicShape(record.employee_id),
                check_in: record.check_in,
                check_out: record.check_out,
                late_minutes: record.late_minutes,
                worked_hours: record.worked_hours,
                status: record.status,
            }));
    }

    if (wantsPresentEmployees(question)) {
        const presentRecords = await Attendance.find(match)
            .populate('employee_id', 'employee_code full_name department position status contact.email contact.phone hire_date')
            .sort({ check_in: 1 })
            .limit(50)
            .lean();

        presentEmployees = presentRecords
            .filter((record) => record.employee_id)
            .map((record) => ({
                employee: employeePublicShape(record.employee_id),
                check_in: record.check_in,
                check_out: record.check_out,
                late_minutes: record.late_minutes,
                worked_hours: record.worked_hours,
                status: record.status,
            }));
    }

    if (wantsMissingCheckoutEmployees(question)) {
        const missingRecords = await Attendance.find({
            ...match,
            check_in: { $ne: null },
            $or: [{ check_out: null }, { status: 'MissingCheckout' }],
        })
            .populate('employee_id', 'employee_code full_name department position status contact.email contact.phone hire_date')
            .sort({ check_in: 1 })
            .limit(50)
            .lean();

        missingCheckoutEmployees = missingRecords
            .filter((record) => record.employee_id)
            .map((record) => ({
                employee: employeePublicShape(record.employee_id),
                check_in: record.check_in,
                status: record.status,
            }));
    }

    if (wantsAbsentEmployees(question)) {
        const employeeQuery = department ? { department: toRegex(department), status: 'Active' } : { status: 'Active' };
        const [activeList, attendanceList, leaveList] = await Promise.all([
            Employee.find(employeeQuery)
                .select('employee_code full_name department position status contact.email contact.phone hire_date')
                .sort({ department: 1, full_name: 1 })
                .lean(),
            Attendance.find({ work_date: { $gte: range.start, $lte: range.end } }).select('employee_id').lean(),
            LeaveRequest.find({
                status: 'Approved',
                start_date: { $lte: range.end },
                end_date: { $gte: range.start },
            }).populate('employee_id', 'employee_code full_name department position status contact.email contact.phone hire_date').lean(),
        ]);

        const attendedIds = new Set(attendanceList.map((item) => String(item.employee_id)));
        const leaveIds = new Set(
            leaveList
                .map((item) => item.employee_id?._id || item.employee_id)
                .filter(Boolean)
                .map(String),
        );

        absentEmployees = activeList
            .filter((employee) => !attendedIds.has(String(employee._id)) && !leaveIds.has(String(employee._id)))
            .map(employeePublicShape);

        onLeaveEmployees = leaveList
            .map((item) => item.employee_id)
            .filter(Boolean)
            .map(employeePublicShape);
    }

    return {
        range,
        department,
        activeEmployees,
        attendanceRecords: records,
        lateCount,
        byStatus,
        topLate,
        lateEmployees,
        presentEmployees,
        missingCheckoutEmployees,
        shiftEmployees,
        shiftKind,
        absentEmployees,
        onLeaveEmployees,
        isAbsentQuery: wantsAbsentEmployees(question),
        isLateQuery: wantsLateEmployees(question),
        isPresentQuery: wantsPresentEmployees(question),
        isMissingCheckoutQuery: wantsMissingCheckoutEmployees(question),
        isShiftQuery: wantsShiftEmployees(question),
    };
}

async function getPayrollStats(question) {
    const range = parseTimeRange(question);
    const status = extractStatus(question, ['Draft', 'Finalized']);
    const match = {};
    if (range.type === 'month' || range.type === 'today' || range.type === 'day') {
        match.month = range.month || new Date(range.start).getMonth() + 1;
        match.year = range.year || new Date(range.start).getFullYear();
    } else if (range.type === 'year') {
        match.year = range.year;
    }
    if (status) match.status = status;

    const [byStatus, topEmployees] = await Promise.all([
        Payroll.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    net_salary: { $sum: '$net_salary' },
                    overtime_salary: { $sum: '$overtime_salary' },
                    allowance: { $sum: '$allowance' },
                    deduction: { $sum: '$deduction' },
                },
            },
            { $sort: { net_salary: -1 } },
        ]),
        Payroll.find(match)
            .populate('employee_id', 'employee_code full_name department')
            .sort({ net_salary: isTopQuery(question) && /thap nhat|it nhat/.test(normalizeText(question)) ? 1 : -1 })
            .limit(5)
            .lean(),
    ]);

    return {
        range,
        status,
        byStatus,
        topEmployees: topEmployees.map((item) => ({
            employee: item.employee_id,
            net_salary: item.net_salary,
            total_work_hours: item.total_work_hours,
            total_overtime_hours: item.total_overtime_hours,
            status: item.status,
        })),
    };
}

async function getLeaveStats(question) {
    const range = parseTimeRange(question);
    const status = extractStatus(question, ['Pending', 'Approved', 'Rejected', 'Cancelled']);
    const match = {
        start_date: { $lte: range.end },
        end_date: { $gte: range.start },
    };
    if (status) match.status = status;

    const [byStatus, topEmployees, recent] = await Promise.all([
        LeaveRequest.aggregate([
            { $match: match },
            { $group: { _id: '$status', count: { $sum: 1 }, total_days: { $sum: '$total_days' } } },
            { $sort: { count: -1 } },
        ]),
        LeaveRequest.aggregate([
            { $match: match },
            { $group: { _id: '$employee_id', requests: { $sum: 1 }, total_days: { $sum: '$total_days' } } },
            { $sort: { total_days: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' } },
            { $unwind: '$employee' },
            { $project: { requests: 1, total_days: 1, 'employee.employee_code': 1, 'employee.full_name': 1, 'employee.department': 1 } },
        ]),
        LeaveRequest.find(match).populate('employee_id', 'employee_code full_name department').sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    return { range, status, byStatus, topEmployees, recent };
}

async function getOvertimeStats(question) {
    const range = parseTimeRange(question);
    const status = extractStatus(question, ['Pending', 'Approved', 'Rejected', 'Cancelled']);
    const match = { work_date: { $gte: range.start, $lte: range.end } };
    if (status) match.status = status;

    const [byStatus, topEmployees, recent] = await Promise.all([
        Overtime.aggregate([
            { $match: match },
            { $group: { _id: '$status', count: { $sum: 1 }, hours: { $sum: '$hours' } } },
            { $sort: { hours: -1 } },
        ]),
        Overtime.aggregate([
            { $match: match },
            { $group: { _id: '$employee_id', requests: { $sum: 1 }, hours: { $sum: '$hours' } } },
            { $sort: { hours: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' } },
            { $unwind: '$employee' },
            { $project: { requests: 1, hours: 1, 'employee.employee_code': 1, 'employee.full_name': 1, 'employee.department': 1 } },
        ]),
        Overtime.find(match).populate('employee_id', 'employee_code full_name department').sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    return { range, status, byStatus, topEmployees, recent };
}

async function getContractStats(question) {
    const text = normalizeText(question);
    const status = extractStatus(question, ['Draft', 'Pending', 'Approved', 'Signed', 'Terminated']);
    const match = {};
    if (status) match.status = status;
    if (/sap het han|het han/.test(text)) {
        const now = new Date();
        const next60 = new Date();
        next60.setDate(next60.getDate() + 60);
        match.end_date = /sap het han/.test(text) ? { $gte: now, $lte: next60 } : { $lt: now };
    }

    const [byStatus, byType, recent] = await Promise.all([
        Contract.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, base_salary: { $sum: '$base_salary' } } }, { $sort: { count: -1 } }]),
        Contract.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 }, base_salary: { $sum: '$base_salary' } } }, { $sort: { count: -1 } }]),
        Contract.find(match).populate('employee_id', 'employee_code full_name department').sort({ end_date: 1, createdAt: -1 }).limit(50).lean(),
    ]);

    return { status, byStatus, byType, recent };
}

async function getAssetStats(question) {
    const text = normalizeText(question);
    const status = extractStatus(question, ['Available', 'Assigned', 'Maintenance', 'Broken', 'Lost', 'Retired']);
    const match = {};
    if (status) match.status = status;
    const categoryMatch = text.match(/(laptop|desktop|mobile|tablet|storage|peripherals|other)/);
    if (categoryMatch) match.category = new RegExp(categoryMatch[1], 'i');

    const [byStatus, byCategory, assets] = await Promise.all([
        Asset.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, purchase_cost: { $sum: '$purchase_cost' } } }, { $sort: { count: -1 } }]),
        Asset.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 }, purchase_cost: { $sum: '$purchase_cost' } } }, { $sort: { count: -1 } }]),
        Asset.find(match).populate('assigned_to', 'employee_code full_name department').sort({ status: 1, asset_name: 1 }).limit(wantsDetails(question) ? 100 : 50).lean(),
    ]);

    return { status, category: match.category ? categoryMatch[1] : null, byStatus, byCategory, assets };
}

async function getTrainingStats(question) {
    const term = cleanTerm(extractAfterKeyword(question, ['khóa học', 'khoa hoc', 'course', 'đào tạo', 'dao tao', 'training']));
    const match = term ? { course_name: toRegex(term) } : {};
    const courses = await Training.find(match).sort({ course_name: 1 }).limit(wantsDetails(question) ? 30 : 10).lean();
    const totalSessions = courses.reduce((sum, course) => sum + (Array.isArray(course.sessions) ? course.sessions.length : 0), 0);
    return { term, count: courses.length, totalSessions, courses };
}

async function getOverview() {
    const today = startOfDay();
    const month = getMonthRange(0);
    const [employees, activeEmployees, attendanceToday, lateThisMonth, pendingLeaves, pendingOvertime, assetsAssigned, finalizedPayroll] = await Promise.all([
        Employee.countDocuments(),
        Employee.countDocuments({ status: 'Active' }),
        Attendance.countDocuments({ work_date: today }),
        Attendance.countDocuments({ work_date: { $gte: month.start, $lte: month.end }, late_minutes: { $gt: 0 } }),
        LeaveRequest.countDocuments({ status: 'Pending' }),
        Overtime.countDocuments({ status: 'Pending' }),
        Asset.countDocuments({ status: 'Assigned' }),
        Payroll.aggregate([
            { $match: { month: month.month, year: month.year, status: 'Finalized' } },
            { $group: { _id: null, count: { $sum: 1 }, net_salary: { $sum: '$net_salary' } } },
        ]),
    ]);

    return {
        employees,
        activeEmployees,
        attendanceToday,
        lateThisMonth,
        pendingLeaves,
        pendingOvertime,
        assetsAssigned,
        finalizedPayroll: finalizedPayroll[0] || { count: 0, net_salary: 0 },
        month: month.month,
        year: month.year,
    };
}

async function runTool(intent, question) {
    if (intent === 'help') return getHelpData();
    if (intent === 'department_stats') return getDepartmentStats(question);
    if (intent === 'employee_search') return searchEmployees(question);
    if (intent === 'attendance_stats') return getAttendanceStats(question);
    if (intent === 'payroll_stats') return getPayrollStats(question);
    if (intent === 'leave_stats') return getLeaveStats(question);
    if (intent === 'overtime_stats') return getOvertimeStats(question);
    if (intent === 'contract_stats') return getContractStats(question);
    if (intent === 'asset_stats') return getAssetStats(question);
    if (intent === 'training_stats') return getTrainingStats(question);
    return getOverview();
}

function getHelpData() {
    return {
        examples: [
            'Thống kê nhân viên của bộ phận Production',
            'Hiển thị toàn bộ thông tin của nhân viên bộ phận IT support',
            'Tìm nhân viên tên Linh',
            'Tháng này có bao nhiêu người đi muộn?',
            'Top nhân viên nghỉ phép nhiều nhất tháng này',
            'Tổng lương tháng 5/2026',
            'Tài sản đang bảo trì',
            'Hợp đồng sắp hết hạn',
            'Đơn tăng ca chờ duyệt tháng này',
        ],
    };
}

function buildPrompt(question, intent, data) {
    return [
        'Bạn là trợ lý thống kê nhân sự nội bộ. Chỉ trả lời bằng tiếng Việt tự nhiên, không dùng tiếng Trung.',
        'Trả lời ngắn gọn, có số liệu cụ thể. Không bịa số liệu ngoài JSON được cung cấp.',
        `Intent: ${intent}`,
        `Câu hỏi: ${question}`,
        `Dữ liệu JSON: ${JSON.stringify(data)}`,
    ].join('\n\n');
}

function getProviderOrder() {
    const provider = String(env.chatbotProvider || 'gemini').toLowerCase();
    if (provider === 'auto') {
        return [
            env.openaiApiKey ? 'openai' : null,
            env.geminiApiKey ? 'gemini' : null,
        ].filter(Boolean);
    }

    return [provider];
}

function extractOpenAIText(responseData) {
    if (responseData?.output_text) return responseData.output_text.trim();
    const parts = [];
    for (const item of responseData?.output || []) {
        for (const content of item.content || []) {
            if (content.text) parts.push(content.text);
        }
    }
    return parts.join('\n').trim();
}

async function askOpenAI(question, intent, data) {
    if (!env.openaiApiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
    }

    const response = await axios.post('https://api.openai.com/v1/responses', {
        model: env.openaiModel,
        instructions: 'Bạn là trợ lý thống kê nhân sự nội bộ. Chỉ trả lời bằng tiếng Việt, ngắn gọn, dựa đúng dữ liệu JSON được cung cấp.',
        input: buildPrompt(question, intent, data),
        max_output_tokens: 900,
    }, {
        timeout: 60000,
        headers: {
            Authorization: `Bearer ${env.openaiApiKey}`,
            'Content-Type': 'application/json',
        },
    });

    const text = extractOpenAIText(response.data);
    if (!text) throw new Error('OpenAI returned an empty response');
    return text;
}

async function askGemini(question, intent, data) {
    if (!env.geminiApiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const model = encodeURIComponent(env.geminiModel);
    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
            system_instruction: {
                parts: [{
                    text: 'Bạn là trợ lý thống kê nhân sự nội bộ. Chỉ trả lời bằng tiếng Việt, ngắn gọn, dựa đúng dữ liệu JSON được cung cấp.',
                }],
            },
            contents: [{
                role: 'user',
                parts: [{ text: buildPrompt(question, intent, data) }],
            }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 900,
            },
        },
        {
            timeout: 60000,
            headers: {
                'x-goog-api-key': env.geminiApiKey,
                'Content-Type': 'application/json',
            },
        },
    );

    const text = response.data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();

    if (!text) throw new Error('Gemini returned an empty response');
    return text;
}

async function askConfiguredModel(question, intent, data) {
    const errors = [];

    for (const provider of getProviderOrder()) {
        try {
            if (provider === 'openai') {
                return { answer: await askOpenAI(question, intent, data), provider: `openai:${env.openaiModel}` };
            }
            if (provider === 'gemini') {
                return { answer: await askGemini(question, intent, data), provider: `gemini:${env.geminiModel}` };
            }
            errors.push(`${provider}: unsupported provider`);
        } catch (error) {
            errors.push(`${provider}: ${error.message}`);
        }
    }

    throw new Error(errors.join(' | ') || 'No chatbot provider configured');
}

function formatEmployeeDetails(employees) {
    return employees.map((employee, index) => {
        const contact = employee.contact || {};
        const insurance = employee.insurance || {};
        const bankAccounts = Array.isArray(employee.bank_accounts) && employee.bank_accounts.length > 0
            ? employee.bank_accounts
                .map((account) => `${account.bank_name || 'Ngân hàng'} - ${account.account_number || 'chưa có số TK'} (${account.account_holder || employee.full_name})`)
                .join('; ')
            : 'Chưa có';

        return [
            `${index + 1}. ${employee.employee_code} - ${employee.full_name}`,
            `   Bộ phận: ${employee.department || 'Chưa có'}`,
            `   Chức vụ: ${employee.position || 'Chưa có'}`,
            `   Trạng thái: ${employee.status || 'Chưa có'}`,
            `   Giới tính: ${employee.gender || 'Chưa có'}`,
            `   Ngày sinh: ${formatDate(employee.date_of_birth)}`,
            `   Ngày vào làm: ${formatDate(employee.hire_date)}`,
            `   Email: ${contact.email || 'Chưa có'}`,
            `   SĐT: ${contact.phone || 'Chưa có'}`,
            `   Địa chỉ thường trú: ${contact.permanent_address || 'Chưa có'}`,
            `   Địa chỉ hiện tại: ${contact.current_address || 'Chưa có'}`,
            `   Mã số thuế: ${insurance.tax_code || 'Chưa có'}`,
            `   BHXH: ${insurance.social_insurance || 'Chưa có'}`,
            `   BHYT: ${insurance.health_insurance || 'Chưa có'}`,
            `   Tài khoản ngân hàng: ${bankAccounts}`,
        ].join('\n');
    }).join('\n\n');
}

function fallbackAnswer(intent, data) {
    if (intent === 'help') {
        return `Tôi có thể trả lời các nhóm câu hỏi: nhân viên, bộ phận, chấm công, lương, nghỉ phép, tăng ca, hợp đồng, tài sản, đào tạo.\n\nVí dụ:\n- ${data.examples.join('\n- ')}`;
    }
    if (intent === 'department_stats') {
        if (data.total === 0) return `Không tìm thấy nhân viên thuộc bộ phận "${data.department}".`;
        if (data.includeDetails) {
            return [
                `Bộ phận "${data.department}" có ${data.total} nhân viên: ${data.active} đang hoạt động, ${data.inactive} tạm ngưng, ${data.terminated} đã nghỉ.`,
                formatEmployeeDetails(data.employees) || 'Không có nhân viên để hiển thị.',
            ].join('\n\n');
        }
        const list = data.employees.map((employee) => `${employee.employee_code} - ${employee.full_name} (${employee.position || 'chưa có chức vụ'})`).join('; ');
        return `Bộ phận "${data.department}" có ${data.total} nhân viên: ${data.active} đang hoạt động, ${data.inactive} tạm ngưng, ${data.terminated} đã nghỉ.${list ? ` Danh sách: ${list}.` : ''}`;
    }
    if (intent === 'employee_search') {
        if (data.includeDetails) return formatEmployeeDetails(data.employees) || `Không tìm thấy nhân viên phù hợp với "${data.term}".`;
        const list = data.employees.map((employee) => `${employee.employee_code} - ${employee.full_name} (${employee.department || 'chưa có bộ phận'}, ${employee.position || 'chưa có chức vụ'})`).join('; ');
        return `Tìm thấy ${data.count} nhân viên phù hợp với "${data.term}".${list ? ` ${list}.` : ''}`;
    }
    if (intent === 'attendance_stats') {
        if (data.isShiftQuery) {
            const shiftLabel = data.shiftKind === 'night' ? 'ca đêm' : 'ca ngày';
            const shiftList = data.shiftEmployees
                .map((item, index) => {
                    const employee = item.employee;
                    const shiftName = item.shift?.shift_name || shiftLabel;
                    const shiftTime = item.shift?.start_time && item.shift?.end_time
                        ? `${item.shift.start_time}-${item.shift.end_time}`
                        : 'chưa có giờ ca';
                    const checkIn = item.check_in ? new Date(item.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'chưa check-in';
                    const checkOut = item.check_out ? new Date(item.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'chưa check-out';
                    return `${index + 1}. ${employee.employee_code} - ${employee.full_name} (${employee.department || 'chưa có bộ phận'}, ${employee.position || 'chưa có chức vụ'}): ${shiftName} ${shiftTime}, ${checkIn} - ${checkOut}`;
                })
                .join('\n');

            return [
                `Kỳ ${data.range.label}: có ${data.shiftEmployees.length} nhân viên được phân ${shiftLabel}.`,
                shiftList || `Không tìm thấy nhân viên được phân ${shiftLabel} trong kỳ này.`,
            ].join('\n');
        }

        if (data.isMissingCheckoutQuery) {
            const missingList = data.missingCheckoutEmployees
                .map((item, index) => {
                    const employee = item.employee;
                    const checkIn = item.check_in ? new Date(item.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'chưa có';
                    return `${index + 1}. ${employee.employee_code} - ${employee.full_name} (${employee.department || 'chưa có bộ phận'}, ${employee.position || 'chưa có chức vụ'}): check-in lúc ${checkIn}`;
                })
                .join('\n');

            return [
                `Kỳ ${data.range.label}: có ${data.missingCheckoutEmployees.length} nhân viên chưa check-out.`,
                missingList || 'Không có nhân viên chưa check-out.',
            ].join('\n');
        }

        if (data.isPresentQuery) {
            const presentList = data.presentEmployees
                .map((item, index) => {
                    const employee = item.employee;
                    const checkIn = item.check_in ? new Date(item.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'chưa có';
                    const checkOut = item.check_out ? new Date(item.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'chưa check-out';
                    return `${index + 1}. ${employee.employee_code} - ${employee.full_name} (${employee.department || 'chưa có bộ phận'}, ${employee.position || 'chưa có chức vụ'}): ${checkIn} - ${checkOut}`;
                })
                .join('\n');

            return [
                `Kỳ ${data.range.label}: có ${data.presentEmployees.length} nhân viên đã có bản ghi chấm công.`,
                presentList || 'Chưa có nhân viên nào chấm công trong kỳ này.',
            ].join('\n');
        }

        if (data.isLateQuery) {
            const lateList = data.lateEmployees
                .map((item, index) => {
                    const employee = item.employee;
                    const checkIn = item.check_in ? new Date(item.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'chưa có';
                    return `${index + 1}. ${employee.employee_code} - ${employee.full_name} (${employee.department || 'chưa có bộ phận'}, ${employee.position || 'chưa có chức vụ'}): vào lúc ${checkIn}, muộn ${item.late_minutes} phút`;
                })
                .join('\n');

            return [
                `Kỳ ${data.range.label}: có ${data.lateEmployees.length} nhân viên đi làm muộn.`,
                lateList || 'Không có nhân viên đi muộn.',
            ].join('\n');
        }

        if (data.isAbsentQuery) {
            const absentList = data.absentEmployees
                .map((employee, index) => `${index + 1}. ${employee.employee_code} - ${employee.full_name} (${employee.department || 'chưa có bộ phận'}, ${employee.position || 'chưa có chức vụ'})`)
                .join('\n');
            const leaveNote = data.onLeaveEmployees.length > 0
                ? `\n\nĐang nghỉ phép đã duyệt: ${data.onLeaveEmployees.map((employee) => `${employee.employee_code} - ${employee.full_name}`).join('; ')}.`
                : '';

            return [
                `Kỳ ${data.range.label}: có ${data.absentEmployees.length} nhân viên Active chưa có bản ghi chấm công và không nằm trong đơn nghỉ phép đã duyệt.`,
                absentList || 'Không có nhân viên vắng mặt.',
                leaveNote,
            ].filter(Boolean).join('\n');
        }
        return `Kỳ ${data.range.label}: có ${data.attendanceRecords} bản ghi chấm công, ${data.lateCount} bản ghi đi muộn, trên ${data.activeEmployees} nhân viên đang hoạt động.`;
    }
    if (intent === 'payroll_stats') {
        const total = data.byStatus.reduce((sum, item) => sum + Number(item.net_salary || 0), 0);
        return `Kỳ ${data.range.label}: tổng lương là ${formatMoney(total)}. Số phiếu theo trạng thái: ${data.byStatus.map((item) => `${item._id}: ${item.count}`).join(', ') || 'chưa có dữ liệu'}.`;
    }
    if (intent === 'leave_stats') {
        const total = data.byStatus.reduce((sum, item) => sum + Number(item.count || 0), 0);
        return `Kỳ ${data.range.label}: có ${total} đơn nghỉ phép. ${data.byStatus.map((item) => `${item._id}: ${item.count} đơn/${item.total_days} ngày`).join(', ') || 'Chưa có dữ liệu'}.`;
    }
    if (intent === 'overtime_stats') {
        const totalHours = data.byStatus.reduce((sum, item) => sum + Number(item.hours || 0), 0);
        const totalRequests = data.byStatus.reduce((sum, item) => sum + Number(item.count || 0), 0);
        return `Kỳ ${data.range.label}: có ${totalRequests} đơn tăng ca với tổng ${totalHours} giờ. ${data.byStatus.map((item) => `${item._id}: ${item.count} đơn/${item.hours} giờ`).join(', ') || 'Chưa có dữ liệu'}.`;
    }
    if (intent === 'contract_stats') {
        const total = data.byStatus.reduce((sum, item) => sum + Number(item.count || 0), 0);
        return `Có ${total} hợp đồng phù hợp. Theo trạng thái: ${data.byStatus.map((item) => `${item._id}: ${item.count}`).join(', ') || 'chưa có dữ liệu'}. Theo loại: ${data.byType.map((item) => `${item._id}: ${item.count}`).join(', ') || 'chưa có dữ liệu'}.`;
    }
    if (intent === 'asset_stats') {
        const total = data.byStatus.reduce((sum, item) => sum + Number(item.count || 0), 0);
        return `Có ${total} tài sản phù hợp. Theo trạng thái: ${data.byStatus.map((item) => `${item._id}: ${item.count}`).join(', ') || 'chưa có dữ liệu'}. Theo loại: ${data.byCategory.map((item) => `${item._id}: ${item.count}`).join(', ') || 'chưa có dữ liệu'}.`;
    }
    if (intent === 'training_stats') {
        return `Tìm thấy ${data.count} khóa đào tạo với tổng ${data.totalSessions} buổi học. ${data.courses.map((course) => course.course_name).join(', ') || 'Chưa có dữ liệu'}.`;
    }
    return `Hệ thống có ${data.activeEmployees}/${data.employees} nhân viên đang hoạt động, ${data.attendanceToday} bản ghi chấm công hôm nay, ${data.pendingLeaves} đơn nghỉ và ${data.pendingOvertime} đơn tăng ca đang chờ duyệt. Tài sản đã cấp: ${data.assetsAssigned}. Lương đã chốt tháng ${data.month}/${data.year}: ${formatMoney(data.finalizedPayroll.net_salary)}.`;
}

async function answerQuestion(question) {
    const intent = detectIntent(question);
    const [data, overview] = await Promise.all([
        runTool(intent, question),
        getOverview()
    ]);

    // Gộp overview vào data để Gemini luôn có ngữ cảnh toàn hệ thống
    data.system_overview = overview;

    if (
        (intent === 'department_stats' && data.includeDetails)
        || (intent === 'employee_search' && data.includeDetails)
        || (intent === 'attendance_stats' && data.isAbsentQuery)
        || (intent === 'attendance_stats' && data.isLateQuery)
        || (intent === 'attendance_stats' && data.isPresentQuery)
        || (intent === 'attendance_stats' && data.isMissingCheckoutQuery)
        || (intent === 'attendance_stats' && data.isShiftQuery)
        || intent === 'help'
    ) {
        return { answer: fallbackAnswer(intent, data), intent, data, provider: 'database' };
    }

    try {
        const result = await askConfiguredModel(question, intent, data);
        return {
            answer: result.answer || fallbackAnswer(intent, data),
            intent,
            data,
            provider: result.provider,
        };
    } catch (error) {
        console.error('[CHATBOT_ERROR]', error.message, error.response?.data);
        return {
            answer: `${fallbackAnswer(intent, data)}\n\nCloud model chưa phản hồi. Kiểm tra CHATBOT_PROVIDER, API key, quota hoặc kết nối mạng.`,
            intent,
            data,
            provider: 'fallback',
            warning: error.message,
        };
    }
}

module.exports = {
    answerQuestion,
};
