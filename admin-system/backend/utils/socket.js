/**
 * Socket.IO singleton module.
 *
 * Usage:
 *   // Initialise once in server.js:
 *   const socketManager = require('./utils/socket');
 *   socketManager.init(httpServer, corsOptions);
 *
 *   // Emit from any controller / service:
 *   const socketManager = require('./utils/socket');
 *   socketManager.getIo().emit('event', data);
 */

const { Server } = require('socket.io');
const Device = require('../models/device.model');
const { hashDeviceToken } = require('./deviceToken');

let _io = null;
const latestKioskFrames = new Map();

const KIOSK_FRAME_MAX_BYTES = 2 * 1024 * 1024;

function kioskRoom(deviceId) {
    return `kiosk:${deviceId}`;
}

function publishKioskFrame(frame) {
    if (!_io || !frame?.device_id) return;
    latestKioskFrames.set(String(frame.device_id), frame);
    _io.to(kioskRoom(frame.device_id)).emit('kiosk:frame', frame);
}

function getLatestKioskFrame(deviceId) {
    if (!deviceId) return null;
    return latestKioskFrames.get(String(deviceId)) || null;
}

async function findApprovedDeviceByToken(token) {
    if (!token) return null;
    const tokenHash = hashDeviceToken(token);
    let device = await Device.findOne({
        device_token_hash: tokenHash,
        status: 'approved',
        can_access_db: true,
    }).select('_id device_name ip_address location status can_access_db device_token device_token_hash');

    if (!device) {
        device = await Device.findOne({
            device_token: token,
            status: 'approved',
            can_access_db: true,
        }).select('_id device_name ip_address location status can_access_db device_token device_token_hash');

        if (device) {
            device.device_token_hash = tokenHash;
            device.device_token = undefined;
            await device.save();
        }
    }

    return device;
}

function registerKioskStreamHandlers(io) {
    io.on('connection', (socket) => {
        socket.on('kiosk:join', ({ deviceId } = {}) => {
            if (!deviceId) return;
            socket.join(kioskRoom(deviceId));

            const latestFrame = latestKioskFrames.get(String(deviceId));
            if (latestFrame) {
                socket.emit('kiosk:frame', latestFrame);
            }
        });

        socket.on('kiosk:leave', ({ deviceId } = {}) => {
            if (!deviceId) return;
            socket.leave(kioskRoom(deviceId));
        });

        socket.on('kiosk:stream-frame', async (payload = {}) => {
            try {
                const { deviceToken, image, capturedAt, terminalId } = payload;
                if (!image || typeof image !== 'string') return;
                if (Buffer.byteLength(image, 'utf8') > KIOSK_FRAME_MAX_BYTES) return;

                const device = await findApprovedDeviceByToken(deviceToken);
                if (!device) {
                    socket.emit('kiosk:stream-rejected', { message: 'Device is not authorized for streaming.' });
                    return;
                }

                publishKioskFrame({
                    device_id: device._id.toString(),
                    device_name: device.device_name,
                    terminal_id: terminalId || null,
                    location: device.location,
                    ip_address: device.ip_address,
                    image,
                    captured_at: capturedAt || new Date().toISOString(),
                    received_at: new Date().toISOString(),
                });
            } catch (_error) {
                socket.emit('kiosk:stream-rejected', { message: 'Unable to process kiosk stream frame.' });
            }
        });
    });
}

/**
 * Initialise Socket.IO and attach it to an existing HTTP server.
 * Must be called exactly once before any call to getIo().
 *
 * @param {import('http').Server} httpServer - The HTTP server instance.
 * @param {string[]} allowedOrigins - CORS allowed origins list.
 * @returns {import('socket.io').Server}
 */
function init(httpServer, allowedOrigins) {
    if (_io) {
        throw new Error('Socket.IO has already been initialised. Call init() only once.');
    }

    _io = new Server(httpServer, {
        maxHttpBufferSize: 5 * 1024 * 1024,
        cors: {
            origin: allowedOrigins === '*' ? true : allowedOrigins,
            credentials: true,
        },
    });

    registerKioskStreamHandlers(_io);

    return _io;
}

/**
 * Return the initialised Socket.IO server instance.
 * Throws if init() has not been called yet.
 *
 * @returns {import('socket.io').Server}
 */
function getIo() {
    if (!_io) {
        throw new Error('Socket.IO has not been initialised. Call init() in server.js first.');
    }
    return _io;
}

module.exports = { init, getIo, publishKioskFrame, getLatestKioskFrame };
