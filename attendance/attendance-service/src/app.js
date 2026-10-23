const express = require('express');
const cors = require('cors');
const env = require('./config/env');

const connectDB = require('./config/db');
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const app = express();

app.use(cors({
    origin(origin, callback) {
        if (env.allowedOrigins === '*' || !origin || env.allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());

const mongoose = require('mongoose');

// Liveness check (process is running)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'attendance-core' });
});

// Giai đoạn 6: Readiness check (xác minh MongoDB và dependencies thực sự sẵn sàng)
app.get('/health/ready', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
        return res.status(503).json({
            status: 'degraded',
            service: 'attendance-core',
            database: 'disconnected',
        });
    }
    res.json({
        status: 'ready',
        service: 'attendance-core',
        database: 'connected',
    });
});
app.get('/ready', (req, res) => res.redirect(307, '/health/ready'));

// Import routes
app.use('/api/attendance', require('./routes/attendance.routes.js'));
app.use('/api/sync', require('./routes/sync.routes.js'));
app.use('/api/devices', require('./routes/device.routes.js'));
app.use('/api/registration', require('./routes/registration.routes.js'));
app.use('/api/outbox', require('./routes/outbox.routes.js'));

module.exports = app;
