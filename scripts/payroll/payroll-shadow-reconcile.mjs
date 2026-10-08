#!/usr/bin/env node

/**
 * scripts/payroll/payroll-shadow-reconcile.mjs
 *
 * Automated Payroll Shadow Reconciliation Tool (Gate 4).
 * Runs the PayrollEngine against an independently verified golden dataset of
 * complex labor shifts (standard day, night, cross-midnight, weekend, holiday, OT approval controls).
 * Reconciles calculated pay against expected numbers with 0 VND error tolerance.
 */

import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const PayrollEngine = require('../../packages/backend/services/payrollEngine.js');

const HOURLY_RATE = 100_000; // 100,000 VND / hour benchmark

function utcFromVietnam(year, month, day, hour, minute) {
    // Vietnam is UTC+7
    return new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
}

// --- Golden Reference Shift Cases -----------------------------------------
export const GOLDEN_CASES = [
    {
        id: 'GOLDEN-01',
        title: 'Ca ngay thuong tieu chuan 8h (Day Shift Normal)',
        description: '08:00 -> 17:00 (9h co mat, tru 30p nghi sau 4h = 8.5h lam; 8h chuan @ 1.0x, 30p OT ngay @ 1.5x)',
        config: { useStrictOTApproval: false },
        shifts: [
            {
                startTime: utcFromVietnam(2026, 10, 5, 8, 0),
                endTime: utcFromVietnam(2026, 10, 5, 17, 0),
                dayType: 'Normal',
            },
        ],
        // 8h * 100,000 * 1.0 = 800,000 VND
        // 0.5h * 100,000 * 1.5 = 75,000 VND
        // Tong: 875,000 VND
        expected: {
            totalHours: 8.5,
            totalIncome: 875_000,
        },
    },
    {
        id: 'GOLDEN-02',
        title: 'Ca ngay co 2h OT duoc phe duyet (Approved Overtime 2h)',
        description: '08:00 -> 18:30 (10.5h co mat, tru 30p nghi = 10h lam; 8h chuan @ 1.0x, 2h OT @ 1.5x)',
        config: { useStrictOTApproval: true },
        shifts: [
            {
                startTime: utcFromVietnam(2026, 10, 6, 8, 0),
                endTime: utcFromVietnam(2026, 10, 6, 18, 30),
                dayType: 'Normal',
                allowedOTMins: 120, // 2 gio OT duoc duyet
            },
        ],
        // 8h * 100,000 * 1.0 = 800,000 VND
        // 2h * 100,000 * 1.5 = 300,000 VND
        // Tong: 1,100,000 VND
        expected: {
            totalHours: 10.0,
            totalIncome: 1_100_000,
        },
    },
    {
        id: 'GOLDEN-03',
        title: 'Ca co OT nhung KHONG duoc duyet (Unapproved OT Rejection)',
        description: '08:00 -> 19:30 (11h co mat, tru 30p nghi = 10.5h; allowedOTMins = 0; chi thanh toan dung 8h)',
        config: { useStrictOTApproval: true },
        shifts: [
            {
                startTime: utcFromVietnam(2026, 10, 7, 8, 0),
                endTime: utcFromVietnam(2026, 10, 7, 19, 30),
                dayType: 'Normal',
                allowedOTMins: 0,
            },
        ],
        // 8h * 100,000 * 1.0 = 800,000 VND
        expected: {
            totalHours: 8.0,
            totalIncome: 800_000,
        },
    },
    {
        id: 'GOLDEN-04',
        title: 'Ca dem tron ven (Full Night Shift 22:00 -> 06:00)',
        description: '22:00 -> 06:00 hom sau (8h co mat dem; tru 45p nghi dem = 7.25h night_normal @ 1.3x)',
        config: { useStrictOTApproval: false },
        shifts: [
            {
                startTime: utcFromVietnam(2026, 10, 8, 22, 0),
                endTime: utcFromVietnam(2026, 10, 9, 6, 0),
                dayType: 'Normal',
            },
        ],
        // 7.25h * 100,000 * 1.3 = 942,500 VND
        expected: {
            totalHours: 7.25,
            totalIncome: 942_500,
        },
    },
    {
        id: 'GOLDEN-05',
        title: 'Ca cuoi tuan (Weekend Rest-Day Shift)',
        description: '08:00 -> 16:30 Chu nhat (8.5h co mat, tru 30p nghi = 8h; toan bo tinh OT cuoi tuan @ 2.0x)',
        config: { useStrictOTApproval: false },
        shifts: [
            {
                startTime: utcFromVietnam(2026, 10, 11, 8, 0),
                endTime: utcFromVietnam(2026, 10, 11, 16, 30),
                dayType: 'Weekend',
            },
        ],
        // 8h * 100,000 * 2.0 = 1,600,000 VND
        expected: {
            totalHours: 8.0,
            totalIncome: 1_600_000,
        },
    },
    {
        id: 'GOLDEN-06',
        title: 'Ca ngay le Tet (Public Holiday Shift)',
        description: '08:00 -> 16:30 Ngay le (8.5h co mat, tru 30p nghi = 8h; toan bo tinh OT ngay le @ 3.0x)',
        config: { useStrictOTApproval: false },
        shifts: [
            {
                startTime: utcFromVietnam(2026, 9, 2, 8, 0),
                endTime: utcFromVietnam(2026, 9, 2, 16, 30),
                dayType: 'Holiday',
            },
        ],
        // 8h * 100,000 * 3.0 = 2,400,000 VND
        expected: {
            totalHours: 8.0,
            totalIncome: 2_400_000,
        },
    },
];

