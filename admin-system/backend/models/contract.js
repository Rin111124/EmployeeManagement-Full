const mongoose = require('mongoose');

const { Schema } = mongoose;
const { allowanceSchema } = require('./sharedSchemas');

const contractSchema = new Schema(
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
            enum: ['Probation', 'Fixed-term', 'Indefinite', 'Freelance', 'Full-time'],
        },
        start_date: {
            type: Date,
            required: true,
        },
        end_date: {
            type: Date,
            default: null,
        },
        base_salary: {
            type: Number,
            required: true,
            min: 0,
        },
        allowances: {
            type: [allowanceSchema],
            default: [],
        },
        status: {
            type: String,
            enum: ['Draft', 'Pending', 'Approved', 'Signed', 'Terminated'],
            default: 'Draft',
        },
        template_id: {
            type: Schema.Types.ObjectId,
            ref: 'ContractTemplate',
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'contracts',
    }
);

module.exports = mongoose.models.Contract || mongoose.model('Contract', contractSchema);
