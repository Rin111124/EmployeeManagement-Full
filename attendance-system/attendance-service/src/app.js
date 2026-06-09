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

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'attendance-core' });
});

// Import routes
app.use('/api/attendance', require('./routes/attendance.routes.js'));
app.use('/api/sync', require('./routes/sync.routes.js'));
app.use('/api/devices', require('./routes/device.routes.js'));
app.use('/api/registration', require('./routes/registration.routes.js'));

module.exports = app;
