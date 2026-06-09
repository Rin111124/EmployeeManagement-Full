const mongoose = require('mongoose');

const { Schema } = mongoose;

const faceDataSchema = new Schema(
    {
        label: {
            type: String,
            trim: true,
        },
        embedding: {
            type: [Number],
            default: [],
        },
        image_path: {
            type: String,
            trim: true,
        },
        provider: {
            type: String,
            default: 'manual',
            trim: true,
        },
        created_at: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const bankAccountSchema = new Schema(
    {
        bank_name: {
            type: String,
            required: true,
            trim: true,
        },
        account_number: {
            type: String,
            required: true,
            trim: true,
        },
        is_primary: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);

const allowanceSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);

const trainingEmployeeSchema = new Schema(
    {
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
        },
        status: {
            type: String,
            required: true,
            trim: true,
        },
        score: {
            type: Number,
            min: 0,
            max: 100,
        },
    },
    { _id: false }
);

const trainingSessionSchema = new Schema(
    {
        start_date: {
            type: Date,
            required: true,
        },
        end_date: {
            type: Date,
            required: true,
        },
        employees: {
            type: [trainingEmployeeSchema],
            default: [],
        },
    },
    { _id: false }
);

module.exports = {
    faceDataSchema,
    bankAccountSchema,
    allowanceSchema,
    trainingEmployeeSchema,
    trainingSessionSchema,
};
