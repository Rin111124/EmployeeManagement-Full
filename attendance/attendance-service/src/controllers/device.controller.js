const LocalDevice = require('../models/LocalDevice');
const { hashDeviceToken } = require('../utils/deviceToken');

function publicDevice(device) {
    const data = device.toObject ? device.toObject() : { ...device };
    delete data.device_token;
    delete data.device_token_hash;
    return data;
}

exports.registerDevice = async (req, res) => {
    try {
        const { device_id, device_name, location, ip_address } = req.body;
        const deviceToken = req.headers['x-device-token'] || null;

        if (!device_id) {
            return res.status(400).json({ success: false, message: 'device_id is required' });
        }

        let device = await LocalDevice.findOne({ device_id });

        if (device) {
            device.ip_address = ip_address;
            device.status = 'online';
            device.last_seen = Date.now();
            device.device_token = null;
            device.device_token_hash = deviceToken ? hashDeviceToken(deviceToken) : null;
            device.can_access_db = Boolean(deviceToken);
            await device.save();
        } else {
            device = await LocalDevice.create({
                device_id,
                device_name,
                location,
                ip_address,
                status: 'online',
                last_seen: Date.now(),
                device_token: null,
                device_token_hash: deviceToken ? hashDeviceToken(deviceToken) : null,
                can_access_db: Boolean(deviceToken),
            });
        }

        res.status(200).json({ success: true, data: publicDevice(device) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDevices = async (req, res) => {
    try {
        const devices = await LocalDevice.find().select('-device_token -device_token_hash');
        res.status(200).json({ success: true, data: devices });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
