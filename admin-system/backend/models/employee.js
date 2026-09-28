const mongoose = require('mongoose');

const { Schema } = mongoose;
const { bankAccountSchema, faceDataSchema } = require('./sharedSchemas');

const employeeSchema = new Schema(
    {
        employee_code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        full_name: {
            type: String,
            required: true,
            trim: true,
        },
        date_of_birth: {
            type: Date,
            required: true,
        },
        gender: {
            type: String,
            required: true,
            enum: ['Male', 'Female', 'Other'],
            trim: true,
        },
        place_of_birth: {
            type: String,
            trim: true,
        },
        identity: {
            number: {
                type: String,
                trim: true,
            },
            issue_date: {
                type: Date,
            },
            issue_place: {
                type: String,
                trim: true,
            },
        },
        contact: {
            phone: {
                type: String,
                trim: true,
                validate: {
                    validator: (v) => !v || /^(\+84|0)[3-9]\d{8}$/.test(v),
                    message: 'Invalid Vietnamese phone number',
                },
            },
            email: {
                type: String,
                trim: true,
                lowercase: true,
                validate: {
                    validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
                    message: 'Invalid email format',
                },
            },
            permanent_address: {
                type: String,
                trim: true,
            },
            current_address: {
                type: String,
                trim: true,
            },
        },
        position: {
            type: String,
            trim: true,
        },
        department: {
            type: String,
            trim: true,
        },
        insurance: {
            tax_code: {
                type: String,
                trim: true,
            },
            social_insurance: {
                type: String,
                trim: true,
            },
            health_insurance: {
                type: String,
                trim: true,
            },
        },
        bank_accounts: {
            type: [bankAccountSchema],
            default: [],
        },
        status: {
            type: String,
            required: true,
            default: 'Active',
            enum: ['Active', 'Inactive', 'Terminated'],
            trim: true,
        },
        hire_date: {
            type: Date,
            required: true,
        },
        face_data: {
            type: [faceDataSchema],
            default: [],
        },
        avatar: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'employees',
    }
);

employeeSchema.index({ 'contact.email': 1 }, { sparse: true });
employeeSchema.index({ status: 1 });
employeeSchema.index({ department: 1, status: 1 }); // composite: list by dept + filter active
employeeSchema.index({ hire_date: -1 }); // sort by hire date (reports)

module.exports = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
