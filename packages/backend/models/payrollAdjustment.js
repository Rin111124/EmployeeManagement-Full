const mongoose = require('mongoose');

const { Schema } = mongoose;

const payrollAdjustmentSchema = new Schema(
    {
        payroll_id: {
            type: Schema.Types.ObjectId,
            ref: 'Payroll',
            required: true,
            index: true,
        },
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        adjustment_type: {
            type: String,
            enum: ['Bonus', 'Deduction', 'Correction', 'Allowance', 'Retroactive'],
            required: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved_Step1', 'Approved', 'Rejected'],
            default: 'Pending',
            trim: true,
            index: true,
        },
        requires_two_step_approval: {
            type: Boolean,
            default: true,
        },
        created_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        step1_approved_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        step1_approved_at: {
            type: Date,
            default: null,
        },
        final_approved_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        final_approved_at: {
            type: Date,
            default: null,
        },
        rejected_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        rejection_reason: {
            type: String,
            default: null,
            trim: true,
        },
        before_net_salary: {
            type: Number,
            required: true,
        },
        after_net_salary: {
            type: Number,
            required: true,
        },
        applied_at: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'payroll_adjustments',
    }
);

module.exports = mongoose.models.PayrollAdjustment || mongoose.model('PayrollAdjustment', payrollAdjustmentSchema);
