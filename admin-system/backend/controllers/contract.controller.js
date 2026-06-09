const xss = require('xss');
const { Contract, Setting } = require('../models');
const contractGenerator = require('../services/contractGenerator.service');
const { allowedOrigins } = require('../config/cors');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const CONTRACT_STATUS_TRANSITIONS = {
    Draft: ['Pending', 'Terminated'],
    Pending: ['Approved', 'Draft', 'Terminated'],
    Approved: ['Signed', 'Draft', 'Terminated'],
    Signed: ['Terminated'],
    Terminated: [],
};

function cleanText(value, fallback = '...') {
    const cleaned = xss(String(value ?? fallback), {
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'iframe', 'object', 'embed'],
    }).trim();
    return cleaned || fallback;
}

function normalizeContractType(type) {
    const value = String(type || '').trim().toLowerCase();
    if (['probation', 'thu viec', 'thử việc'].includes(value)) return 'probation';
    if (['indefinite', 'khong xac dinh thoi han', 'không xác định thời hạn'].includes(value)) return 'indefinite';
    if (['freelance', 'contractor'].includes(value)) return 'freelance';
    return 'fixed_term';
}

function getAllowanceAmount(allowances = [], names = []) {
    const normalized = names.map((name) => name.toLowerCase());
    const item = allowances.find((allowance) => {
        const allowanceName = String(allowance.name || '').toLowerCase();
        return normalized.some((name) => allowanceName.includes(name));
    });
    return item?.amount || 0;
}

function salaryWords(amount) {
    return new Intl.NumberFormat('vi-VN').format(Number(amount || 0));
}

async function getCompanyInfo() {
    const companySetting = await Setting.findOne({ key: 'company_info' });
    const company = companySetting?.value || {
        name: 'Cong ty Co phan Cong nghe Antigravity',
        name_en: 'Antigravity Technology Joint Stock Company',
        address: 'Thanh Hoa, Viet Nam',
        tax_code: '0102030405',
        representative: 'Nguyen Van A',
        representative_en: 'Nguyen Van A',
        position: 'Giam doc',
        position_en: 'Director',
        phone: '024.1234.5678',
        brand_color: '#1a3c6e',
    };

    return {
        ...company,
        name: cleanText(company.name),
        name_en: cleanText(company.name_en),
        address: cleanText(company.address),
        tax_code: cleanText(company.tax_code),
        representative: cleanText(company.representative),
        representative_en: cleanText(company.representative_en),
        position: cleanText(company.position),
        position_en: cleanText(company.position_en),
        phone: cleanText(company.phone, '024.1234.5678'),
        brand_color: cleanText(company.brand_color, '#1a3c6e'),
    };
}

function buildContractData(contract, company) {
    const employee = contract.employee_id;
    const contractType = normalizeContractType(contract.type);
    const employeeName = cleanText(employee.full_name);
    const position = cleanText(employee.position, 'Nhan vien');
    const department = cleanText(employee.department, 'Van phong');

    return {
        contract_type: contractType,
        status: contract.status,
        company,
        employee: {
            full_name: employeeName,
            full_name_en: employeeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(),
            dob: employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString('vi-VN') : '...',
            gender: cleanText(employee.gender, '...'),
            id_number: cleanText(employee.identity?.number, '...'),
            id_issued_date: employee.identity?.issue_date ? new Date(employee.identity.issue_date).toLocaleDateString('vi-VN') : '...',
            id_issued_place: cleanText(employee.identity?.issue_place, '...'),
            permanent_address: cleanText(employee.contact?.permanent_address, '...'),
            phone: cleanText(employee.contact?.phone, '...'),
            email: cleanText(employee.contact?.email, '...'),
        },
        job: {
            title: position,
            title_en: position.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
            department,
            department_en: department.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
            workplace: company.address,
            workplace_en: company.address,
            start_date: contract.start_date,
            end_date: contract.end_date,
            probation_months: contractType === 'probation' ? 2 : 0,
            working_hours: '08:00 - 17:00',
            working_days: 'Monday - Friday',
        },
        compensation: {
            basic_salary: contract.base_salary,
            basic_salary_words_vi: `${salaryWords(contract.base_salary)} dong`,
            salary_currency: 'VND',
            position_allowance: getAllowanceAmount(contract.allowances, ['position', 'chuc vu', 'chức vụ']),
            meal_allowance: getAllowanceAmount(contract.allowances, ['meal', 'lunch', 'an', 'ăn']),
            transport_allowance: getAllowanceAmount(contract.allowances, ['transport', 'travel', 'xang', 'xe']),
            payment_method: 'Bank transfer',
            payment_date: 'The 5th day of every month',
            probation_salary_pct: 85,
            social_insurance: contractType !== 'probation',
        },
        terms: {
            annual_leave_days: 12,
            notice_period_days: 30,
            probation_notice_days: 3,
            non_compete: false,
            non_compete_months: 0,
            confidentiality: true,
            additional_clauses: [],
        },
        metadata: {
            contract_number: `HDLD/${new Date().getFullYear()}/${cleanText(employee.employee_code, String(contract._id).slice(-6))}`,
            signed_date: new Date().toISOString(),
            signed_place: cleanText(String(company.address || '').split(',').pop().trim(), 'Ha Noi'),
        },
    };
}

async function loadContract(id) {
    const contract = await Contract.findById(id).populate(['employee_id', 'template_id']);
    if (!contract) {
        throw new AppError('Contract not found', 404);
    }
    if (!contract.employee_id) {
        throw new AppError('Employee associated with contract not found', 404);
    }
    return contract;
}

function contractFrameAncestors() {
    if (allowedOrigins === '*') return '*';
    const origins = allowedOrigins.length ? allowedOrigins.join(' ') : "'self'";
    return `'self' ${origins}`;
}

const generateContractDocument = asyncHandler(async (req, res) => {
    const contract = await loadContract(req.params.id);
    const company = await getCompanyInfo();
    const data = buildContractData(contract, company);
    const markdown = contractGenerator.generateMarkdownContract(data);

    res.status(200).json({
        success: true,
        data: {
            markdown,
            filename: `Contract_${cleanText(contract.employee_id.employee_code, 'employee')}_${data.metadata.contract_number}.md`,
        },
    });
});

const generateContractHtml = asyncHandler(async (req, res) => {
    const contract = await loadContract(req.params.id);
    const company = await getCompanyInfo();
    const data = buildContractData(contract, company);

    let html;
    if (contract.template_id?.html_content) {
        const { applyTemplate } = require('../services/contractHtmlGenerator.service');
        html = applyTemplate(contract.template_id.html_content, data);
    } else {
        const { generateHtmlContract } = require('../services/contractHtmlGenerator.service');
        html = generateHtmlContract(data);
    }

    res.removeHeader('X-Frame-Options');
    res.setHeader(
        'Content-Security-Policy',
        [
            "default-src 'none'",
            "base-uri 'none'",
            "object-src 'none'",
            "img-src 'self' data:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'unsafe-inline'",
            `frame-ancestors ${contractFrameAncestors()}`,
        ].join('; '),
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
});

const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const current = await Contract.findById(id);
    if (!current) {
        throw new AppError('Contract not found', 404);
    }

    const allowed = CONTRACT_STATUS_TRANSITIONS[current.status] || [];
    if (!allowed.includes(status)) {
        throw new AppError(`Invalid contract status transition: ${current.status} -> ${status}`, 400);
    }

    const contract = await Contract.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    res.status(200).json({
        success: true,
        data: contract,
    });
});

module.exports = {
    generateContractDocument,
    generateContractHtml,
    updateStatus,
};
