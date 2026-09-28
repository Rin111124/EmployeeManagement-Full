const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
const Device = require('../models/device.model');
const Employee = require('../models/employee');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const {
  generateDeviceToken,
  hashDeviceToken,
  generateChallenge,
  computeProof,
  verifyProof,
} = require('../utils/deviceToken');
const socketManager = require('../utils/socket');
const auditService = require('../services/audit.service');
const { AUDIT_ACTIONS } = require('../constants/auditActions');

exports.extractFaceFeatures = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Image file is required', 400));
  if (!env.aiApiKey) return next(new AppError('AI service is not configured', 503));

  const boundary = `----employee-management-${crypto.randomBytes(16).toString('hex')}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="face.jpg"\r\nContent-Type: ${req.file.mimetype || 'application/octet-stream'}\r\n\r\n`),
    req.file.buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  try {
    const response = await axios.post(`${env.aiServiceUrl}/extract-features`, body, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'x-api-key': env.aiApiKey,
        'x-device-id': String(req.device?._id || ''),
      },
      timeout: 15_000,
      maxBodyLength: 6 * 1024 * 1024,
      maxContentLength: 6 * 1024 * 1024,
    });
    return res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status;
    if (status && status < 500) {
      return next(new AppError(error.response.data?.detail || 'Image could not be processed', status));
    }
    return next(new AppError('AI service is temporarily unavailable', 503));
  }
});

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
  const {
    device_name,
    ip_address,
    port,
    location,
    device_type,
    device_id,
    bootstrap_hash,
  } = req.body;

  let device = null;
  if (device_id) {
    device = await Device.findOne({ device_id }).select('+claim_code_hash +bootstrap_hash');
  }
  if (!device && device_name && !device_id) {
    // Legacy clients have no stable device identity. New clients must match by
    // their installation UUID so a same-name device cannot take over a record.
    device = await Device.findOne({ device_name }).select('+claim_code_hash +bootstrap_hash');
  } else if (!device && device_name && device_id) {
    // Allow a modern client to adopt a legacy record once, but never bind its
    // bootstrap hash until the one-time legacy claim code is proven.
    device = await Device.findOne({
      device_name,
      $or: [
        { device_id: { $exists: false } },
        { device_id: null },
        { device_id: '' },
        { status: 'rejected', revoked_at: { $ne: null } },
      ],
    }).select('+claim_code_hash +bootstrap_hash');
  }

  if (device) {
    const isAdminInitiatedReEnrollment =
      device.status === 'rejected' &&
      Boolean(device.revoked_at) &&
      Boolean(bootstrap_hash);

    if (isAdminInitiatedReEnrollment) {
      // A management user must revoke the old credential first. The kiosk can
      // then replace its lost bootstrap secret, but still needs fresh approval.
      device.bootstrap_hash = bootstrap_hash;
      if (device_id) device.device_id = device_id;
      device.device_token = undefined;
      device.device_token_hash = undefined;
      device.claim_code_hash = undefined;
      device.enrollment_challenge = undefined;
      device.status = 'pending';
      device.can_access_db = false;
      device.revoked_at = null;
      device.ip_address = ip_address;
      await device.save();

      await auditService.logAction({
        userId: null,
        action: AUDIT_ACTIONS.DEVICE_ENROLLMENT_REQUESTED,
        target: { type: 'Device', id: device._id },
        metadata: { device_name: device.device_name, device_id: device.device_id, flow: 'admin-initiated-re-enrollment' },
        req,
      });
    }

    if (device.status !== 'approved' && device.ip_address !== ip_address) {
      device.ip_address = ip_address;
    }

    const response = {
      status: 'success',
      message: device.status === 'approved'
        ? 'Device already approved. Complete device authentication to retrieve a token.'
        : 'Device already registered. Waiting for admin approval.',
      device: {
        id: device._id,
        device_id: device.device_id,
        status: device.status,
      },
    };

    // Outside the explicit admin-initiated re-enrollment above, never replace
    // a bootstrap credential through this public endpoint.
    await device.save();

    return res.status(200).json(response);
  }

  // New device registration
  const newDeviceData = {
    device_name,
    ip_address,
    port,
    location,
    device_type,
    status: 'pending',
  };

  if (device_id) {
    newDeviceData.device_id = device_id;
  }
  if (bootstrap_hash) {
    newDeviceData.bootstrap_hash = bootstrap_hash;
  }

  // Legacy fallback: only generate claim_code on initial registration if no bootstrap_hash is provided
  let claimCode = null;
  if (!bootstrap_hash) {
    claimCode = generateDeviceToken();
    newDeviceData.claim_code_hash = hashDeviceToken(claimCode);
  }

  device = await Device.create(newDeviceData);

  await auditService.logAction({
    userId: null,
    action: AUDIT_ACTIONS.DEVICE_ENROLLMENT_REQUESTED,
    target: { type: 'Device', id: device._id },
    metadata: { device_name: device.device_name, device_id: device.device_id, device_type: device.device_type },
    req,
  });

  const resPayload = {
    status: 'success',
    message: 'Access request sent. Please wait for admin approval.',
    device: { id: device._id, device_id: device.device_id, status: device.status },
  };
  if (claimCode) {
    resPayload.claim_code = claimCode;
  }

  res.status(201).json(resPayload);
});

