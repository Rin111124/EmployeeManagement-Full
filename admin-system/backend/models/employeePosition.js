const mongoose = require('mongoose');

const { Schema } = mongoose;

const employeePositionSchema = new Schema(
    {
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        department_id: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            required: true,
            index: true,
        },
        position_name: {
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
            default: null,
        },
        is_current: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: 'employee_positions',
    }
);

employeePositionSchema.index({ employee_id: 1, is_current: 1 });

module.exports = mongoose.models.EmployeePosition || mongoose.model('EmployeePosition', employeePositionSchema);