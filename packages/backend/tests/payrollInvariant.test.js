'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const PayrollEngine = require('../services/payrollEngine');

const RATE = 123_456;
const engine = new PayrollEngine({ useStrictOTApproval: true });

function utcAtVietnamHour(dayOffset, hour, minute = 0) {
    // The engine reads UTC timestamps and applies Vietnam's UTC+7 offset.
    return new Date(Date.UTC(2026, 0, 5 + dayOffset, hour - 7, minute));
}

test('payroll invariants hold across generated day, night, and cross-midnight shifts', () => {
    const dayTypes = ['Normal', 'Weekend', 'Holiday'];

    for (let index = 0; index < 120; index += 1) {
        const startHour = (index * 7) % 24;
        const startMinute = (index * 13) % 60;
        const durationMinutes = 30 + ((index * 97) % (16 * 60));
        const approvedOTMinutes = (index * 41) % (7 * 60);
        const dayType = dayTypes[index % dayTypes.length];
        const start = utcAtVietnamHour(Math.floor(index / 24), startHour, startMinute);
        const end = new Date(start.getTime() + durationMinutes * 60_000);

        const result = engine.calculate(RATE, [{
            startTime: start,
            endTime: end,
            dayType,
            allowedOTMins: approvedOTMinutes,
        }]);

        const hours = Object.fromEntries(['day_normal', 'night_normal', 'day_ot', 'night_ot'].map((bucket) => [
            bucket,
            result.detailedBreakdown
                .filter((line) => line.category === `${dayType}_${bucket}`)
                .reduce((sum, line) => sum + line.hours, 0),
        ]));
        const normalHours = hours.day_normal + hours.night_normal;
        const overtimeHours = hours.day_ot + hours.night_ot;

        assert.ok(result.totalIncome >= 0, `case ${index}: income cannot be negative`);
        assert.ok(normalHours <= 8, `case ${index}: standard hours exceed daily limit`);
        assert.ok(overtimeHours <= approvedOTMinutes / 60 + 0.01, `case ${index}: unapproved OT was paid`);
        if (dayType !== 'Normal') {
            assert.equal(normalHours, 0, `case ${index}: rest-day hours cannot be ordinary hours`);
        }

        const breakdownAmount = result.detailedBreakdown.reduce((sum, line) => sum + line.amount, 0);
        assert.equal(result.totalIncome, breakdownAmount, `case ${index}: breakdown must reconcile to total`);
        assert.ok(result.detailedBreakdown.every((line) => line.hours > 0 && line.amount >= 0));
    }
});