exports.getStatus = asyncHandler(async (req, res, next) => {
  const device = await Device.findById(req.params.deviceId);
  if (!device) return next(new AppError('Device not found', 404));

  res.status(200).json({
    status: 'success',
    device: {
      id: device._id,
      device_id: device.device_id,
      status: device.status,
    },
  });
});

exports.requestEnrollmentChallenge = asyncHandler(async (req, res, next) => {
  const { device_id, id } = req.body;
  const targetId = device_id || id;
  if (!targetId) {
    return next(new AppError('device_id or id is required', 400));
  }

  const query = mongoose.isValidObjectId(targetId)
    ? { $or: [{ device_id: targetId }, { _id: targetId }] }
    : { device_id: targetId };

  const device = await Device.findOne(query).select('+bootstrap_hash +enrollment_challenge.challenge +enrollment_challenge.expires_at +enrollment_challenge.attempts');

  if (!device) return next(new AppError('Device not found', 404));

  if (device.status !== 'approved') {
    return next(new AppError(`Device is not approved yet. Current status: ${device.status}`, 403));
  }

  if (device.revoked_at) {
    return next(new AppError('Device access has been revoked', 403));
  }

  if (!device.bootstrap_hash) {
    return next(new AppError(
      'Device needs a one-time legacy claim or administrator-assisted re-enrollment before challenge authentication.',
      409,
      { code: 'BOOTSTRAP_NOT_CONFIGURED' },
    ));
  }

  const challenge = generateChallenge();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins TTL

  device.enrollment_challenge = {
    challenge,
    expires_at: expiresAt,
    attempts: 0,
  };
  await device.save();

  res.status(200).json({
    status: 'success',
    challenge,
    expires_in_seconds: 300,
  });
});

