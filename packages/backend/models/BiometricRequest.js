const mongoose = require('mongoose');

const biometricRequestSchema = new mongoose.Schema(
    {
        employee_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
        },
        device_id: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed'],
            default: 'pending',
        },
        requested_at: {
            type: Date,
            default: Date.now,
        },
        approved_at: {
            type: Date,
        },
        approved_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        collection: 'biometric_requests',
    }
);

module.exports = mongoose.model('BiometricRequest', biometricRequestSchema);
