const mongoose = require('mongoose');
const { ROLES } = require('../constants/roles');

const { Schema } = mongoose;

const userSchema = new Schema(
    {
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password_hash: {
            type: String,
            required: true,
            select: false,
        },
        roles: {
            type: [String],
            enum: Object.values(ROLES),
            default: [ROLES.EMPLOYEE],
        },
        is_active: {
            type: Boolean,
            default: true,
        },
        failed_login_attempts: {
            type: Number,
            default: 0,
            min: 0,
        },
        lock_until: {
            type: Date,
            default: null,
        },
        last_login_at: {
            type: Date,
            default: null,
        },
        last_login_ip: {
            type: String,
            trim: true,
        },
        last_login_user_agent: {
            type: String,
            trim: true,
        },
        login_history: {
            type: [
                {
                    ip: { type: String, trim: true },
                    user_agent: { type: String, trim: true },
                    success: { type: Boolean, required: true },
                    created_at: { type: Date, default: Date.now },
                },
            ],
            default: [],
            select: false,
        },
    },
    {
        timestamps: true,
        collection: 'users',
    }
);

userSchema.methods.isLocked = function isLocked() {
    return Boolean(this.lock_until && this.lock_until > new Date());
};

userSchema.set('toJSON', {
    transform(doc, ret) {
        delete ret.password_hash;
        delete ret.login_history;
        return ret;
    },
});

userSchema.set('toObject', {
    transform(doc, ret) {
        delete ret.password_hash;
        delete ret.login_history;
        return ret;
    },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