exports.claimToken = asyncHandler(async (req, res, next) => {
  const { device_id, device_name, claim_code, challenge, proof, bootstrap_hash, device_instance_id } = req.body;

  // Flow A: Modern challenge-response flow
  if (challenge && proof) {
    if (!device_id) {
      return next(new AppError('device_id is required for challenge-response claim', 400));
    }

    const query = mongoose.isValidObjectId(device_id)
      ? { $or: [{ device_id }, { _id: device_id }] }
      : { device_id };

    const device = await Device.findOne(query).select('+device_token +device_token_hash +bootstrap_hash +enrollment_challenge.challenge +enrollment_challenge.expires_at +enrollment_challenge.attempts');

    if (!device) return next(new AppError('Device not found', 404));

    if (device.status !== 'approved') {
      return next(new AppError(`Device is not approved yet. Current status: ${device.status}`, 403));
    }

    if (device.revoked_at) {
      return next(new AppError('Device access has been revoked', 403));
    }

    const enc = device.enrollment_challenge;
    if (!enc || !enc.challenge || !enc.expires_at) {
      return next(new AppError('No active enrollment challenge found. Request a challenge first.', 400));
    }

    if (new Date() > new Date(enc.expires_at)) {
      device.enrollment_challenge = undefined;
      await device.save();
      return next(new AppError('Enrollment challenge has expired', 403));
    }

    if (enc.attempts >= 3) {
      device.enrollment_challenge = undefined;
      await device.save();
      return next(new AppError('Maximum challenge verification attempts exceeded', 403));
    }

    if (enc.challenge !== challenge) {
      return next(new AppError('Invalid challenge', 403));
    }

    // Atomically spend an attempt so concurrent guesses cannot bypass the cap.
    const attempt = await Device.findOneAndUpdate(
      {
        _id: device._id,
        status: 'approved',
        revoked_at: null,
        'enrollment_challenge.challenge': challenge,
        'enrollment_challenge.expires_at': { $gt: new Date() },
        'enrollment_challenge.attempts': { $lt: 3 },
      },
      { $inc: { 'enrollment_challenge.attempts': 1 } },
      { new: true },
    ).select('+bootstrap_hash +enrollment_challenge.challenge +enrollment_challenge.expires_at +enrollment_challenge.attempts');

    if (!attempt) {
      return next(new AppError('Challenge expired, already used, or maximum attempts exceeded', 403));
    }

    const expectedProof = computeProof(attempt.bootstrap_hash, challenge);
    if (!verifyProof(proof, expectedProof)) {
      if (attempt.enrollment_challenge.attempts >= 3) {
        await Device.updateOne(
          { _id: attempt._id, 'enrollment_challenge.challenge': challenge },
          { $unset: { enrollment_challenge: 1 } },
        );
      }
      return next(new AppError('Invalid authentication proof', 403));
    }

    const token = generateDeviceToken();
    const claimed = await Device.findOneAndUpdate(
      {
        _id: attempt._id,
        status: 'approved',
        revoked_at: null,
        'enrollment_challenge.challenge': challenge,
        'enrollment_challenge.attempts': attempt.enrollment_challenge.attempts,
      },
      {
        $set: {
          device_token_hash: hashDeviceToken(token),
          can_access_db: true,
          revoked_at: null,
        },
        $unset: { device_token: 1, claim_code_hash: 1, enrollment_challenge: 1 },
      },
      { new: true },
    );

    if (!claimed) {
      return next(new AppError('Challenge has already been used', 403));
    }

    await auditService.logAction({
      userId: null,
      action: AUDIT_ACTIONS.DEVICE_CREDENTIAL_ISSUED,
      target: { type: 'Device', id: device._id },
      metadata: { device_name: device.device_name, device_id: device.device_id, flow: 'challenge-response' },
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Token claimed successfully via challenge-response.',
      device_token: token,
      scopes: device.scopes || ['attendance:write', 'biometric:request'],
    });
  }

  // Flow B: Legacy claim_code flow
  if (!device_id || !device_name || !claim_code) {
    return next(new AppError('device_id, device_name, and claim_code are required', 400));
  }

  const device = await Device.findById(device_id).select('+device_token +device_token_hash +claim_code_hash +bootstrap_hash');
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

  if (device.revoked_at) {
    return next(new AppError('Device access has been revoked', 403));
  }

  const claimCodeHash = hashDeviceToken(claim_code);
  const isValidClaimCode = device.claim_code_hash && verifyProof(claimCodeHash, device.claim_code_hash);
  if (!isValidClaimCode) {
    return next(new AppError('Device claim code is invalid or expired', 403));
  }

  if (bootstrap_hash && !/^[a-fA-F0-9]{64}$/.test(bootstrap_hash)) {
    return next(new AppError('bootstrap_hash must be a SHA-256 hex digest', 400));
  }

  if (device_instance_id && device.device_id && device.device_id !== device_instance_id) {
    return next(new AppError('Device installation identity does not match this record', 409));
  }

  if (device.bootstrap_hash && bootstrap_hash && device.bootstrap_hash !== bootstrap_hash) {
    return next(new AppError('This device already has a different bootstrap credential', 409));
  }

  const token = generateDeviceToken();
  const claimUpdate = {
    $set: {
      device_token_hash: hashDeviceToken(token),
      can_access_db: true,
      revoked_at: null,
    },
    $unset: { device_token: 1, claim_code_hash: 1 },
  };
  if (bootstrap_hash && !device.bootstrap_hash) claimUpdate.$set.bootstrap_hash = bootstrap_hash;
  if (device_instance_id && !device.device_id) claimUpdate.$set.device_id = device_instance_id;

  const claimedDevice = await Device.findOneAndUpdate(
    {
      _id: device._id,
      status: 'approved',
      revoked_at: null,
      claim_code_hash: device.claim_code_hash,
    },
    claimUpdate,
    { new: true },
  );
  if (!claimedDevice) {
    return next(new AppError('Device claim code has already been used or revoked', 403));
  }

  await auditService.logAction({
    userId: null,
    action: AUDIT_ACTIONS.DEVICE_CREDENTIAL_ISSUED,
    target: { type: 'Device', id: claimedDevice._id },
    metadata: { device_name: claimedDevice.device_name, device_id: claimedDevice.device_id, flow: 'claim-code' },
    req,
  });

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
    revoked_at: null,
    $unset: { device_token: 1, device_token_hash: 1 },
  }, { new: true });

  if (!device) return next(new AppError('Device not found', 404));

  await auditService.logAction({
    userId: req.user?._id,
    action: AUDIT_ACTIONS.DEVICE_APPROVED,
    target: { type: 'Device', id: device._id },
    metadata: { device_name: device.device_name, device_id: device.device_id },
    req,
  });

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

  await auditService.logAction({
    userId: req.user?._id,
    action: AUDIT_ACTIONS.DEVICE_DB_ACCESS_TOGGLED,
    target: { type: 'Device', id: device._id },
    metadata: { device_name: device.device_name, can_access_db },
    req,
  });

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
    revoked_at: new Date(),
    $unset: { device_token: 1, device_token_hash: 1, claim_code_hash: 1, enrollment_challenge: 1 },
    can_access_db: false,
  }, { new: true });

  if (!device) return next(new AppError('Device not found', 404));

  await auditService.logAction({
    userId: req.user?._id,
    action: AUDIT_ACTIONS.DEVICE_REJECTED,
    target: { type: 'Device', id: device._id },
    metadata: { device_name: device.device_name, device_id: device.device_id },
    req,
  });

  res.status(200).json({
    status: 'success',
    message: 'Device has been rejected and access revoked.',
    data: { id: device._id, status: device.status, revoked_at: device.revoked_at },
  });
});

