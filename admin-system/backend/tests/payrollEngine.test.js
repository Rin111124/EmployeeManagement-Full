'use strict';
/**
 * Unit tests cho PayrollEngine
 * Tuân thủ Bộ luật Lao động Việt Nam 2019
 * Chạy: npm test  (hoặc node --test tests/payrollEngine.test.js)
 *
 * LƯU Ý: PayrollEngine.isNightTime() dùng getHours() (local time), không phải UTC.
 * Các test dưới đây tạo Date bằng local time để phù hợp với engine.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const PayrollEngine = require('../services/payrollEngine');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Tạo Date object dùng giờ LOCAL (khớp với cách engine dùng getHours()).
 * @param {number} year
 * @param {number} month  1-indexed
 * @param {number} day
 * @param {number} hour   0-23
 * @param {number} minute 0-59
 */
function localDate(year, month, day, hour, minute = 0) {
    return new Date(year, month - 1, day, hour, minute, 0, 0);
}

const engine = new PayrollEngine();
const HOURLY_RATE = 100_000; // 100k VND/giờ

// ─── 1. isNightTime() — test đơn giản nhất trước ──────────────────────────────

describe('PayrollEngine.isNightTime()', () => {
    it('22:00 là ca đêm', () => {
        assert.ok(engine.isNightTime(localDate(2025, 1, 6, 22)));
    });
    it('23:00 là ca đêm', () => {
        assert.ok(engine.isNightTime(localDate(2025, 1, 6, 23)));
    });
    it('00:00 là ca đêm', () => {
        assert.ok(engine.isNightTime(localDate(2025, 1, 7, 0)));
    });
    it('05:00 là ca đêm', () => {
        assert.ok(engine.isNightTime(localDate(2025, 1, 7, 5)));
    });
    it('06:00 không phải ca đêm', () => {
        assert.ok(!engine.isNightTime(localDate(2025, 1, 7, 6)));
    });
    it('12:00 không phải ca đêm', () => {
        assert.ok(!engine.isNightTime(localDate(2025, 1, 6, 12)));
    });
    it('21:00 không phải ca đêm', () => {
        assert.ok(!engine.isNightTime(localDate(2025, 1, 6, 21)));
    });
});

// ─── 2. analyzeShift() ────────────────────────────────────────────────────────

