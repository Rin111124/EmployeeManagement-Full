const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  device_name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true
  },
  ip_address: {
    type: String,
    required: [true, 'IP address is required'],
    trim: true
  },
  port: {
    type: Number,
    default: 8080
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  device_type: {
    type: String,
    enum: ['face', 'fingerprint', 'rfid'],
    default: 'face'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  device_id: {
    type: String,
    sparse: true,
    unique: true,
    trim: true,
    index: true
  },
  bootstrap_hash: {
    type: String,
    select: false
  },
  enrollment_challenge: {
    challenge: { type: String, select: false },
    expires_at: { type: Date, select: false },
    attempts: { type: Number, default: 0, select: false }
  },
  revoked_at: {
    type: Date,
    default: null
  },
  scopes: {
    type: [String],
    default: ['attendance:write', 'biometric:request']
  },
  can_access_db: {
    type: Boolean,
    default: false
  },
  device_token: {
    type: String,
    select: false
  },
  device_token_hash: {
    type: String,
    select: false,
    index: true
  },
  claim_code_hash: {
    type: String,
    select: false,
    index: true
  },
  last_sync: {
    type: Date
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

deviceSchema.index({ ip_address: 1 }, { unique: true });
deviceSchema.index({ device_name: 'text' });

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
