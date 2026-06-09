const models = require('../models');
const { Setting } = models;
const AppError = require('../utils/AppError');

const BACKUP_MODELS = [
    'Employee',
    'Department',
    'EmployeePosition',
    'Shift',
    'ShiftAssignment',
    'Attendance',
    'Overtime',
    'Contract',
    'ContractTemplate',
    'Payroll',
    'LeaveRequest',
    'User',
    'Asset',
    'Training',
    'FaceLog',
    'Setting',
    'Device',
    'AuditLog',
];

const COLLECTION_MODEL_MAP = Object.fromEntries(
    BACKUP_MODELS
        .map((modelName) => {
            const Model = models[modelName];
            return Model ? [Model.collection.name, { modelName, Model }] : null;
        })
        .filter(Boolean),
);

function parseBackupPayload(file) {
    if (!file) {
        throw new AppError('Backup file is required', 400);
    }

    let payload;
    try {
        payload = JSON.parse(file.buffer.toString('utf8'));
    } catch (_error) {
        throw new AppError('Backup file must be valid JSON', 400);
    }

    if (payload?.metadata?.app !== 'EmployeeManagement' || !payload.data || typeof payload.data !== 'object') {
        throw new AppError('Invalid EmployeeManagement backup file', 400);
    }

    return payload;
}

function sanitizeRestoreDocument(doc) {
    const clean = { ...doc };
    delete clean.__v;
    delete clean.password_hash;
    delete clean.login_history;
    delete clean.device_token;
    delete clean.device_token_hash;
    delete clean.claim_code_hash;
    return clean;
}

// Lấy toàn bộ settings
async function getSettings(req, res, next) {
    try {
        const settings = await Setting.find({});
        const configMap = {};
        settings.forEach(s => {
            configMap[s.key] = s.value;
        });
        res.status(200).json({ success: true, data: configMap });
    } catch (err) {
        next(err);
    }
}

// Lấy 1 setting theo key
async function getSettingByKey(req, res, next) {
    try {
        const { key } = req.params;
        const setting = await Setting.findOne({ key });
        if (!setting) {
            return res.status(200).json({ success: true, data: null });
        }
        res.status(200).json({ success: true, data: setting.value });
    } catch (err) {
        next(err);
    }
}

// Cập nhật cấu hình time_config (Payroll Engine & Attendance)
async function updateTimeConfig(req, res, next) {
    try {
        const payload = req.body;
        // payload expects: { nightStartHour, nightEndHour, standardHoursPerDay, dayBreakMins, nightBreakMins, minWorkMinsForBreak }
        
        const setting = await Setting.findOneAndUpdate(
            { key: 'time_config' },
            { 
                value: payload,
                description: 'Payroll Engine and Attendance configuration for work/break times'
            },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, data: setting.value });
    } catch (err) {
        next(err);
    }
}

async function downloadBackup(req, res, next) {
    try {
        const collections = {};

        await Promise.all(BACKUP_MODELS.map(async (modelName) => {
            const Model = models[modelName];
            if (!Model) return;
            collections[Model.collection.name] = await Model.find({}).lean();
        }));

        const generatedAt = new Date();
        const payload = {
            metadata: {
                app: 'EmployeeManagement',
                generated_at: generatedAt.toISOString(),
                generated_by: req.user?._id || null,
                format: 'json',
                collections: Object.fromEntries(
                    Object.entries(collections).map(([name, rows]) => [name, rows.length]),
                ),
                excluded_sensitive_fields: [
                    'users.password_hash',
                    'users.login_history',
                    'devices.device_token',
                    'devices.device_token_hash',
                    'devices.claim_code_hash',
                    'refresh_tokens',
                    'token_blacklist',
                ],
            },
            data: collections,
        };

        const filename = `employee-management-backup-${generatedAt.toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(JSON.stringify(payload, null, 2));
    } catch (err) {
        next(err);
    }
}

async function restoreBackup(req, res, next) {
    try {
        const payload = parseBackupPayload(req.file);
        const summary = {};

        for (const [collectionName, rows] of Object.entries(payload.data)) {
            const entry = COLLECTION_MODEL_MAP[collectionName];
            if (!entry || !Array.isArray(rows)) continue;

            const { modelName, Model } = entry;
            summary[collectionName] = { created: 0, updated: 0, skipped: 0 };

            for (const row of rows) {
                if (!row?._id) {
                    summary[collectionName].skipped += 1;
                    continue;
                }

                const clean = sanitizeRestoreDocument(row);
                const id = clean._id;
                delete clean._id;

                const existing = await Model.findById(id).select('+password_hash');
                if (existing) {
                    await Model.findByIdAndUpdate(id, { $set: clean }, { new: false });
                    summary[collectionName].updated += 1;
                    continue;
                }

                if (modelName === 'User') {
                    summary[collectionName].skipped += 1;
                    continue;
                }

                await Model.create({ _id: id, ...clean });
                summary[collectionName].created += 1;
            }
        }

        res.status(200).json({
            success: true,
            message: 'Backup restored successfully',
            data: {
                restored_at: new Date().toISOString(),
                summary,
            },
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getSettings,
    getSettingByKey,
    updateTimeConfig,
    downloadBackup,
    restoreBackup
};
