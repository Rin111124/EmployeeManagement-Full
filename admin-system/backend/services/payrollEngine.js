/**
 * Payroll Calculation Engine - Vietnam Labor Code 2019 Compliant
 * Flexible and Configurable Time Module
 */

class PayrollEngine {
    constructor(config = {}) {
        this.config = {
            nightStartHour: 22, // 22:00
            nightEndHour: 6,    // 06:00
            standardHoursPerDay: 8,
            dayBreakMins: 30,
            nightBreakMins: 45,
            minWorkMinsForBreak: 240, // Apply break after 4 hours of continuous work
            
            // Multipliers based on Vietnam Labor Code
            rates: {
                Normal: { 
                    day_normal: 1.0, 
                    night_normal: 1.3, 
                    day_ot: 1.5, 
                    night_ot: 2.0 
                },
                Weekend: { 
                    day_normal: 2.0, 
                    night_normal: 2.7, 
                    day_ot: 2.0, 
                    night_ot: 2.7 
                },
                Holiday: { 
                    day_normal: 3.0, 
                    night_normal: 3.9, 
                    day_ot: 3.0, 
                    night_ot: 3.9 
                }
            },
            useStrictOTApproval: false, // Mặc định tính OT tự động sau 8h làm việc
            ...config
        };
    }

    isNightTime(date) {
        const h = date.getHours();
        if (this.config.nightStartHour > this.config.nightEndHour) {
            return h >= this.config.nightStartHour || h < this.config.nightEndHour;
        }
        return h >= this.config.nightStartHour && h < this.config.nightEndHour;
    }

    /**
     * Phân tích ca làm việc thành các nhóm giờ
     * @param {string|Date} startTime 
     * @param {string|Date} endTime 
     * @param {string} dayType 'Normal' | 'Weekend' | 'Holiday'
     * @param {Object} shiftConfig Optional shift config
     * @param {number} allowedOTMins Số phút tăng ca tối đa được duyệt (chỉ dùng nếu useStrictOTApproval = true)
     */
    analyzeShift(startTime, endTime, dayType = 'Normal', shiftConfig = null, allowedOTMins = 0) {
        const startMs = new Date(startTime).getTime();
        const endMs = new Date(endTime).getTime();
        
        let workedMins = 0;
        let totalPaidMins = 0;
        let dayBreakTaken = 0;
        let nightBreakTaken = 0;
        let totalShiftBreakTaken = 0;
        
        let buckets = {
            day_normal: 0,
            night_normal: 0,
            day_ot: 0,
            night_ot: 0
        };

        const stdHours = Number(shiftConfig?.standard_hours ?? this.config.standardHoursPerDay ?? 8);
        const standardMins = stdHours * 60;
        const useGlobalSplitBreaks = !shiftConfig || shiftConfig.break_mins == null;

        // Quét từng phút một để tính toán linh hoạt nhất
        for (let ms = startMs; ms < endMs; ms += 60000) {
            const currentTime = new Date(ms);
            const isNight = this.isNightTime(currentTime);
            const currentHHmm = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
            
            // 1. Kiểm tra thời gian nghỉ cố định
            let isFixedBreak = false;
            const fixedBreaks = shiftConfig?.fixed_breaks || this.config.fixed_breaks || [];
            if (Array.isArray(fixedBreaks)) {
                for (const brk of fixedBreaks) {
                    if (currentHHmm >= brk.start && currentHHmm < brk.end) {
                        isFixedBreak = true;
                        break;
                    }
                }
            }
            if (isFixedBreak) continue;

            // 2. Xử lý trừ giờ nghỉ linh hoạt
            if (useGlobalSplitBreaks) {
                if (!isNight) {
                    if (workedMins >= this.config.minWorkMinsForBreak && dayBreakTaken < this.config.dayBreakMins) {
                        dayBreakTaken++;
                        continue;
                    }
                } else {
                    if (workedMins >= this.config.minWorkMinsForBreak && nightBreakTaken < this.config.nightBreakMins) {
                        nightBreakTaken++;
                        continue;
                    }
                }
            } else {
                if (workedMins >= shiftConfig.min_work_mins_for_break && totalShiftBreakTaken < shiftConfig.break_mins) {
                    totalShiftBreakTaken++;
                    continue;
                }
            }
            workedMins++;

            // Phân bổ giờ vào nhóm tương ứng
            if (dayType === 'Normal') {
                if (totalPaidMins < standardMins) {
                    // Giờ làm việc tiêu chuẩn
                    if (isNight) buckets.night_normal++;
                    else buckets.day_normal++;
                    totalPaidMins++;
                } else {
                    // Giờ tăng ca: Tự động tính nếu không bật chế độ phê duyệt nghiêm ngặt
                    const currentOTMins = (totalPaidMins - standardMins);
                    if (!this.config.useStrictOTApproval || currentOTMins < allowedOTMins) {
                        if (isNight) buckets.night_ot++;
                        else buckets.day_ot++;
                        totalPaidMins++;
                    }
                }
            } else {
                // Với ngày nghỉ/lễ: Toàn bộ giờ được tính là OT
                if (!this.config.useStrictOTApproval || totalPaidMins < allowedOTMins) {
                    if (isNight) buckets.night_ot++;
                    else buckets.day_ot++;
                    totalPaidMins++;
                }
            }
        }

        return buckets;
    }

