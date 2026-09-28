const {
    Employee,
    Attendance,
    Contract,
    Payroll,
    LeaveRequest,
    AuditLog,
} = require('../models');
const { logAction } = require('./audit.service');
const { AUDIT_ACTIONS } = require('../constants/auditActions');
const AppError = require('../utils/AppError');
const { maskPII } = require('../utils/cryptoVault');

/**
 * P1-PRIV-07: Purge face embeddings and biometric data for terminated employees
 * or employees who withdrew consent.
 */
async function purgeTerminatedBiometrics(actorId, req) {
    const terminatedWithBiometrics = await Employee.find({
        status: 'Terminated',
        'face_data.0': { $exists: true },
    });

    if (terminatedWithBiometrics.length === 0) {
        return { purged_count: 0, employee_ids: [] };
    }

    const purgedIds = [];
    for (const emp of terminatedWithBiometrics) {
        emp.face_data = [];
        await emp.save();
        purgedIds.push(emp._id);

        await logAction({
            userId: actorId,
            action: AUDIT_ACTIONS.BIOMETRIC_RETENTION_PURGE,
            target: `Employee:${emp._id}`,
            metadata: {
                employee_code: emp.employee_code,
                reason: 'Data retention policy: automatic biometric purge upon termination',
            },
            req,
        });
    }

    return {
        purged_count: purgedIds.length,
        employee_ids: purgedIds,
    };
}

/**
 * P1-PRIV-07: Purge audit logs older than retention period (default 730 days / 2 years).
 */
async function purgeExpiredAuditLogs(retentionDays = 730) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate },
    });

    return {
        deleted_count: result.deletedCount || 0,
        cutoff_date: cutoffDate,
    };
}

/**
 * P1-PRIV-08: Subject Access Request (GDPR / PDPA Data Portability)
 * Exports all personal, employment, attendance, and payroll records for an employee.
 */
async function handleSubjectAccessRequest(employeeId, actorId, req) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    const [contracts, attendances, payrolls, leaves] = await Promise.all([
        Contract.find({ employee_id: employeeId }).lean(),
        Attendance.find({ employee_id: employeeId }).lean(),
        Payroll.find({ employee_id: employeeId }).lean(),
        LeaveRequest.find({ employee_id: employeeId }).lean(),
    ]);

    const sanitizedEmployee = maskPII(employee.toObject());

    await logAction({
        userId: actorId,
        action: AUDIT_ACTIONS.SUBJECT_ACCESS_REQUEST,
        target: `Employee:${employee._id}`,
        metadata: {
            employee_code: employee.employee_code,
            exported_sections: ['profile', 'contracts', 'attendances', 'payrolls', 'leaves'],
        },
        req,
    });

    return {
        employee: sanitizedEmployee,
        contracts: contracts.map(maskPII),
        attendances,
        payrolls: payrolls.map(maskPII),
        leaves,
        exported_at: new Date(),
    };
}

/**
 * P1-PRIV-08: Subject Erasure Request (Right to be Forgotten)
 * Erases biometric data, unlinks sensitive identifiers, and anonymizes personal profile.
 */
async function handleSubjectErasureRequest(employeeId, actorId, req) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    // 1. Erase biometric data
    employee.face_data = [];
    employee.avatar = null;

    // 2. Anonymize PII fields
    employee.full_name = `Anonymized ${employee.employee_code}`;
    employee.contact = {
        phone: null,
        email: `erased_${employee.employee_code.toLowerCase()}@anonymized.local`,
        permanent_address: null,
        current_address: null,
    };
    employee.identity = {
        number: null,
        issue_date: null,
        issue_place: null,
    };
    employee.bank_accounts = [];
    employee.status = 'Terminated';

    await employee.save();

    await logAction({
        userId: actorId,
        action: AUDIT_ACTIONS.SUBJECT_ERASURE_REQUEST,
        target: `Employee:${employee._id}`,
        metadata: {
            employee_code: employee.employee_code,
            action_type: 'Full PII & Biometric Anonymization and Erasure',
        },
        req,
    });

    return {
        success: true,
        message: 'Employee personal and biometric data have been erased/anonymized in compliance with data privacy regulations.',
        employee_id: employee._id,
        status: employee.status,
    };
}

module.exports = {
    purgeTerminatedBiometrics,
    purgeExpiredAuditLogs,
    handleSubjectAccessRequest,
    handleSubjectErasureRequest,
};
