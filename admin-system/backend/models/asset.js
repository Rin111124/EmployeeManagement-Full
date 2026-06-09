const mongoose = require('mongoose');

const { Schema } = mongoose;

const assetSchema = new Schema(
    {
        asset_name: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            enum: ['Laptop', 'Desktop', 'Mobile', 'Tablet', 'Storage', 'Peripherals', 'Other'],
            default: 'Other',
            trim: true,
        },
        serial_number: {
            type: String,
            trim: true,
            uppercase: true,
            sparse: true,
            unique: true,
        },
        status: {
            type: String,
            required: true,
            enum: ['Available', 'Assigned', 'Maintenance', 'Broken', 'Lost', 'Retired'],
            default: 'Available',
            trim: true,
        },
        assigned_to: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            default: null,
        },
        assigned_date: {
            type: Date,
            default: null,
        },
        purchase_date: {
            type: Date,
            default: null,
        },
        purchase_cost: {
            type: Number,
            min: 0,
            default: 0,
        },
        warranty_until: {
            type: Date,
            default: null,
        },
        location: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: 'assets',
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

assetSchema.virtual('name').get(function assetNameVirtual() {
    return this.asset_name;
});

assetSchema.virtual('employee_id').get(function employeeVirtual() {
    return this.assigned_to;
});

assetSchema.pre('validate', function normalizeAssignment() {
    if (this.assigned_to && this.status === 'Available') {
        this.status = 'Assigned';
    }
    if (!this.assigned_to && this.status === 'Assigned') {
        this.status = 'Available';
        this.assigned_date = null;
    }
    if (this.assigned_to && !this.assigned_date) {
        this.assigned_date = new Date();
    }
});

assetSchema.index({ asset_name: 'text', serial_number: 'text', location: 'text' });

module.exports = mongoose.models.Asset || mongoose.model('Asset', assetSchema);
