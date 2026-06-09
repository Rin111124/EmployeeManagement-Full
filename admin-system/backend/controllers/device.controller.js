const Device = require('../models/device.model');
const Employee = require('../models/employee');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const { generateDeviceToken, hashDeviceToken } = require('../utils/deviceToken');
const socketManager = require('../utils/socket');

async function findDeviceByToken(token) {
  const tokenHash = hashDeviceToken(token);
  let device = await Device.findOne({ device_token_hash: tokenHash }).select('+device_token +device_token_hash');

  if (!device) {
    device = await Device.findOne({ device_token: token }).select('+device_token +device_token_hash');
    if (device) {
      device.device_token_hash = tokenHash;
      device.device_token = undefined;
      await device.save();
    }
  }

  return device;
}

function getLatestFaceEmbedding(employee) {
  const faceData = Array.isArray(employee.face_data) ? employee.face_data : [];
  const latestWithEmbedding = [...faceData]
    .reverse()
    .find((face) => Array.isArray(face.embedding) && face.embedding.length > 0);

  return latestWithEmbedding ? latestWithEmbedding.embedding : undefined;
}

function buildAttendanceEmployeePayload(employee) {
  const payload = {
    employee_id: employee._id.toString(),
    employee_code: employee.employee_code,
    full_name: employee.full_name,
    department: employee.department,
    position: employee.position,
    status: employee.status || 'Active',
  };

  const embedding = getLatestFaceEmbedding(employee);
  if (embedding) {
    payload.face_embedding = embedding;
  }

  return payload;
}

exports.requestAccess = asyncHandler(async (req, res) => {
  const { device_name, ip_address, port, location, device_type } = req.body;

  let device = await Device.findOne({ device_name }).select('+claim_code_hash');

  if (device) {
    if (device.status !== 'approved' && device.ip_address !== ip_address) {
      device.ip_address = ip_address;
    }

    const response = {
      status: 'success',
      message: device.status === 'approved'
        ? 'Device already approved. Use /claim-token to get your token.'
        : 'Device already registered. Waiting for admin approval.',
      device: {
        id: device._id,
        status: device.status,
      },
    };

    if (device.status === 'approved' && !device.claim_code_hash) {
      const claimCode = generateDeviceToken();
      device.claim_code_hash = hashDeviceToken(claimCode);
      response.claim_code = claimCode;
    }

    await device.save();

    return res.status(200).json(response);
  }

  const claimCode = generateDeviceToken();
  device = await Device.create({
    device_name,
    ip_address,
    port,
    location,
    device_type,
    status: 'pending',
    claim_code_hash: hashDeviceToken(claimCode),
  });

  res.status(201).json({
    status: 'success',
    message: 'Access request sent. Please wait for admin approval.',
    device: { id: device._id, status: device.status },
    claim_code: claimCode,
  });
});

exports.getStatus = asyncHandler(async (req, res, next) => {
  const device = await Device.findById(req.params.deviceId);
  if (!device) return next(new AppError('Device not found', 404));

  res.status(200).json({
    status: 'success',
    device: {
      id: device._id,
      status: device.status,
    },
  });
});

exports.claimToken = asyncHandler(async (req, res, next) => {
  const { device_id, device_name, claim_code } = req.body;

  if (!device_id || !device_name || !claim_code) {
    return next(new AppError('device_id, device_name, and claim_code are required', 400));
  }

  const device = await Device.findById(device_id).select('+device_token +device_token_hash +claim_code_hash');
  if (!device) return next(new AppError('Device not found', 404));

  if (device.device_name !== device_name) {
    return next(new AppError('Device identity mismatch', 403));
  }

  if (device.status !== 'approved') {
    return res.status(403).json({
      status: 'fail',
      message: `Device is not approved yet. Current status: ${device.status}`,
    });
  }

  if (!device.claim_code_hash || device.claim_code_hash !== hashDeviceToken(claim_code)) {
    return next(new AppError('Device claim code is invalid or expired', 403));
  }

  const token = generateDeviceToken();
  device.device_token_hash = hashDeviceToken(token);
  device.device_token = undefined;
  device.claim_code_hash = undefined;
  device.can_access_db = true;
  await device.save();

  res.status(200).json({
    status: 'success',
    message: 'Token claimed successfully.',
    device_token: token,
  });
});

exports.reportLog = asyncHandler(async (req, res, next) => {
  const token = req.headers['x-device-token'];
  if (!token) return next(new AppError('Device token is required', 401));

  const device = await findDeviceByToken(token);
  if (!device || device.status !== 'approved' || !device.can_access_db) {
    return next(new AppError('Device not authorized', 403));
  }

  device.last_sync = new Date();
  await device.save();

  res.status(200).json({ status: 'success' });
});

