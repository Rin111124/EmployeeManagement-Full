const mongoose = require('mongoose');

const { Schema } = mongoose;

const payrollSchema = new Schema(
    {
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: true,
            min: 1900,
        },
        total_work_hours: {
            type: Number,
            default: 0,
            min: 0,
        },
        total_overtime_hours: {
            type: Number,
            default: 0,
            min: 0,
        },
        basic_salary: {
            type: Number,
            required: true,
            min: 0,
        },
        overtime_salary: {
            type: Number,
            default: 0,
            min: 0,
        },
        allowance: {
            type: Number,
            default: 0,
            min: 0,
        },
        deduction: {
            type: Number,
            default: 0,
            min: 0,
        },
        net_salary: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ['Draft', 'Finalized'],
            default: 'Draft',
            trim: true,
        },
        generated_at: {
            type: Date,
            default: null,
        },
        generated_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        calculation_details: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
        collection: 'payroll',
    }
);

payrollSchema.index({ employee_id: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.models.Payroll || mongoose.model('Payroll', payrollSchema);
