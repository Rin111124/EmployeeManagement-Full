const mongoose = require('mongoose');

const localDeviceSchema = new mongoose.Schema({
    device_id: {
        type: String,
        required: true,
        unique: true
    },
    device_name: String,
    location: String,
    ip_address: String,
    status: {
        type: String,
        enum: ['online', 'offline', 'maintenance'],
        default: 'offline'
    },
    device_token: {
        type: String,
        index: true,
        default: null,
        select: false,
    },
    device_token_hash: {
        type: String,
        index: true,
        default: null,
        select: false,
    },
    can_access_db: {
        type: Boolean,
        default: false,
    },
    last_seen: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('LocalDevice', localDeviceSchema);
