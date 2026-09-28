const mongoose = require('mongoose');

const attendanceOutboxSchema = new mongoose.Schema({
    event_id: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
    },
    event_type: {
        type: String,
        enum: ['attendance.checked_in', 'attendance.checked_out', 'attendance.corrected'],
        default: 'attendance.checked_in',
        required: true,
    },
    payload: {
        employee_id: { type: String, required: true },
        check_in: { type: Date, required: true },
        check_out: { type: Date, default: null },
        device_id: { type: String, default: null },
        confidence: { type: Number, default: null },
        method: { type: String, default: 'face' },
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'dead_letter'],
        default: 'pending',
        index: true,
    },
    retry_count: {
        type: Number,
        default: 0,
    },
    max_retries: {
        type: Number,
        default: 5,
    },
    next_retry_at: {
        type: Date,
        default: Date.now,
        index: true,
    },
    last_error: {
        type: String,
        default: null,
    },
    processed_at: {
        type: Date,
        default: null,
    },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'attendance_outbox',
});

// Compound index for outbox worker polling
attendanceOutboxSchema.index({ status: 1, next_retry_at: 1 });

module.exports = mongoose.models.AttendanceOutbox || mongoose.model('AttendanceOutbox', attendanceOutboxSchema);
