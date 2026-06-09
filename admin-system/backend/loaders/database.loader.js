const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');

async function connectDatabase() {
    mongoose.set('strictQuery', true);

    await mongoose.connect(env.mongoUri);
    logger.info('MongoDB connected', { host: mongoose.connection.host });
}

module.exports = connectDatabase;
