const mongoose = require('mongoose');

const { Schema } = mongoose;

const tokenBlacklistSchema = new Schema(
    {
        token_id: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        user_id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        expires_at: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
        reason: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: 'token_blacklist',
    }
);

module.exports = mongoose.models.TokenBlacklist || mongoose.model('TokenBlacklist', tokenBlacklistSchema);
