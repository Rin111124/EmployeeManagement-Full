/**
 * LocalEmployee.js — Attendance Service local employee cache
 *
 * Giai đoạn 2: face_embedding được lưu dạng AES-256-GCM encrypted string.
 * Trước đây: { type: [Number] } — plaintext, rủi ro lộ biometric data.
 * Hiện tại:  { type: String }  — encrypted blob, decrypt khi cần matching.
 *
 * Dùng src/utils/cryptoVault.js để encrypt/decrypt.
 * Key phải khớp với APP_ENCRYPTION_KEY/APP_ENCRYPTION_KEY_V1 ở Admin Backend
 * để embedding được sync giữ nguyên được.
 */

'use strict';

const mongoose = require('mongoose');

const localEmployeeSchema = new mongoose.Schema({
    employee_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // employee_code is populated during admin sync; it is NOT available at kiosk
    // enrollment time so it must be optional. sparse:true enforces uniqueness only
    // when the field is present (allows multiple documents without the field).
    employee_code: {
        type: String,
        sparse: true,
        index: true
    },
    full_name: {
        type: String,
        required: true
    },

    // Giai đoạn 2: Lưu dạng AES-256-GCM encrypted string thay vì plaintext [Number].
    // Format: "v1:<iv_hex>:<tag_hex>:<ciphertext_hex>"
    // Dùng cryptoVault.encryptJSON(embedding) khi ghi, decryptJSON() khi đọc.
    face_embedding: {
        type: String, // encrypted blob
        default: null,
        set: function (val) {
            if (Array.isArray(val)) {
                const { encryptJSON } = require('../utils/cryptoVault');
                return encryptJSON(val);
            }
            return val;
        },
        // Không index — embedding không được dùng để query trực tiếp
    },

    // Metadata để biết embedding có hợp lệ không mà không cần decrypt
    embedding_version: {
        type: String,
        default: null, // vd: 'v1' — key version dùng khi encrypt
    },

    department: String,
    position: String,
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Terminated'],
        default: 'Active'
    },
    last_sync: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Virtual để check có embedding không mà không expose plaintext
localEmployeeSchema.virtual('hasEmbedding').get(function () {
    return !!this.face_embedding;
});

localEmployeeSchema.methods.getDecryptedEmbedding = function () {
    if (!this.face_embedding) return null;
    const { decryptJSON } = require('../utils/cryptoVault');
    return decryptJSON(this.face_embedding);
};

// Không bao giờ serialize face_embedding ra JSON response
localEmployeeSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.face_embedding; // Không trả plaintext/ciphertext về client
        return ret;
    }
});

module.exports = mongoose.model('LocalEmployee', localEmployeeSchema);
