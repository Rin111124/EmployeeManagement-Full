const attendanceService = require('../services/attendance.service');
const auditService = require('../services/audit.service');
const { AUDIT_ACTIONS } = require('../constants/auditActions');
const { MANAGEMENT_ROLES } = require('../constants/roles');
const asyncHandler = require('../utils/asyncHandler');
const socketManager = require('../utils/socket');
const { Attendance } = require('../models');
const { startOfDay } = require('../utils/date');

const checkIn = asyncHandler(async (req, res) => {
    const attendance = await attendanceService.checkIn(req.body);
    await auditService.logAction({
        userId: req.user._id,
        action: AUDIT_ACTIONS.ATTENDANCE_CHECK_IN,
        target: { type: 'Attendance', id: attendance._id },
        metadata: { employee_id: attendance.employee_id?._id || attendance.employee_id },
        req,
    });
    res.status(201).json({
        success: true,
        message: 'Check-in successfully',
        data: attendance,
    });
});

const checkOut = asyncHandler(async (req, res) => {
    const attendance = await attendanceService.checkOut(req.body);
    await auditService.logAction({
        userId: req.user._id,
        action: AUDIT_ACTIONS.ATTENDANCE_CHECK_OUT,
        target: { type: 'Attendance', id: attendance._id },
        metadata: { employee_id: attendance.employee_id?._id || attendance.employee_id },
        req,
    });
    res.json({
        success: true,
        message: 'Check-out successfully',
        data: attendance,
    });
});

const getHistory = asyncHandler(async (req, res) => {
    const roles = req.user.roles || [];
    if (!MANAGEMENT_ROLES.some((role) => roles.includes(role))) {
        req.query.employee_id = req.user.employee_id._id.toString();
    }
    const result = await attendanceService.getHistory(req.query);
    res.json({
        success: true,
        data: result,
    });
});

const getAttendance = asyncHandler(async (req, res) => {
    const attendance = await attendanceService.getAttendance(req.params.id);
    res.json({
        success: true,
        data: attendance,
    });
});

const createAttendance = asyncHandler(async (req, res) => {
    const attendance = await attendanceService.createAttendance(req.body);
    await auditService.logAction({
        userId: req.user._id,
        action: 'ATTENDANCE_CREATE_MANUAL',
        target: { type: 'Attendance', id: attendance._id },
        metadata: { employee_id: attendance.employee_id?._id || attendance.employee_id },
        req,
    });
    res.status(201).json({
        success: true,
        message: 'Attendance created manually',
        data: attendance,
    });
});

const updateAttendance = asyncHandler(async (req, res) => {
    const attendance = await attendanceService.updateAttendance(req.params.id, req.body);
    await auditService.logAction({
        userId: req.user._id,
        action: AUDIT_ACTIONS.ATTENDANCE_UPDATE,
        target: { type: 'Attendance', id: attendance._id },
        metadata: { fields: Object.keys(req.body) },
        req,
    });
    res.json({
        success: true,
        message: 'Attendance updated successfully',
        data: attendance,
    });
});

const deleteAttendance = asyncHandler(async (req, res) => {
    await attendanceService.deleteAttendance(req.params.id);
    await auditService.logAction({
        userId: req.user._id,
        action: AUDIT_ACTIONS.ATTENDANCE_DELETE,
        target: { type: 'Attendance', id: req.params.id },
        req,
    });
    res.status(204).send();
});

const dailyReport = asyncHandler(async (req, res) => {
    const result = await attendanceService.dailyReport(req.query.date);
    res.json({
        success: true,
        data: result,
    });
});

const monthlyReport = asyncHandler(async (req, res) => {
    const result = await attendanceService.monthlyReport(req.query.year, req.query.month);
    res.json({
        success: true,
        data: result,
    });
});

/**
 * [INTERNAL] Nhận attendance record được push từ attendance-service.
 * Dùng upsert để tránh duplicate nếu sync chạy 2 lần.
 * Chỉ được gọi từ attendance-service với x-sync-secret header.
 */
const syncFromDevice = asyncHandler(async (req, res) => {
    const { employee_id, check_in, check_out } = req.body;

    if (!employee_id || !check_in) {
        return res.status(400).json({ success: false, message: 'employee_id and check_in are required' });
    }

    const attendance = await attendanceService.syncFromDevice(req.body);


    // Broadcast realtime event qua Socket.IO singleton
    try {
        socketManager.getIo().emit('attendance:update', {
            employee_id: attendance.employee_id,
            action: check_out ? 'check-out' : 'check-in',
            timestamp: new Date(),
        });
    } catch (_) {
        // Socket.IO chưa khởi tạo (ví dụ trong môi trường test) — bỏ qua
    }

    res.status(200).json({ success: true, data: attendance });
});

module.exports = {
    checkIn,
    checkOut,
    getHistory,
    getAttendance,
    createAttendance,
    updateAttendance,
    deleteAttendance,
    dailyReport,
    monthlyReport,
    syncFromDevice,
};