describe('PayrollEngine.analyzeShift()', () => {
    it('Ca ngày thường 8h (07:00→15:00): không có ca đêm, không có OT', () => {
        // 07:00–15:00 hoàn toàn trong giờ ban ngày (06:00–22:00)
        const buckets = engine.analyzeShift(
            localDate(2025, 1, 6, 7),
            localDate(2025, 1, 6, 15),
            'Normal',
        );
        assert.ok(buckets.day_normal > 0, 'Phải có giờ day_normal');
        assert.strictEqual(buckets.night_normal, 0, 'Không có giờ ca đêm');
        assert.strictEqual(buckets.day_ot, 0, 'Không có OT ngày');
        assert.strictEqual(buckets.night_ot, 0, 'Không có OT đêm');
    });

    it('Ca 10h (07:00→17:00): 8h đầu là normal, 2h cuối là OT', () => {
        const buckets = engine.analyzeShift(
            localDate(2025, 1, 6, 7),
            localDate(2025, 1, 6, 17),
            'Normal',
        );
        assert.ok(buckets.day_normal > 0, 'Phải có day_normal');
        // Sau 8h tiêu chuẩn (+ 30 phút break) sẽ có OT
        assert.ok(buckets.day_ot > 0, 'Phải có day_ot sau giờ tiêu chuẩn');
    });

    it('Weekend (08:00→16:00): toàn bộ giờ là day_ot, không có normal', () => {
        const buckets = engine.analyzeShift(
            localDate(2025, 1, 4, 8),  // Thứ 7
            localDate(2025, 1, 4, 16),
            'Weekend',
        );
        assert.ok(buckets.day_ot > 0, 'Weekend phải là OT');
        assert.strictEqual(buckets.day_normal, 0, 'Weekend không có normal');
        assert.strictEqual(buckets.night_normal, 0, 'Weekend không có night_normal');
    });

    it('Holiday (08:00→16:00): toàn bộ giờ là day_ot', () => {
        const buckets = engine.analyzeShift(
            localDate(2025, 1, 1, 8),
            localDate(2025, 1, 1, 16),
            'Holiday',
        );
        assert.ok(buckets.day_ot > 0, 'Holiday phải là OT');
        assert.strictEqual(buckets.day_normal, 0, 'Holiday không có normal');
    });

    it('Ca đêm (22:00→06:00 hôm sau): phần lớn giờ là night_normal', () => {
        const buckets = engine.analyzeShift(
            localDate(2025, 1, 6, 22),
            localDate(2025, 1, 7, 6),
            'Normal',
        );
        assert.ok(buckets.night_normal > 0, 'Phải có giờ ca đêm');
        assert.strictEqual(buckets.day_ot, 0, 'Ca đêm trong 8h không có OT');
    });

    it('Ca vắt đêm (16:00→01:00): có cả day_normal và night_normal', () => {
        const buckets = engine.analyzeShift(
            localDate(2025, 1, 6, 16),
            localDate(2025, 1, 7, 1),
            'Normal',
        );
        assert.ok(buckets.day_normal > 0, 'Phải có day_normal trước 22h');
        assert.ok(buckets.night_normal > 0, 'Phải có night_normal sau 22h');
    });

    it('check_in === check_out: không có giờ nào', () => {
        const buckets = engine.analyzeShift(
            localDate(2025, 1, 6, 8),
            localDate(2025, 1, 6, 8),
            'Normal',
        );
        const total = Object.values(buckets).reduce((a, b) => a + b, 0);
        assert.strictEqual(total, 0, 'Không có giờ nếu check_in = check_out');
    });

    it('shiftConfig với break_mins=60 cho ít giờ làm hơn globalBreak=30', () => {
        const shiftConfig = { break_mins: 60, min_work_mins_for_break: 120, standard_hours: 8 };
        const bucketsCustom = engine.analyzeShift(
            localDate(2025, 1, 6, 8),
            localDate(2025, 1, 6, 17),
            'Normal',
            shiftConfig,
        );
        const bucketsGlobal = engine.analyzeShift(
            localDate(2025, 1, 6, 8),
            localDate(2025, 1, 6, 17),
            'Normal',
        );
        const totalCustom = Object.values(bucketsCustom).reduce((a, b) => a + b, 0);
        const totalGlobal = Object.values(bucketsGlobal).reduce((a, b) => a + b, 0);
        assert.ok(totalCustom < totalGlobal, 'Nghỉ 60 phút phải cho ít giờ làm hơn nghỉ 30 phút');
    });
});

// ─── 3. calculate() ───────────────────────────────────────────────────────────

