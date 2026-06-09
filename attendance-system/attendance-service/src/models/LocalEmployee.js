const mongoose = require('mongoose');

const localEmployeeSchema = new mongoose.Schema({
    employee_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // employee_code is populated during admin sync; it is NOT available at kiosk
    // enrollment time so it must be optional. sparse:true enforces uniqueness only
    // when the field is present (allows multiple documents without the field).
    employee_code: {
        type: String,
        sparse: true,
        index: true
    },
    full_name: {
        type: String,
        required: true
    },
    face_embedding: {
        type: [Number], // 512-dim InsightFace buffalo_l embedding
        default: []
    },
    department: String,
    position: String,
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Terminated'],
        default: 'Active'
    },
    last_sync: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('LocalEmployee', localEmployeeSchema);

