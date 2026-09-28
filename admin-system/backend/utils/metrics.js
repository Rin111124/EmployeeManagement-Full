/**
 * Native Prometheus metrics exporter for EmployeeManagement
 * Tracks HTTP requests, response latencies, memory usage, and uptime.
 */

const httpRequestsTotal = new Map();
const httpRequestDurationSum = new Map();
const httpRequestDurationCount = new Map();

/**
 * Record a completed HTTP request
 */
function recordHttpRequest(method, path, statusCode, durationSeconds) {
    // Group parameterized paths to avoid high-cardinality label explosion
    const normalizedPath = path
        .replace(/[0-9a-fA-F]{24}/g, ':id')
        .replace(/[0-9a-fA-F-]{36}/g, ':uuid')
        .replace(/\d+/g, ':num') || '/';

    const key = `${method}|${normalizedPath}|${statusCode}`;

    httpRequestsTotal.set(key, (httpRequestsTotal.get(key) || 0) + 1);
    httpRequestDurationSum.set(key, (httpRequestDurationSum.get(key) || 0) + durationSeconds);
    httpRequestDurationCount.set(key, (httpRequestDurationCount.get(key) || 0) + 1);
}

/**
 * Express middleware to record request metrics
 */
function metricsMiddleware(req, res, next) {
    if (req.path === '/metrics' || req.path === '/health') {
        return next();
    }

    const start = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const durationSeconds = diff[0] + diff[1] / 1e9;
        recordHttpRequest(req.method, req.route ? req.baseUrl + req.route.path : req.path, res.statusCode, durationSeconds);
    });

    next();
}

/**
 * Format metrics in Prometheus text exposition format
 */
function generateMetrics() {
    const lines = [];

    // Process memory & uptime
    const memory = process.memoryUsage();
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${process.uptime().toFixed(2)}`);

    lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${memory.rss}`);

    lines.push('# HELP process_heap_used_bytes Process heap memory used in bytes');
    lines.push('# TYPE process_heap_used_bytes gauge');
    lines.push(`process_heap_used_bytes ${memory.heapUsed}`);

    // HTTP Requests Total
    lines.push('# HELP http_requests_total Total number of HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    for (const [key, count] of httpRequestsTotal.entries()) {
        const [method, route, statusCode] = key.split('|');
        lines.push(`http_requests_total{method="${method}",route="${route}",status="${statusCode}"} ${count}`);
    }

    // HTTP Request Duration
    lines.push('# HELP http_request_duration_seconds_sum Total request latency in seconds');
    lines.push('# TYPE http_request_duration_seconds_sum counter');
    for (const [key, sum] of httpRequestDurationSum.entries()) {
        const [method, route, statusCode] = key.split('|');
        lines.push(`http_request_duration_seconds_sum{method="${method}",route="${route}",status="${statusCode}"} ${sum.toFixed(6)}`);
    }

    lines.push('# HELP http_request_duration_seconds_count Total count of latency measurements');
    lines.push('# TYPE http_request_duration_seconds_count counter');
    for (const [key, count] of httpRequestDurationCount.entries()) {
        const [method, route, statusCode] = key.split('|');
        lines.push(`http_request_duration_seconds_count{method="${method}",route="${route}",status="${statusCode}"} ${count}`);
    }

    return lines.join('\n') + '\n';
}

module.exports = {
    recordHttpRequest,
    metricsMiddleware,
    generateMetrics,
};
