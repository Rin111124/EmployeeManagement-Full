const mongoose = require('mongoose');
const { REQUEST_STATUS } = require('../constants/workflow');

const { Schema } = mongoose;

const leaveRequestSchema = new Schema(
    {
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        type: {
            type: String,
            required: true,
            trim: true,
        },
        start_date: {
            type: Date,
            required: true,
        },
        end_date: {
            type: Date,
            required: true,
        },
        total_days: {
            type: Number,
            required: true,
            min: 0,
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
        collection: 'leave_requests',
    }
);

leaveRequestSchema.index({ status: 1, employee_id: 1 });
leaveRequestSchema.index({ start_date: 1, end_date: 1 });
leaveRequestSchema.index(
    { employee_id: 1, start_date: 1, end_date: 1, status: 1 },
    { name: 'leave_overlap_lookup' }
);

module.exports = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema);
