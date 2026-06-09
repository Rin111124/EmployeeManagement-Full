function startOfDay(date = new Date()) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}

function endOfDay(date = new Date()) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
}

function monthRange(year, month) {
    const start = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    return { start, end };
}

function subMonths(date, n) {
    const result = new Date(date);
    result.setMonth(result.getMonth() - n);
    return result;
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

module.exports = {
    startOfDay,
    endOfDay,
    monthRange,
    subMonths,
    startOfMonth,
    endOfMonth,
};
