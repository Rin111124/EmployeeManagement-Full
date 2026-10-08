const mongoose = require('mongoose');

const inboxEventSchema = new mongoose.Schema(
    {
        event_id: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        event_type: {
            type: String,
            default: 'attendance.synced',
            trim: true,
        },
        payload: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        processed_at: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: false },
        collection: 'inbox_events',
    }
);

// TTL index: tự động xóa bản ghi inbox sau 30 ngày để tiết kiệm dung lượng
inboxEventSchema.index({ created_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.models.InboxEvent || mongoose.model('InboxEvent', inboxEventSchema);
