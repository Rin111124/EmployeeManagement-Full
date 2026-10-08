const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        description: {
            type: String,
        }
    },
    {
        timestamps: true,
        collection: 'settings',
    }
);

module.exports = mongoose.models.Setting || mongoose.model('Setting', settingSchema);
