const Device = require('../models/device.model');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { hashDeviceToken } = require('../utils/deviceToken');

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

const authenticateDevice = asyncHandler(async (req, res, next) => {
    const token = req.headers['x-device-token'];

    if (!token) {
        console.warn('[DeviceAuth] No token provided in headers');
        return next(new AppError('Device token is required', 401));
    }

    const device = await findDeviceByToken(token);

    if (!device) {
        console.warn(`[DeviceAuth] Token not found in database: ${String(token).substring(0, 8)}...`);
        return next(new AppError('Invalid device token', 403));
    }

    if (device.status !== 'approved') {
        console.warn(`[DeviceAuth] Device exists but status is ${device.status}: ${device.device_name}`);
        return next(new AppError('Device is not approved yet', 403));
    }

    if (!device.can_access_db) {
        console.warn(`[DeviceAuth] Device is approved but database access is disabled: ${device.device_name}`);
        return next(new AppError('Device database access is disabled', 403));
    }

    console.log(`[DeviceAuth] Success: ${device.device_name} authenticated`);
    req.device = device;
    next();
});

module.exports = authenticateDevice;
