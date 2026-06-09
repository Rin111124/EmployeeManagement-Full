const mongoose = require('mongoose');

const { Schema } = mongoose;

const shiftSchema = new Schema(
    {
        shift_name: {
            type: String,
            required: true,
            trim: true,
        },
        start_time: {
            type: String,
            required: true,
            trim: true,
        },
        end_time: {
            type: String,
            required: true,
            trim: true,
        },
        is_night_shift: {
            type: Boolean,
            default: false,
        },
        standard_hours: {
            type: Number,
            required: true,
            min: 0,
        },
        break_mins: {
            type: Number,
            default: 30, // 30 phút nghỉ mặc định
        },
        min_work_mins_for_break: {
            type: Number,
            default: 240, // 4 tiếng làm việc mới được trừ nghỉ
        },
        fixed_breaks: [
            {
                start: String, // e.g., "12:00"
                end: String,   // e.g., "13:00"
            }
        ],
    },
    {
        timestamps: true,
        collection: 'shifts',
    }
);

module.exports = mongoose.models.Shift || mongoose.model('Shift', shiftSchema);