const mongoose = require('mongoose');

const { Schema } = mongoose;

const attendanceSchema = new Schema(
    {
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        shift_id: {
            type: Schema.Types.ObjectId,
            ref: 'Shift',
            index: true,
            default: null,
        },
        /**
         * P1-PAY-01 Timezone Convention:
         * All timestamps (work_date, check_in, check_out) are strictly stored in UTC in MongoDB.
         * Business logic boundaries and UI formatting convert to/from 'Asia/Ho_Chi_Minh' (UTC+7).
         * work_date represents the calendar day of the shift in Asia/Ho_Chi_Minh normalized to UTC 00:00:00.
         */
        work_date: {
            type: Date,
            required: true,
        },
        check_in: {
            type: Date,
            default: null,
        },
        check_out: {
            type: Date,
            default: null,
        },
        worked_hours: {
            type: Number,
            default: 0,
            min: 0,
        },
        ot_hours: {
            type: Number,
            default: 0,
            min: 0,
        },
        late_minutes: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            required: true,
            enum: ['CheckedIn', 'CheckedOut', 'MissingCheckout'],
            default: 'CheckedIn',
            trim: true,
        },
        method: {
            type: String,
            enum: ['face', 'manual'],
            default: 'face',
            trim: true,
        },
        device_id: {
            type: Schema.Types.ObjectId,
            default: null,
        },
        check_in_face_image: {
            type: String,
            trim: true,
        },
        check_out_face_image: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: 'attendance',
    }
);

attendanceSchema.index({ employee_id: 1, work_date: 1 }, { unique: true });
attendanceSchema.index({ work_date: 1, status: 1 });
attendanceSchema.index({ employee_id: 1, status: 1, work_date: -1 });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
