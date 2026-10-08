const mongoose = require('mongoose');

const { Schema } = mongoose;
const { allowanceSchema } = require('./sharedSchemas');

const departmentSchema = new Schema(
    {
        department_name: {
            type: String,
            required: true,
            trim: true,
        },
        department_code: {
            type: String,
            trim: true,
            uppercase: true,
            // e.g. BGD, SX, LINE-A1
        },
        parent_id: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            default: null,
        },
        manager_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            default: null,
        },
        level: {
            // 0 = root (Ban Giám đốc), 1 = phòng ban, 2 = line/tổ sản xuất
            type: Number,
            default: 0,
        },
        description: {
            type: String,
            trim: true,
        },
        // Phụ cấp mặc định khi nhân viên được điều chuyển vào phòng ban này
        default_allowances: {
            type: [allowanceSchema],
            default: [],
        },
    },
    {
        timestamps: true,
        collection: 'departments',
    }
);

module.exports = mongoose.models.Department || mongoose.model('Department', departmentSchema);