describe('PayrollEngine.calculate()', () => {
    it('Ca ngày 8h: thu nhập nằm trong khoảng [7h, 8h] × rate', () => {
        const result = engine.calculate(HOURLY_RATE, [{
            startTime: localDate(2025, 1, 6, 7),
            endTime: localDate(2025, 1, 6, 15),
            dayType: 'Normal',
        }]);
        assert.ok(result.totalIncome > 0, 'Thu nhập phải > 0');
        assert.ok(result.totalIncome <= 8 * HOURLY_RATE, 'Không vượt 8h × rate');
        assert.ok(result.totalIncome >= 7 * HOURLY_RATE, 'Ít nhất 7h × rate');
    });

    it('Hệ số: Weekend > Normal cùng số giờ', () => {
        const normal = engine.calculate(HOURLY_RATE, [{
            startTime: localDate(2025, 1, 6, 8),
            endTime: localDate(2025, 1, 6, 16),
            dayType: 'Normal',
        }]);
        const weekend = engine.calculate(HOURLY_RATE, [{
            startTime: localDate(2025, 1, 4, 8),
            endTime: localDate(2025, 1, 4, 16),
            dayType: 'Weekend',
        }]);
        assert.ok(weekend.totalIncome > normal.totalIncome, 'Weekend phải cao hơn Normal');
    });

    it('Hệ số: Holiday > Weekend cùng số giờ', () => {
        const weekend = engine.calculate(HOURLY_RATE, [{
            startTime: localDate(2025, 1, 4, 8),
            endTime: localDate(2025, 1, 4, 16),
            dayType: 'Weekend',
        }]);
        const holiday = engine.calculate(HOURLY_RATE, [{
            startTime: localDate(2025, 1, 1, 8),
            endTime: localDate(2025, 1, 1, 16),
            dayType: 'Holiday',
        }]);
        assert.ok(holiday.totalIncome > weekend.totalIncome, 'Holiday phải cao hơn Weekend');
    });

    it('Không có ca: totalIncome = 0, breakdown rỗng', () => {
        const result = engine.calculate(HOURLY_RATE, []);
        assert.strictEqual(result.totalIncome, 0);
        assert.strictEqual(result.totalShifts, 0);
        assert.strictEqual(result.detailedBreakdown.length, 0);
    });

    it('2 ca giống nhau = xấp xỉ 2 × 1 ca (sai số ≤ 2 VND)', () => {
        const single = engine.calculate(HOURLY_RATE, [{
            startTime: localDate(2025, 1, 6, 7),
            endTime: localDate(2025, 1, 6, 15),
            dayType: 'Normal',
        }]);
        const double = engine.calculate(HOURLY_RATE, [
            {
                startTime: localDate(2025, 1, 6, 7),
                endTime: localDate(2025, 1, 6, 15),
                dayType: 'Normal',
            },
            {
                startTime: localDate(2025, 1, 7, 7),
                endTime: localDate(2025, 1, 7, 15),
                dayType: 'Normal',
            },
        ]);
        assert.ok(
            Math.abs(double.totalIncome - single.totalIncome * 2) <= 2,
            '2 ca giống nhau phải ≈ 2 × 1 ca',
        );
    });

    it('OT ngày thường có multiplier 1.5x trong breakdown', () => {
        const result = engine.calculate(HOURLY_RATE, [{
            startTime: localDate(2025, 1, 6, 7),
            endTime: localDate(2025, 1, 6, 18),  // 11h → có OT
            dayType: 'Normal',
        }]);
        const otEntry = result.detailedBreakdown.find((b) => b.category === 'Normal_day_ot');
        assert.ok(otEntry, 'Phải có breakdown cho OT ngày thường');
        assert.strictEqual(otEntry.multiplier, 1.5, 'OT ngày thường = 1.5x');
    });

    it('Ca đêm có night_normal với multiplier 1.3x', () => {
        const result = engine.calculate(HOURLY_RATE, [{
            startTime: localDate(2025, 1, 6, 22),
            endTime: localDate(2025, 1, 7, 6),
            dayType: 'Normal',
        }]);
        const nightEntry = result.detailedBreakdown.find((b) => b.category === 'Normal_night_normal');
        assert.ok(nightEntry, 'Phải có breakdown cho ca đêm');
        assert.strictEqual(nightEntry.multiplier, 1.3, 'Ca đêm trong 8h = 1.3x');
    });

    it('result.currency luôn là VND', () => {
        const result = engine.calculate(HOURLY_RATE, []);
        assert.strictEqual(result.currency, 'VND');
    });
});

// ─── 4. Custom config ─────────────────────────────────────────────────────────

describe('PayrollEngine với custom config', () => {
    it('standardHoursPerDay=6: ca 8h có OT sau 6h', () => {
        const customEngine = new PayrollEngine({ standardHoursPerDay: 6 });
        const result = customEngine.calculate(HOURLY_RATE, [{
            startTime: localDate(2025, 1, 6, 7),
            endTime: localDate(2025, 1, 6, 15),  // 8h làm
            dayType: 'Normal',
        }]);
        const otEntry = result.detailedBreakdown.find((b) => b.category === 'Normal_day_ot');
        assert.ok(otEntry && otEntry.hours > 0, 'standardHoursPerDay=6: 8h làm phải có OT');
    });

    it('Custom night rate override: thu nhập ca đêm phải tăng', () => {
        const higherNightEngine = new PayrollEngine({
            rates: {
                Normal: { day_normal: 1.0, night_normal: 1.8, day_ot: 1.5, night_ot: 2.5 },
                Weekend: { day_normal: 2.0, night_normal: 2.7, day_ot: 2.0, night_ot: 2.7 },
                Holiday: { day_normal: 3.0, night_normal: 3.9, day_ot: 3.0, night_ot: 3.9 },
            },
        });
        const defaultResult = engine.calculate(HOURLY_RATE, [{
            startTime: localDate(2025, 1, 6, 22),
            endTime: localDate(2025, 1, 7, 4),
            dayType: 'Normal',
        }]);
        const customResult = higherNightEngine.calculate(HOURLY_RATE, [{
            startTime: localDate(2025, 1, 6, 22),
            endTime: localDate(2025, 1, 7, 4),
            dayType: 'Normal',
        }]);
        assert.ok(
            customResult.totalIncome > defaultResult.totalIncome,
            'Night rate 1.8x phải cho thu nhập cao hơn 1.3x',
        );
    });
});
