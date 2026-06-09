const mongoose = require('mongoose');

const { Schema } = mongoose;

const refreshTokenSchema = new Schema(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        token_hash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        token_id: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        family_id: {
            type: String,
            required: true,
            index: true,
        },
        expires_at: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
        revoked_at: {
            type: Date,
            default: null,
        },
        replaced_by_token_id: {
            type: String,
            default: null,
        },
        created_by_ip: {
            type: String,
            trim: true,
        },
        user_agent: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: 'refresh_tokens',
    }
);

module.exports = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);
