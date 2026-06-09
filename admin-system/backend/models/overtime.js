const mongoose = require('mongoose');
const { REQUEST_STATUS } = require('../constants/workflow');

const { Schema } = mongoose;

const overtimeSchema = new Schema(
    {
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        work_date: {
            type: Date,
            required: true,
        },
        hours: {
            type: Number,
            required: true,
            min: 0,
        },
        type: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            required: true,
            enum: Object.values(REQUEST_STATUS),
            default: REQUEST_STATUS.PENDING,
            trim: true,
        },
        reason: {
            type: String,
            trim: true,
        },
        reviewed_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        reviewed_at: {
            type: Date,
            default: null,
        },
        review_note: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: 'overtime',
    }
);

overtimeSchema.index({ employee_id: 1, work_date: 1 });

module.exports = mongoose.models.Overtime || mongoose.model('Overtime', overtimeSchema);
