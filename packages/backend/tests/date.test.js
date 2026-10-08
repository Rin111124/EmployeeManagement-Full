process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startOfDay, endOfDay, monthRange, startOfMonth, endOfMonth } = require('../utils/date');

test('date helpers use Vietnam business dates and UTC-midnight storage boundaries', () => {
    const instant = new Date('2026-05-31T17:30:00.000Z'); // June 1 in Vietnam
    assert.equal(startOfDay(instant).toISOString(), '2026-06-01T00:00:00.000Z');
    assert.equal(endOfDay(instant).toISOString(), '2026-06-01T23:59:59.999Z');

    const { start, end } = monthRange(2026, 6);
    assert.equal(start.toISOString(), '2026-06-01T00:00:00.000Z');
    assert.equal(end.toISOString(), '2026-06-30T23:59:59.999Z');
    assert.equal(startOfMonth(instant).toISOString(), '2026-06-01T00:00:00.000Z');
    assert.equal(endOfMonth(instant).toISOString(), '2026-06-30T23:59:59.999Z');
});