export function runShadowReconciliation() {
    console.log('========================================================================================');
    console.log('         BAO CAO DOI CHIEU NGHIEP VU BANG LUONG SHADOW (GATE 4)                       ');
    console.log('========================================================================================');
    console.log(`Don gia chuan doi chieu: ${HOURLY_RATE.toLocaleString('vi-VN')} VND / gio`);
    console.log(`So luong ca vang kiem thu: ${GOLDEN_CASES.length} kich ban`);
    console.log('----------------------------------------------------------------------------------------\n');

    const results = [];
    let allPassed = true;

    for (const testCase of GOLDEN_CASES) {
        const engine = new PayrollEngine(testCase.config);
        const result = engine.calculate(HOURLY_RATE, testCase.shifts);

        const actualHours = Number(result.detailedBreakdown.reduce((sum, item) => sum + item.hours, 0).toFixed(2));
        const variance = Math.abs(result.totalIncome - testCase.expected.totalIncome);
        const hoursVariance = Math.abs(actualHours - testCase.expected.totalHours);
        const passed = variance === 0 && hoursVariance < 0.01;

        if (!passed) allPassed = false;

        results.push({
            id: testCase.id,
            title: testCase.title,
            expectedHours: testCase.expected.totalHours,
            actualHours,
            expectedIncome: testCase.expected.totalIncome,
            actualIncome: result.totalIncome,
            varianceVND: variance,
            status: passed ? 'PASS \u2705' : 'FAIL \u274C',
        });
    }

    // In bang doi chieu
    console.log('| Ma kich ban | Mo ta ca lam viec | Gio chuan | Gio tinh | Luong chuan (VND) | Luong tinh (VND) | Chenh lech | Ket qua |');
    console.log('|---|---|---|---|---|---|---|---|');
    for (const r of results) {
        console.log(
            `| ${r.id} | ${r.title} | ${r.expectedHours}h | ${r.actualHours}h | ${r.expectedIncome.toLocaleString('vi-VN')} | ${r.actualIncome.toLocaleString('vi-VN')} | ${r.varianceVND} VND | ${r.status} |`
        );
    }

    console.log('\n========================================================================================');
    if (allPassed) {
        console.log('  KET LUAN: DOI CHIEU HOAN TOAN KHOP 100% (Sai so = 0 VND tren toan bo kich ban) \u2705    ');
        console.log('  Du dieu kien trinh PO/HR/Finance ky duyet bien ban Gate 4.                        ');
    } else {
        console.log('  KET LUAN: PHAT HIEN SAI LECH NGHIEP VU CAN HIEU CHINH \u274C                          ');
    }
    console.log('========================================================================================\n');

    return { allPassed, results };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    const outcome = runShadowReconciliation();
    process.exit(outcome.allPassed ? 0 : 1);
}
