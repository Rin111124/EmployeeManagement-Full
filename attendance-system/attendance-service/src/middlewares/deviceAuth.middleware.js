const LocalDevice = require('../models/LocalDevice');
const axios = require('axios');
const env = require('../config/env');
const { hashDeviceToken } = require('../utils/deviceToken');

function normalizeAdminUrl(url) {
    const trimmed = String(url || '').trim().replace(/\/+$/, '');
    if (!trimmed) return '';
    return trimmed.includes('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

async function verifyTokenWithAdmin(token) {
    const adminUrl = normalizeAdminUrl(env.adminUrl);
    const response = await axios.get(`${adminUrl}/devices/unregistered-employees`, {
        headers: { 'x-device-token': token },
        timeout: 3000,
    });
    return response.status === 200;
}

async function findLocalDeviceByToken(token) {
    const tokenHash = hashDeviceToken(token);
    let device = await LocalDevice.findOne({ device_token_hash: tokenHash }).select('+device_token +device_token_hash');

    if (!device) {
        device = await LocalDevice.findOne({ device_token: token }).select('+device_token +device_token_hash');
        if (device) {
            device.device_token_hash = tokenHash;
            device.device_token = null;
            await device.save();
        }
    }

    return device;
}

async function authenticateDevice(req, res, next) {
    try {
        if (process.env.NODE_ENV === 'test' && !req.get('x-enable-device-auth')) {
            return next();
        }

        const token = req.headers['x-device-token'];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'x-device-token header is required',
            });
        }

        const tokenHash = hashDeviceToken(token);
        const device = await findLocalDeviceByToken(token);
        if (device && device.can_access_db && device.status === 'online') {
            req.device = device;
            return next();
        }

        let verified = false;
        try {
            verified = await verifyTokenWithAdmin(token);
        } catch (verificationError) {
            verified = false;
        }

        if (!verified) {
            return res.status(403).json({
                success: false,
                message: 'Device not authorized',
            });
        }

        const deviceId = req.body?.device_id || req.headers['x-device-id'] || null;
        if (deviceId) {
            await LocalDevice.findOneAndUpdate(
                { device_id: deviceId },
                {
                    $set: {
                        device_token: null,
                        device_token_hash: tokenHash,
                        can_access_db: true,
                        status: 'online',
                        last_seen: Date.now(),
                    },
                    $setOnInsert: {
                        device_name: req.body?.device_name || deviceId,
                    },
                },
                { upsert: true, new: true }
            );
        }

        return next();
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    authenticateDevice,
};
