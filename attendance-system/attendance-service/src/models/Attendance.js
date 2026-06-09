const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employee_id: {
        type: String,
        required: true,
        index: true
    },
    device_id: {
        type: String,
        required: true
    },
    check_in: {
        type: Date,
        default: Date.now
    },
    check_out: {
        type: Date
    },
    status: {
        type: String,
        enum: ['present', 'late', 'early_leave', 'absent'],
        default: 'present'
    },
    confidence: {
        type: Number, // AI confidence score
        min: 0,
        max: 1
    },
    face_log: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FaceLog'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema);
