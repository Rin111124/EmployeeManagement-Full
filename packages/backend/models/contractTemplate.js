const mongoose = require('mongoose');

const { Schema } = mongoose;

const contractTemplateSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        html_content: {
            type: String,
            required: true,
        },
        contract_type_match: {
            type: String,
            enum: ['Probation', 'Fixed-term', 'Indefinite', 'Freelance', 'All'],
            default: 'All',
        },
        is_default: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        collection: 'contract_templates',
    }
);

module.exports = mongoose.models.ContractTemplate || mongoose.model('ContractTemplate', contractTemplateSchema);
