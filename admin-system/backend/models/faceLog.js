const mongoose = require('mongoose');

const { Schema } = mongoose;

const faceLogSchema = new Schema(
    {
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        confidence: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
        },
        captured_image: {
            type: String,
            required: true,
            trim: true,
        },
        detected_at: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: 'face_logs',
    }
);

module.exports = mongoose.models.FaceLog || mongoose.model('FaceLog', faceLogSchema);