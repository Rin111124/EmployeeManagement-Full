const mongoose = require('mongoose');

const { Schema } = mongoose;

const auditLogSchema = new Schema(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        action: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        target: {
            type: {
                type: String,
                required: true,
                trim: true,
            },
            id: {
                type: Schema.Types.ObjectId,
                default: null,
            },
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
        ip: {
            type: String,
            trim: true,
        },
        user_agent: {
            type: String,
            trim: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        collection: 'audit_logs',
    }
);

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
