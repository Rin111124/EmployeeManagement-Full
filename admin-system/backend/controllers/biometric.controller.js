const BiometricRequest = require('../models/BiometricRequest');
const Employee = require('../models/employee');
const asyncHandler = require('../utils/asyncHandler');
const auditService = require('../services/audit.service');
const socketManager = require('../utils/socket');
const { AUDIT_ACTIONS } = require('../constants/auditActions');

// @desc    Kiosk gửi yêu cầu đăng ký cho nhân viên
// @route   POST /api/v1/devices/request-registration
const createRegistrationRequest = asyncHandler(async (req, res) => {
    const { employee_id, device_id } = req.body;

    if (!employee_id || !device_id) {
        return res.status(400).json({ success: false, message: 'Missing employee_id or device_id' });
    }

    // Kiểm tra xem đã có yêu cầu nào đang chờ duyệt chưa
    const existing = await BiometricRequest.findOne({ 
        employee_id, 
        status: 'pending' 
    });

    if (existing) {
        return res.status(200).json({ 
            success: true, 
            message: 'Yêu cầu đang chờ duyệt', 
            data: existing 
        });
    }

    const request = await BiometricRequest.create({
        employee_id,
        device_id,
        status: 'pending'
    });

    res.status(201).json({
        success: true,
        message: 'Gửi yêu cầu thành công, vui lòng chờ Admin phê duyệt',
        data: request
    });
});

// @desc    Lấy danh sách yêu cầu đăng ký (cho Admin)
// @route   GET /api/v1/biometric-requests
const listRequests = asyncHandler(async (req, res) => {
    const requests = await BiometricRequest.find()
        .populate('employee_id', 'full_name employee_code department')
        .sort('-createdAt');

    res.json({ success: true, data: requests });
});

// @desc    Admin phê duyệt hoặc từ chối yêu cầu
// @route   PATCH /api/v1/biometric-requests/:id
const updateRequestStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const request = await BiometricRequest.findById(req.params.id);
    if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = status;
    if (status === 'approved') {
        request.approved_at = Date.now();
        request.approved_by = req.user._id;

        // Emit real-time notification to Kiosk qua Socket.IO singleton
        try {
            socketManager.getIo().emit('biometric-approved', {
                request_id: request._id,
                employee_id: request.employee_id,
                status: 'approved'
            });
        } catch (_) {
            // Socket.IO chưa khởi tạo (ví dụ trong môi trường test) — bỏ qua
        }
    }
    await request.save();

    await auditService.logAction({
        userId: req.user._id,
        action: status === 'approved' ? 'BIOMETRIC_APPROVED' : 'BIOMETRIC_REJECTED',
        target: { type: 'BiometricRequest', id: request._id },
        metadata: { employee_id: request.employee_id },
        req,
    });

    res.json({ success: true, message: `Yêu cầu đã được ${status}`, data: request });
});

// @desc    Kiosk kiểm tra trạng thái yêu cầu
// @route   GET /api/v1/devices/check-registration-status/:employee_id
const checkStatus = asyncHandler(async (req, res) => {
    const request = await BiometricRequest.findOne({
        employee_id: req.params.employee_id,
        status: { $in: ['pending', 'approved'] }
    }).sort('-createdAt');

    if (!request) {
        return res.json({ success: true, status: 'none' });
    }

    res.json({ success: true, status: request.status, data: request });
});

module.exports = {
    createRegistrationRequest,
    listRequests,
    updateRequestStatus,
    checkStatus
};
