// Attendance dates are stored as UTC midnight for the corresponding Vietnam
// business date. Vietnam uses UTC+7 and does not observe daylight saving time.
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function vietnamDateStart(date = new Date()) {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return value;
    const vietnamTime = new Date(value.getTime() + VIETNAM_OFFSET_MS);
    return new Date(Date.UTC(
        vietnamTime.getUTCFullYear(),
        vietnamTime.getUTCMonth(),
        vietnamTime.getUTCDate(),
    ));
}

function startOfDay(date = new Date()) {
    return vietnamDateStart(date);
}

function endOfDay(date = new Date()) {
    const start = vietnamDateStart(date);
    return new Date(start.getTime() + DAY_MS - 1);
}

function monthRange(year, month) {
    const start = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    const end = new Date(Date.UTC(Number(year), Number(month), 1) - 1);
    return { start, end };
}

function subMonths(date, n) {
    const start = vietnamDateStart(date);
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - n, start.getUTCDate()));
}

function startOfMonth(date) {
    const start = vietnamDateStart(date);
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
}

function endOfMonth(date) {
    const start = vietnamDateStart(date);
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1) - 1);
}

module.exports = {
    startOfDay,
    endOfDay,
    monthRange,
    subMonths,
    startOfMonth,
    endOfMonth,
};
