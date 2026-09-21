const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');

async function connectDatabase() {
    mongoose.set('strictQuery', true);

    await mongoose.connect(env.mongoUri, {
        maxPoolSize: 20,           // Tăng từ default 5 — hỗ trợ nhiều concurrent requests hơn
        minPoolSize: 5,            // Giữ sẵn tối thiểu 5 connections để giảm connection latency
        socketTimeoutMS: 45000,    // Timeout nếu socket không hoạt động trong 45s
        serverSelectionTimeoutMS: 5000, // Timeout khi chọn server (fail fast)
        heartbeatFrequencyMS: 10000,    // Kiểm tra server health mỗi 10s
    });
    logger.info('MongoDB connected', { host: mongoose.connection.host });
}

module.exports = connectDatabase;
