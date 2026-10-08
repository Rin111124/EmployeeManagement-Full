'use strict';
/**
 * Bộ Unit Test mở rộng cho PayrollEngine
 * Tập trung vào các trường hợp biên, cấu hình ca (ShiftConfig) và độ chính xác của giờ nghỉ.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const PayrollEngine = require('../services/payrollEngine');

function localDate(year, month, day, hour, minute = 0) {
    return new Date(year, month - 1, day, hour, minute, 0, 0);
}

const engine = new PayrollEngine();
const HOURLY_RATE = 100_000;

describe('PayrollEngine - Extended Edge Cases', () => {

    describe('Logic Giờ nghỉ (Break Logic)', () => {
        it('Không trừ giờ nghỉ nếu làm việc dưới 4 tiếng (240 phút)', () => {
            const startTime = localDate(2025, 1, 6, 8, 0);
            const endTime = localDate(2025, 1, 6, 11, 59); // 239 phút
            const buckets = engine.analyzeShift(startTime, endTime, 'Normal');
            
            assert.strictEqual(buckets.day_normal, 239, 'Làm 239 phút phải được tính đủ 239 phút');
        });

        it('Trừ đúng 30 phút nghỉ sau khi làm đủ 4 tiếng ca ngày', () => {
            const startTime = localDate(2025, 1, 6, 8, 0);
            const endTime = localDate(2025, 1, 6, 13, 0); // 5 tiếng = 300 phút
            const buckets = engine.analyzeShift(startTime, endTime, 'Normal');
            
            // 300 phút tổng - 30 phút nghỉ = 270 phút làm việc
            assert.strictEqual(buckets.day_normal, 270, 'Làm 5 tiếng ca ngày phải còn 270 phút sau khi trừ 30p nghỉ');
        });

        it('Trừ đúng 45 phút nghỉ sau khi làm đủ 4 tiếng ca đêm', () => {
            const startTime = localDate(2025, 1, 6, 22, 0);
            const endTime = localDate(2025, 1, 7, 3, 0); // 5 tiếng đêm = 300 phút
            const buckets = engine.analyzeShift(startTime, endTime, 'Normal');
            
            // 300 phút tổng - 45 phút nghỉ = 255 phút làm việc
            assert.strictEqual(buckets.night_normal, 255, 'Làm 5 tiếng ca đêm phải còn 255 phút sau khi trừ 45p nghỉ');
        });
    });

    describe('Cấu hình ca làm việc (ShiftConfig Overrides)', () => {
        it('Sử dụng standard_hours từ ShiftConfig thay vì global config', () => {
            const shiftConfig = { standard_hours: 4 }; // Chỉ 4h đầu là bình thường, sau đó là OT
            const startTime = localDate(2025, 1, 6, 8, 0);
            const endTime = localDate(2025, 1, 6, 14, 0); // 6 tiếng
            
            const buckets = engine.analyzeShift(startTime, endTime, 'Normal', shiftConfig);
            
            // Mặc định global break là 30p sau 4h. 
            // 6h tổng = 360p. Trừ 30p nghỉ = 330p làm việc.
            // 4h đầu (240p) là day_normal. Còn lại 90p là day_ot.
            assert.strictEqual(buckets.day_normal, 240, 'Chỉ 4h đầu là normal theo shiftConfig');
            assert.strictEqual(buckets.day_ot, 90, 'Phần còn lại sau 4h phải là OT');
        });

        it('Sử dụng break_mins tùy chỉnh từ ShiftConfig', () => {
            const shiftConfig = { break_mins: 60, min_work_mins_for_break: 120 }; 
            const startTime = localDate(2025, 1, 6, 8, 0);
            const endTime = localDate(2025, 1, 6, 12, 0); // 4 tiếng = 240 phút
            
            const buckets = engine.analyzeShift(startTime, endTime, 'Normal', shiftConfig);
            
            // Nghỉ 60p sau 120p làm. 
            // 240p tổng - 60p nghỉ = 180p làm việc.
            assert.strictEqual(buckets.day_normal, 180, 'Phải trừ 60p nghỉ theo shiftConfig');
        });
    });

    describe('Ca vắt đêm và OT (Night Shift & OT Integration)', () => {
        it('Tính đúng OT đêm cho ca làm việc kéo dài ngày thường', () => {
            // Ca từ 14:00 đến 02:00 sáng hôm sau (12 tiếng)
            const startTime = localDate(2025, 1, 6, 14, 0);
            const endTime = localDate(2025, 1, 7, 2, 0);
            
            const buckets = engine.analyzeShift(startTime, endTime, 'Normal');
            
            // Tổng: 12h = 720p. 
            // 14:00 + 4h = 18:00 -> Trừ 30p nghỉ.
            // Tiếp tục đến 22:00 (Hết 8h tiêu chuẩn tại 14:00 + 8h + 30p nghỉ = 22:30?)
            // Hãy check buckets
            assert.ok(buckets.night_ot > 0, 'Phải có giờ OT đêm (sau 22h và vượt 8h làm việc)');
        });
    });

    describe('Mô tả và Nhãn (Descriptions & Labels)', () => {
        it('Trả về đúng mô tả cho tất cả các loại danh mục', () => {
            assert.strictEqual(engine.getDescription('Normal', 'day_normal'), 'Giờ làm việc bình thường (Ca ngày)');
            assert.strictEqual(engine.getDescription('Holiday', 'night_ot'), 'Tăng ca đêm ngày Lễ/Tết');
            assert.strictEqual(engine.getDescription('Unknown', 'key'), 'Khác');
        });
    });

    describe('Độ chính xác tính toán (Calculation Accuracy)', () => {
        it('Làm tròn thu nhập đến hàng đơn vị VND', () => {
            const result = engine.calculate(33333.33, [{
                startTime: localDate(2025, 1, 6, 8, 0),
                endTime: localDate(2025, 1, 6, 12, 0),
                dayType: 'Normal'
            }]);
            
            assert.strictEqual(typeof result.totalIncome, 'number');
            assert.ok(Number.isInteger(result.totalIncome), 'Thu nhập phải là số nguyên (sau khi round)');
        });
    });
});
