const mongoose = require('mongoose');

const syncSignatureUseSchema = new mongoose.Schema({
    fingerprint: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
}, { collection: 'sync_signature_uses' });

syncSignatureUseSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.SyncSignatureUse
    || mongoose.model('SyncSignatureUse', syncSignatureUseSchema);
