const employeeService = require('../services/employee.service');
const auditService = require('../services/audit.service');
const { AUDIT_ACTIONS } = require('../constants/auditActions');
const asyncHandler = require('../utils/asyncHandler');

const createEmployee = asyncHandler(async (req, res) => {
    const employee = await employeeService.createEmployee(req.body);
    await auditService.logAction({
        userId: req.user._id,
        action: AUDIT_ACTIONS.EMPLOYEE_CREATE,
        target: { type: 'Employee', id: employee._id },
        req,
    });
    res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employee,
    });
});

const updateEmployee = asyncHandler(async (req, res) => {
    const employee = await employeeService.updateEmployee(req.params.id, req.body);
    await auditService.logAction({
        userId: req.user._id,
        action: AUDIT_ACTIONS.EMPLOYEE_UPDATE,
        target: { type: 'Employee', id: employee._id },
        metadata: { fields: Object.keys(req.body) },
        req,
    });
    res.json({
        success: true,
        message: 'Employee updated successfully',
        data: employee,
    });
});

const deleteEmployee = asyncHandler(async (req, res) => {
    await employeeService.deleteEmployee(req.params.id);
    await auditService.logAction({
        userId: req.user._id,
        action: AUDIT_ACTIONS.EMPLOYEE_DELETE,
        target: { type: 'Employee', id: req.params.id },
        req,
    });
    res.status(204).send();
});

const getEmployee = asyncHandler(async (req, res) => {
    const employee = await employeeService.getEmployee(req.params.id);
    res.json({
        success: true,
        data: employee,
    });
});

const listEmployees = asyncHandler(async (req, res) => {
    const result = await employeeService.listEmployees(req.query);
    res.json({
        success: true,
        data: result,
    });
});

const addFaceData = asyncHandler(async (req, res) => {
    const employee = await employeeService.addFaceData(req.params.id, req.body.face_data);
    await auditService.logAction({
        userId: req.user._id,
        action: AUDIT_ACTIONS.EMPLOYEE_FACE_DATA_ADD,
        target: { type: 'Employee', id: employee._id },
        req,
    });
    res.json({
        success: true,
        message: 'Face data added successfully',
        data: employee,
    });
});

const BiometricRequest = require('../models/BiometricRequest');

const confirmBiometrics = asyncHandler(async (req, res) => {
    // Đánh dấu đã đăng ký bằng cách thêm placeholder vào face_data
    // Điều này giúp query $size: 0 trong getUnregisteredEmployees hoạt động chính xác
    const embedding = Array.isArray(req.body.embedding)
        && req.body.embedding.every((value) => typeof value === 'number')
        ? req.body.embedding
        : [];

    const employee = await employeeService.addFaceData(req.params.id, {
        label: 'REGISTERED_AT_KIOSK',
        provider: 'kiosk',
        embedding,
    });

    // FIX: Tự động đánh dấu các yêu cầu phê duyệt thành 'completed' ngay khi xác nhận
    await BiometricRequest.updateMany(
        { employee_id: employee._id, status: 'approved' },
        { $set: { status: 'completed' } }
    );

    res.json({
        success: true,
        message: 'Biometrics registration confirmed',
        data: { 
            id: employee._id,
            employee_code: employee.employee_code,
            status: 'registered'
        }
    });
});

module.exports = {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployee,
    listEmployees,
    addFaceData,
    confirmBiometrics,
};