exports.getUnregisteredEmployees = asyncHandler(async (req, res, next) => {
  const token = req.headers['x-device-token'];
  if (!token) return next(new AppError('Device token is required', 401));

  const device = await findDeviceByToken(token);
  if (!device || device.status !== 'approved' || !device.can_access_db) {
    return next(new AppError('Device not authorized', 403));
  }

  const employees = await Employee.find({
    $or: [
      { face_data: { $exists: false } },
      { face_data: { $size: 0 } },
      { face_data: null },
    ],
  }).select('_id full_name employee_code department position');

  res.status(200).json({
    status: 'success',
    results: employees.length,
    data: employees,
  });
});

exports.streamFrame = asyncHandler(async (req, res, next) => {
  if (!req.file?.buffer) {
    return next(new AppError('Frame image is required', 400));
  }

  const device = req.device;
  const image = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;

  socketManager.publishKioskFrame({
    device_id: device._id.toString(),
    device_name: device.device_name,
    terminal_id: req.body.terminal_id || null,
    location: device.location,
    ip_address: device.ip_address,
    image,
    captured_at: req.body.captured_at || new Date().toISOString(),
    received_at: new Date().toISOString(),
  });

  console.log(`[KioskStream] Frame received from ${device.device_name} (${device._id})`);

  device.last_sync = new Date();
  await device.save();

  res.status(200).json({ status: 'success' });
});

exports.getLatestFrame = asyncHandler(async (req, res, next) => {
  const frame = socketManager.getLatestKioskFrame(req.params.id);
  if (!frame) {
    return res.status(200).json({
      status: 'success',
      data: null,
    });
  }

  res.status(200).json({
    status: 'success',
    data: frame,
  });
});

exports.approveDevice = asyncHandler(async (req, res, next) => {
  const device = await Device.findByIdAndUpdate(req.params.id, {
    status: 'approved',
    can_access_db: true,
    $unset: { device_token: 1, device_token_hash: 1 },
  }, { new: true });

  if (!device) return next(new AppError('Device not found', 404));

  res.status(200).json({
    status: 'success',
    message: 'Device approved. The device can now claim its token via POST /devices/claim-token.',
    data: { id: device._id, status: device.status },
  });
});

exports.toggleDbAccess = asyncHandler(async (req, res, next) => {
  const { can_access_db } = req.body;
  const device = await Device.findByIdAndUpdate(req.params.id, {
    can_access_db,
  }, { new: true });

  if (!device) return next(new AppError('Device not found', 404));

  res.status(200).json({ status: 'success', data: device });
});

exports.syncData = asyncHandler(async (req, res, next) => {
  if (!env.syncSecret) {
    return next(new AppError('SYNC_SECRET is required to sync attendance data', 503));
  }

  const device = await Device.findById(req.params.id);
  if (!device) return next(new AppError('Device not found', 404));

  if (device.status !== 'approved' || !device.can_access_db) {
    return next(new AppError('Device is not approved for sync', 403));
  }

  const employees = await Employee.find().lean();
  const payload = employees.map(buildAttendanceEmployeePayload);
  const attendanceUrl = env.attendanceServiceUrl.replace(/\/+$/, '');

  const response = await fetch(`${attendanceUrl}/sync/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-secret': env.syncSecret,
    },
    body: JSON.stringify({ employees: payload }),
  });

  let responseBody = null;
  try {
    responseBody = await response.json();
  } catch (_err) {
    responseBody = null;
  }

  if (!response.ok) {
    return next(new AppError(
      responseBody?.message || 'Attendance service sync failed',
      response.status,
    ));
  }

  device.last_sync = new Date();
  await device.save();

  res.status(200).json({
    status: 'success',
    message: 'Attendance data synced successfully',
    data: {
      device_id: device._id,
      employee_count: payload.length,
      face_embedding_count: payload.filter((employee) => Array.isArray(employee.face_embedding)).length,
      attendance_response: responseBody,
    },
  });
});

exports.getAllDevices = asyncHandler(async (req, res) => {
  const devices = await Device.find().sort('-createdAt');
  res.status(200).json({ status: 'success', data: devices });
});

exports.rejectDevice = asyncHandler(async (req, res, next) => {
  const device = await Device.findByIdAndUpdate(req.params.id, {
    status: 'rejected',
    $unset: { device_token: 1, device_token_hash: 1 },
    can_access_db: false,
  }, { new: true });

  if (!device) return next(new AppError('Device not found', 404));

  res.status(200).json({
    status: 'success',
    message: 'Device has been rejected and access revoked.',
    data: { id: device._id, status: device.status },
  });
});

exports.deleteDevice = asyncHandler(async (req, res, next) => {
  const device = await Device.findByIdAndDelete(req.params.id);

  if (!device) return next(new AppError('Device not found', 404));

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
