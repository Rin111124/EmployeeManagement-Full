const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');

const live = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        message: 'Employee Management API is running',
    });
});

const ready = asyncHandler(async (req, res) => {
    const dbReady = mongoose.connection.readyState === 1;

    res.status(dbReady ? 200 : 503).json({
        success: dbReady,
        data: {
            database: dbReady ? 'connected' : 'disconnected',
        },
    });
});

module.exports = {
    live,
    ready,
};
