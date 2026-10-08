/**
 * contractGenerator.service.test.js
 *
 * Unit tests for contractGenerator.service.js
 * Covers: generateMarkdownContract – happy paths, validations, edge cases
 * Target coverage: 10% → 85%+
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateMarkdownContract } = require('../services/contractGenerator.service');

// ─── Test Fixture Factory ─────────────────────────────────────────────────────

function baseContractData(overrides = {}) {
    return {
        metadata: {
            contract_number: 'LD-2026-001',
            signed_place: 'Hà Nội',
            signed_date: '01/10/2026',
        },
        contract_type: 'fixed_term',
        status: 'Draft',
        company: {
            name: 'Công ty TNHH ABC',
            name_en: 'ABC Co., Ltd.',
            address: '123 Đường Láng, Hà Nội',
            tax_code: '0123456789',
            representative: 'Nguyễn Văn A',
            representative_en: 'Nguyen Van A',
            position: 'Tổng giám đốc',
            position_en: 'CEO',
        },
        employee: {
            full_name: 'Trần Thị B',
            full_name_en: 'Tran Thi B',
            dob: '01/01/1990',
            gender: 'Female',
            id_number: '123456789012', // 12 digits
            id_issued_date: '01/01/2020',
            id_issued_place: 'Hà Nội',
            permanent_address: '456 Đường ABC, Hà Nội',
            phone: '0912345678',
        },
        job: {
            title: 'Kỹ sư phần mềm',
            title_en: 'Software Engineer',
            department: 'Công nghệ',
            department_en: 'Technology',
            workplace: 'Hà Nội',
            workplace_en: 'Hanoi',
            working_hours: '8:00 - 17:00',
            working_days: 'Thứ Hai - Thứ Sáu',
            start_date: '2026-10-01',
            end_date: '2027-10-01',
        },
        compensation: {
            basic_salary: 15_000_000,
            position_allowance: 2_000_000,
            meal_allowance: 730_000,
            payment_method: 'Chuyển khoản / Bank Transfer',
            payment_date: 'Ngày 15 hàng tháng / 15th of each month',
            social_insurance: true,
        },
        terms: {
            annual_leave_days: 12,
            confidentiality: true,
            non_compete: true,
            non_compete_months: 12,
            notice_period_days: 30,
            additional_clauses: [],
        },
        ...overrides,
    };
}

// ─── Happy Path Tests ─────────────────────────────────────────────────────────

test('contractGenerator: generates a valid markdown contract for fixed_term', () => {
    const data = baseContractData();
    const md = generateMarkdownContract(data);

    assert.ok(typeof md === 'string', 'Should return a string');
    assert.ok(md.length > 500, 'Contract should have substantial content');

    // Check key sections
    assert.ok(md.includes('HỢP ĐỒNG LAO ĐỘNG'), 'Should include Vietnamese contract title');
    assert.ok(md.includes('EMPLOYMENT CONTRACT'), 'Should include English contract title');
    assert.ok(md.includes('LD-2026-001'), 'Should include contract number');
    assert.ok(md.includes('Công ty TNHH ABC'), 'Should include company name');
    assert.ok(md.includes('Trần Thị B'), 'Should include employee name');
});

test('contractGenerator: includes all 12 articles in fixed_term contract', () => {
    const md = generateMarkdownContract(baseContractData());

    for (let i = 1; i <= 12; i++) {
        assert.ok(md.includes(`ĐIỀU ${i}`), `Should contain Article ${i}`);
    }
});

test('contractGenerator: formats salary using numberToVietnameseWords (millions)', () => {
    const md = generateMarkdownContract(baseContractData());
    assert.ok(md.includes('15 triệu đồng'), 'Should include salary in Vietnamese words');
    assert.ok(md.includes('15 million VND'), 'Should include salary in English');
});

test('contractGenerator: formats position allowance using formatVND', () => {
    const md = generateMarkdownContract(baseContractData());
    assert.ok(md.includes('2.000.000') || md.includes('2,000,000') || md.includes('2.000.000'), 'Should format allowance as currency');
});

test('contractGenerator: includes confidentiality clause when enabled', () => {
    const md = generateMarkdownContract(baseContractData());
    assert.ok(md.includes('BÍ MẬT'), 'Should include confidentiality article');
    assert.ok(md.includes('CONFIDENTIALITY'), 'Should include English confidentiality text');
});

test('contractGenerator: omits confidentiality clause when disabled', () => {
    const data = baseContractData({ terms: { ...baseContractData().terms, confidentiality: false } });
    const md = generateMarkdownContract(data);
    assert.ok(!md.includes('CONFIDENTIALITY'), 'Should NOT include confidentiality article');
});

test('contractGenerator: includes non-compete clause with correct duration', () => {
    const md = generateMarkdownContract(baseContractData());
    assert.ok(md.includes('NON-COMPETE'), 'Should include non-compete article');
    assert.ok(md.includes('12 months'), 'Should include correct non-compete duration');
    assert.ok(md.includes('12 tháng'), 'Should include Vietnamese non-compete duration');
});

test('contractGenerator: omits non-compete clause when disabled', () => {
    const data = baseContractData({ terms: { ...baseContractData().terms, non_compete: false } });
    const md = generateMarkdownContract(data);
    assert.ok(!md.includes('NON-COMPETE'), 'Should NOT include non-compete article');
});

test('contractGenerator: includes additional clauses / addenda when provided', () => {
    const data = baseContractData({
        terms: {
            ...baseContractData().terms,
            additional_clauses: ['Điều khoản thêm 1', 'Điều khoản thêm 2'],
        },
    });
    const md = generateMarkdownContract(data);
    assert.ok(md.includes('Addendum 1'), 'Should include Addendum 1');
    assert.ok(md.includes('Addendum 2'), 'Should include Addendum 2');
    assert.ok(md.includes('Điều khoản thêm 1'), 'Should include addendum text');
});

test('contractGenerator: generates indefinite contract correctly', () => {
    const data = baseContractData({ contract_type: 'indefinite', job: { ...baseContractData().job, end_date: null } });
    const md = generateMarkdownContract(data);
    assert.ok(md.includes('Không xác định thời hạn'), 'Should indicate indefinite contract type');
    assert.ok(md.includes('Indefinite'), 'Should include English indefinite type');
});

test('contractGenerator: generates probation contract correctly', () => {
    const data = baseContractData({ contract_type: 'probation', job: { ...baseContractData().job, end_date: null } });
    const md = generateMarkdownContract(data);
    assert.ok(md.includes('Thử việc'), 'Should indicate probation contract type');
    assert.ok(md.includes('Probation'), 'Should include English probation type');
});

test('contractGenerator: includes DRAFT watermark when status is Draft', () => {
    const md = generateMarkdownContract(baseContractData());
    assert.ok(md.includes('DỰ THẢO'), 'Should include draft warning in Vietnamese');
    assert.ok(md.includes('DRAFT DOCUMENT'), 'Should include draft warning in English');
});

test('contractGenerator: does NOT include DRAFT watermark when status is Active', () => {
    const data = baseContractData({ status: 'Active' });
    const md = generateMarkdownContract(data);
    assert.ok(!md.includes('DRAFT DOCUMENT'), 'Should NOT include draft warning for active contract');
});

test('contractGenerator: includes social insurance clause when enabled', () => {
    const md = generateMarkdownContract(baseContractData());
    assert.ok(md.includes('social insurance'), 'Should reference social insurance');
});

test('contractGenerator: includes no social insurance clause when disabled', () => {
    const data = baseContractData({
        compensation: { ...baseContractData().compensation, social_insurance: false },
    });
    const md = generateMarkdownContract(data);
    assert.ok(md.includes('does not include social insurance'), 'Should explain no social insurance');
});

test('contractGenerator: includes signature section with party names', () => {
    const md = generateMarkdownContract(baseContractData());
    assert.ok(md.includes('CHỮ KÝ'), 'Should include signature section');
    assert.ok(md.includes('SIGNATURES'), 'Should include English signature section');
    assert.ok(md.includes('Nguyễn Văn A'), 'Should include employer representative');
    assert.ok(md.includes('Trần Thị B'), 'Should include employee name in signatures');
});

test('contractGenerator: includes start date and end date', () => {
    const md = generateMarkdownContract(baseContractData());
    // formatDate returns dd/mm/yyyy format
    assert.ok(md.includes('2026'), 'Should include the start year');
    assert.ok(md.includes('2027'), 'Should include the end year');
});

// ─── Validation / Warning Tests ───────────────────────────────────────────────

test('contractGenerator: warns when salary is below minimum wage (4,960,000)', () => {
    const data = baseContractData({
        compensation: { ...baseContractData().compensation, basic_salary: 3_000_000 },
    });
    const md = generateMarkdownContract(data);
    assert.ok(md.includes('⚠️'), 'Should include warning emoji');
    assert.ok(md.includes('lương tối thiểu'), 'Should warn about minimum wage violation in Vietnamese');
    assert.ok(md.includes('minimum wage'), 'Should warn about minimum wage in English');
});

test('contractGenerator: warns when fixed_term contract has no end date', () => {
    const data = baseContractData({
        job: { ...baseContractData().job, end_date: null },
    });
    const md = generateMarkdownContract(data);
    assert.ok(md.includes('⚠️'), 'Should include warning');
    assert.ok(md.includes('end date'), 'Should warn about missing end date');
});

test('contractGenerator: warns when ID number has invalid length', () => {
    const data = baseContractData({
        employee: { ...baseContractData().employee, id_number: '12345' }, // Invalid: not 9 or 12 digits
    });
    const md = generateMarkdownContract(data);
    assert.ok(md.includes('⚠️'), 'Should include warning');
    assert.ok(md.includes('ID number must be 9 or 12 digits'), 'Should warn about invalid ID');
});

test('contractGenerator: no warnings when contract is fully valid', () => {
    const data = baseContractData();
    const md = generateMarkdownContract(data);
    // Valid data: salary OK, end_date OK for fixed_term, ID 12 digits OK
    assert.ok(!md.includes('⚠️'), 'Should have no warnings for a fully valid contract');
});

test('contractGenerator: handles missing end_date gracefully (formatDate returns N/A)', () => {
    const data = baseContractData({ contract_type: 'indefinite', job: { ...baseContractData().job, end_date: null } });
    const md = generateMarkdownContract(data);
    // end_date line is only shown when end_date exists, so no crash
    assert.ok(typeof md === 'string');
});

test('contractGenerator: salary below 1M or above 100M falls back to plain VND string', () => {
    const data = baseContractData({
        compensation: { ...baseContractData().compensation, basic_salary: 500_000 }, // < 1M
    });
    const md = generateMarkdownContract(data);
    // numberToVietnameseWords returns plain VND for values outside millions range
    assert.ok(md.includes('500.000 VND') || md.includes('500,000 VND') || md.includes('500000'), 'Should format small salary as plain VND');
});
