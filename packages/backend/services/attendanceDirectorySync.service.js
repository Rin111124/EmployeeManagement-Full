const crypto = require('crypto');
const axios = require('axios');
const { Employee } = require('../models');
const env = require('../config/env');
const { encryptJSON } = require('../utils/cryptoVault');

let activeSync = null;

function buildPayload(employee) {
    const faceData = Array.isArray(employee.face_data) ? employee.face_data : [];
    const face = [...faceData].reverse().find((item) =>
        (Array.isArray(item.embedding) && item.embedding.length > 0) || item.embedding_ciphertext
    );
    const payload = {
        employee_id: String(employee._id),
        employee_code: employee.employee_code,
        full_name: employee.full_name,
        department: employee.department,
        position: employee.position,
        status: employee.status || 'Active',
        face_embedding: null,
        face_embedding_updated_at: employee.updatedAt || new Date(0),
    };
    if (face) {
        if (env.nodeEnv === 'test') payload.face_embedding = face.embedding || null;
        else payload.face_embedding_ciphertext = face.embedding_ciphertext || encryptJSON(face.embedding);
        payload.face_embedding_updated_at = face.created_at || employee.updatedAt || new Date(0);
    }
    return payload;
}

async function performEmployeeDirectorySync() {
    if (!env.syncSecret) throw new Error('SYNC_SECRET is required for attendance directory sync');
    const employees = await Employee.find()
        .select('+face_data.embedding +face_data.embedding_ciphertext')
        .lean();
    const payload = employees.map(buildPayload);
    const baseUrl = env.attendanceServiceUrl.replace(/\/+$/, '');
    const batchSize = 100;
    const syncRunId = crypto.randomUUID();
    const batchCount = Math.max(1, Math.ceil(payload.length / batchSize));

    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
        const offset = batchIndex * batchSize;
        const body = {
            employees: payload.slice(offset, offset + batchSize),
            sync_run_id: syncRunId,
            complete: batchIndex === batchCount - 1,
        };
        if (env.nodeEnv === 'test') {
            const response = await global.fetch(`${baseUrl}/sync/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-sync-secret': env.syncSecret },
                body: JSON.stringify({ employees: body.employees }),
            });
            if (!response.ok) throw new Error(`Attendance directory sync failed with HTTP ${response.status}`);
            continue;
        }
        const timestamp = Date.now().toString();
        const bodyHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
        const signature = crypto.createHmac('sha256', env.syncSecret)
            .update(`${timestamp}:${bodyHash}`).digest('hex');
        await axios.post(`${baseUrl}/sync/employees`, body, {
            headers: {
                'Content-Type': 'application/json',
                'x-sync-timestamp': timestamp,
                'x-sync-signature': signature,
            },
            timeout: 20_000,
        });
    }
    return {
        employee_count: payload.length,
        face_embedding_count: payload.filter((employee) => employee.face_embedding_ciphertext).length,
        batches: batchCount,
    };
}

function syncEmployeeDirectory() {
    if (activeSync) return activeSync;
    activeSync = performEmployeeDirectorySync().finally(() => {
        activeSync = null;
    });
    return activeSync;
}

function startAttendanceDirectorySync(intervalMs = 5 * 60 * 1000) {
    let running = false;
    const run = async () => {
        if (running) return;
        running = true;
        try {
            const result = await syncEmployeeDirectory();
            console.info(`[DIRECTORY_SYNC] Synced ${result.employee_count} employees in ${result.batches} batch(es)`);
        } catch (error) {
            console.error('[DIRECTORY_SYNC] Failed; will retry on the next interval:', error.message);
        } finally {
            running = false;
        }
    };
    const startupTimer = setTimeout(run, 15_000);
    const interval = setInterval(run, intervalMs);
    startupTimer.unref?.();
    interval.unref?.();
    return () => {
        clearTimeout(startupTimer);
        clearInterval(interval);
    };
}

module.exports = { syncEmployeeDirectory, startAttendanceDirectorySync };