exports.revokeDevice = asyncHandler(async (req, res, next) => {
  const device = await Device.findByIdAndUpdate(req.params.id, {
    status: 'rejected',
    revoked_at: new Date(),
    can_access_db: false,
    $unset: { device_token: 1, device_token_hash: 1, claim_code_hash: 1, enrollment_challenge: 1 },
  }, { new: true });

  if (!device) return next(new AppError('Device not found', 404));

  await auditService.logAction({
    userId: req.user?._id,
    action: AUDIT_ACTIONS.DEVICE_REVOKED,
    target: { type: 'Device', id: device._id },
    metadata: { device_name: device.device_name, device_id: device.device_id },
    req,
  });

  res.status(200).json({
    status: 'success',
    message: 'Device access token has been revoked immediately.',
    data: { id: device._id, status: device.status, revoked_at: device.revoked_at },
  });
});

exports.deleteDevice = asyncHandler(async (req, res, next) => {
  const device = await Device.findByIdAndDelete(req.params.id);

  if (!device) return next(new AppError('Device not found', 404));

  await auditService.logAction({
    userId: req.user?._id,
    action: AUDIT_ACTIONS.DEVICE_DELETED,
    target: { type: 'Device', id: device._id },
    metadata: { device_name: device.device_name },
    req,
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
