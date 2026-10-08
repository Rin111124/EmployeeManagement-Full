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
const jwt = require('jsonwebtoken');
const Device = require('../models/device.model');
const { User, TokenBlacklist } = require('../models');
const env = require('../config/env');
const { isAllowedOrigin } = require('../config/cors');
const { hashDeviceToken } = require('./deviceToken');
const { MANAGEMENT_ROLES } = require('../constants/roles');

let _io = null;
const latestKioskFrames = new Map(); // key: deviceId -> { frame, expiresAt: number }

const KIOSK_FRAME_MAX_BYTES = 2 * 1024 * 1024;
const FRAME_TTL_MS = 30 * 1000; // 30 seconds TTL in memory
const MAX_FRAME_RATE_MS = 200; // max 5 frames per second per socket

function kioskRoom(deviceId) {
    return `kiosk:${deviceId}`;
}

function parseCookies(cookieHeader) {
    if (!cookieHeader || typeof cookieHeader !== 'string') return {};
    return cookieHeader.split(';').reduce((acc, pair) => {
        const idx = pair.indexOf('=');
        if (idx > -1) {
            const key = pair.substring(0, idx).trim();
            const val = pair.substring(idx + 1).trim();
            try {
                acc[key] = decodeURIComponent(val);
            } catch (_e) {
                acc[key] = val;
            }
        }
        return acc;
    }, {});
}

function publishKioskFrame(frame) {
    if (!frame?.device_id) return;
    const deviceId = String(frame.device_id);
    const expiresAt = Date.now() + FRAME_TTL_MS;
    latestKioskFrames.set(deviceId, { frame, expiresAt });
    if (_io) {
        _io.to(kioskRoom(deviceId)).emit('kiosk:frame', frame);
    }
}

function getLatestKioskFrame(deviceId) {
    if (!deviceId) return null;
    const key = String(deviceId);
    const cached = latestKioskFrames.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
        latestKioskFrames.delete(key);
        return null;
    }
    return cached.frame;
}

async function findApprovedDeviceByToken(token) {
    if (!token) return null;
    const tokenHash = hashDeviceToken(token);
    let device = await Device.findOne({
        device_token_hash: tokenHash,
        status: 'approved',
        can_access_db: true,
        revoked_at: null,
    }).select('_id device_name ip_address location status can_access_db device_token device_token_hash revoked_at');

    if (!device) {
        device = await Device.findOne({
            device_token: token,
            status: 'approved',
            can_access_db: true,
            revoked_at: null,
        }).select('_id device_name ip_address location status can_access_db device_token device_token_hash revoked_at');

        if (device) {
            device.device_token_hash = tokenHash;
            device.device_token = undefined;
            await device.save();
        }
    }

    return device;
}

async function authenticateSocket(socket, next) {
    try {
        const auth = socket.handshake.auth || {};
        const headers = socket.handshake.headers || {};
        const cookies = parseCookies(headers.cookie);

        // 1. Check for user JWT access token
        let userToken = auth.token;
        if (!userToken && headers.authorization) {
            const [scheme, val] = headers.authorization.split(' ');
            if (scheme === 'Bearer' && val) {
                userToken = val;
            }
        }
        if (!userToken && cookies.accessToken) {
            userToken = cookies.accessToken;
        }

        if (userToken) {
            let payload;
            try {
                payload = jwt.verify(userToken, env.jwtSecret);
            } catch (err) {
                return next(new Error('Invalid or expired authentication token'));
            }

            if (payload.type !== 'access') {
                return next(new Error('Invalid token type for WebSocket'));
            }

            if (payload.jti) {
                const blacklisted = await TokenBlacklist.exists({ token_id: payload.jti });
                if (blacklisted) {
                    return next(new Error('Authentication token has been revoked'));
                }
            }

            const user = await User.findById(payload.sub).select('_id username roles is_active');
            if (!user || !user.is_active) {
                return next(new Error('User account is inactive or not found'));
            }

            socket.data.user = user;
            socket.data.authType = 'user';
            return next();
        }

        // 2. Check for device token
        const deviceToken = auth.deviceToken || headers['x-device-token'];
        if (deviceToken) {
            const device = await findApprovedDeviceByToken(deviceToken);
            if (!device) {
                return next(new Error('Invalid or unapproved device token'));
            }

            socket.data.device = device;
            socket.data.authType = 'device';
            return next();
        }

        // Neither user token nor device token provided
        return next(new Error('Authentication required'));
    } catch (err) {
        return next(new Error('Authentication failed'));
    }
}

function registerKioskStreamHandlers(io) {
    // Clean up expired frames every 60s
    setInterval(() => {
        const now = Date.now();
        for (const [key, val] of latestKioskFrames.entries()) {
            if (now > val.expiresAt) {
                latestKioskFrames.delete(key);
            }
        }
    }, 60000).unref();

    io.on('connection', (socket) => {
        let lastFrameTimestamp = 0;

        socket.on('kiosk:join', ({ deviceId } = {}) => {
            if (!deviceId) return;

            // Authorization check: only users with Management Roles can subscribe
            const user = socket.data.user;
            const isAuthorizedUser = user && Array.isArray(user.roles) && user.roles.some((r) => MANAGEMENT_ROLES.includes(r));

            if (!isAuthorizedUser) {
                socket.emit('kiosk:error', {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to view kiosk live stream.',
                });
                return;
            }

            socket.join(kioskRoom(deviceId));

            const latestFrame = getLatestKioskFrame(deviceId);
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
                // Rate limiting per socket
                const now = Date.now();
                if (now - lastFrameTimestamp < MAX_FRAME_RATE_MS) {
                    return; // drop excess frames
                }
                lastFrameTimestamp = now;

                const { deviceToken, image, capturedAt, terminalId } = payload;
                if (!image || typeof image !== 'string') return;
                if (Buffer.byteLength(image, 'utf8') > KIOSK_FRAME_MAX_BYTES) return;

                // Use authenticated device or verify supplied token
                let device = socket.data.device;
                if (!device && deviceToken) {
                    device = await findApprovedDeviceByToken(deviceToken);
                }

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
            origin: (origin, callback) => {
                if (isAllowedOrigin(origin)) {
                    return callback(null, true);
                }
                return callback(null, false);
            },
            credentials: true,
        },
    });

    _io.use(authenticateSocket);
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

module.exports = { init, getIo, publishKioskFrame, getLatestKioskFrame, authenticateSocket };