    /**
     * Tính toán tổng lương
     * @param {number} baseHourlyRate Mức lương cơ bản theo giờ
     * @param {Array} shifts Danh sách các ca làm việc [{ startTime, endTime, dayType, allowedOTMins }]
     */
    calculate(baseHourlyRate, shifts) {
        let summary = {
            Normal: { day_normal: 0, night_normal: 0, day_ot: 0, night_ot: 0 },
            Weekend: { day_normal: 0, night_normal: 0, day_ot: 0, night_ot: 0 },
            Holiday: { day_normal: 0, night_normal: 0, day_ot: 0, night_ot: 0 }
        };

        // Phân tích từng ca làm việc
        shifts.forEach(shift => {
            const validDayType = summary[shift.dayType] ? shift.dayType : 'Normal';
            const buckets = this.analyzeShift(
                shift.startTime, 
                shift.endTime, 
                validDayType, 
                shift.shiftConfig,
                shift.allowedOTMins || 0
            );
            for (let key in buckets) {
                summary[validDayType][key] += buckets[key] / 60; // Đổi sang giờ
            }
        });

        let detailedBreakdown = [];
        let totalIncome = 0;

        // Tổng hợp và nhân hệ số
        for (let type in summary) {
            for (let key in summary[type]) {
                const hours = summary[type][key];
                if (hours > 0) {
                    const multiplier = this.config.rates[type][key];
                    const amount = hours * baseHourlyRate * multiplier;
                    detailedBreakdown.push({
                        category: `${type}_${key}`,
                        description: this.getDescription(type, key),
                        hours: Number(hours.toFixed(2)),
                        multiplier: multiplier,
                        amount: Math.round(amount)
                    });
                    totalIncome += amount;
                }
            }
        }

        return {
            baseHourlyRate,
            totalShifts: shifts.length,
            detailedBreakdown,
            totalIncome: Math.round(totalIncome),
            currency: 'VND'
        };
    }

    getDescription(type, key) {
        const labels = {
            'Normal_day_normal': 'Giờ làm việc bình thường (Ca ngày)',
            'Normal_night_normal': 'Làm ca đêm (Trong 8h tiêu chuẩn)',
            'Normal_day_ot': 'Tăng ca ngày thường',
            'Normal_night_ot': 'Tăng ca đêm ngày thường',
            'Weekend_day_ot': 'Tăng ca ngày nghỉ hằng tuần',
            'Weekend_night_ot': 'Tăng ca đêm ngày nghỉ hằng tuần',
            'Holiday_day_ot': 'Tăng ca ngày Lễ/Tết',
            'Holiday_night_ot': 'Tăng ca đêm ngày Lễ/Tết'
        };
        return labels[`${type}_${key}`] || 'Khác';
    }
}

module.exports = PayrollEngine;
