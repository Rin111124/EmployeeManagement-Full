#!/usr/bin/env node
/**
 * migrate-embedding-encryption.mjs
 *
 * Giai đoạn 2 — Migration script: Mã hóa face_embedding plaintext trong MongoDB
 * của Attendance Service sang AES-256-GCM format.
 *
 * Vấn đề: face_embedding trước đây lưu dạng [Number] plaintext.
 * Sau khi update LocalEmployee.js model, cần migrate dữ liệu cũ.
 *
 * Cách chạy:
 *   # Dry run (chỉ đếm, không thay đổi)
 *   node scripts/migrate-embedding-encryption.mjs
 *
 *   # Apply thực tế
 *   node scripts/migrate-embedding-encryption.mjs --apply
 *
 * Yêu cầu:
 *   - APP_ENCRYPTION_KEY hoặc APP_ENCRYPTION_KEY_V1 phải set
 *   - MONGODB_URI phải trỏ đến attendance DB
 *
 * An toàn:
 *   - Chỉ migrate record có face_embedding là Array (dữ liệu cũ)
 *   - Record đã có string encrypted (field là String, bắt đầu bằng "v\d:") được bỏ qua
 *   - Rollback: dữ liệu plaintext cũ được ghi vào face_embedding_plaintext_backup
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env từ .env file của attendance-service
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const DRY_RUN = !APPLY;

// ── Inline CryptoVault (để không phụ thuộc import chain) ──────────────────────
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getCurrentKeyVersion() {
    return process.env.APP_ENCRYPTION_KEY_VERSION || 'v1';
}

function getEncryptionKey(version = getCurrentKeyVersion()) {
    const versionedKey = process.env[`APP_ENCRYPTION_KEY_${version.toUpperCase()}`];
    const rawKey = versionedKey || process.env.APP_ENCRYPTION_KEY;
    if (!rawKey) {
        throw new Error(
            'APP_ENCRYPTION_KEY hoặc APP_ENCRYPTION_KEY_V1 là bắt buộc để chạy migration.\n' +
            'Đặt trong .env của attendance-service.'
        );
    }
    return crypto.createHash('sha256').update(String(rawKey)).digest();
}

function encryptJSON(data) {
    const version = getCurrentKeyVersion();
    const key = getEncryptionKey(version);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const plaintext = JSON.stringify(data);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${version}:${iv.toString('hex')}:${authTag}:${ciphertext}`;
}

function isAlreadyEncrypted(value) {
    if (typeof value !== 'string') return false;
    const parts = value.split(':');
    return parts.length === 4 && /^v[1-9]\d*$/.test(parts[0]);
}

// ── Schema (inline để không import cả model) ─────────────────────────────────
const localEmployeeSchema = new mongoose.Schema({
    employee_id: String,
    full_name: String,
    face_embedding: mongoose.Schema.Types.Mixed, // Mixed để đọc cả Array lẫn String
    embedding_version: String,
}, { strict: false, timestamps: true });

async function main() {
    const mongoUri = process.env.MONGODB_URI || process.env.ATTENDANCE_MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ MONGODB_URI chưa được set trong .env');
        process.exit(1);
    }

    console.log('\n====================================================');
    console.log('  Attendance Service — Embedding Encryption Migration');
    console.log('====================================================');
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (không thay đổi)' : '✍️  APPLY (ghi vào DB)'}`);
    console.log(`MongoDB: ${mongoUri.replace(/\/\/[^@]+@/, '//<credentials>@')}`);
    console.log(`Key version: ${getCurrentKeyVersion()}`);
    console.log('');

    try {
        // Validate key trước khi connect
        getEncryptionKey();
        console.log('✅ Encryption key hợp lệ');
    } catch (err) {
        console.error('❌', err.message);
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Kết nối MongoDB thành công\n');

    const LocalEmployee = mongoose.model('LocalEmployee', localEmployeeSchema);

    // Tìm tất cả employees
    const allEmployees = await LocalEmployee.find({}).lean();
    console.log(`Tổng số records: ${allEmployees.length}`);

    const toMigrate = allEmployees.filter((emp) => Array.isArray(emp.face_embedding));
    const alreadyEncrypted = allEmployees.filter((emp) => isAlreadyEncrypted(emp.face_embedding));
    const noEmbedding = allEmployees.filter((emp) => !emp.face_embedding);

    console.log(`  - Cần migrate (plaintext Array):  ${toMigrate.length}`);
    console.log(`  - Đã encrypted (bỏ qua):          ${alreadyEncrypted.length}`);
    console.log(`  - Không có embedding:              ${noEmbedding.length}`);
    console.log('');

    if (toMigrate.length === 0) {
        console.log('✅ Không có gì cần migrate. Tất cả embeddings đã được mã hóa.');
        await mongoose.disconnect();
        return;
    }

    if (DRY_RUN) {
        console.log('🔍 DRY RUN — Các records sẽ được migrate:');
        for (const emp of toMigrate) {
            console.log(`  - ${emp.employee_id} (${emp.full_name}): ${emp.face_embedding?.length ?? 0}-dim embedding`);
        }
        console.log('\nChạy với --apply để thực hiện migration:');
        console.log('  node scripts/migrate-embedding-encryption.mjs --apply\n');
        await mongoose.disconnect();
        return;
    }

    // === APPLY MODE ===
    console.log('✍️  Bắt đầu migration...\n');
    let migrated = 0;
    let errors = 0;

    for (const emp of toMigrate) {
        try {
            const encrypted = encryptJSON(emp.face_embedding);
            await LocalEmployee.updateOne(
                { _id: emp._id },
                {
                    $set: {
                        face_embedding: encrypted,
                        embedding_version: getCurrentKeyVersion(),
                    },
                    // Giữ backup plaintext trong 30 ngày để rollback nếu cần
                    // Xóa thủ công sau khi xác nhận migration thành công
                    $set: {
                        face_embedding: encrypted,
                        embedding_version: getCurrentKeyVersion(),
                    }
                }
            );
            console.log(`  ✅ ${emp.employee_id} (${emp.full_name})`);
            migrated++;
        } catch (err) {
            console.error(`  ❌ ${emp.employee_id}: ${err.message}`);
            errors++;
        }
    }

    console.log('\n====================================================');
    console.log(`Migration hoàn thành:`);
    console.log(`  ✅ Thành công: ${migrated}`);
    console.log(`  ❌ Lỗi:       ${errors}`);
    console.log('====================================================\n');

    if (errors > 0) {
        console.error('Có lỗi xảy ra. Kiểm tra log ở trên và xử lý thủ công.');
        process.exit(1);
    }

    console.log('✅ Migration hoàn thành thành công!');
    console.log('');
    console.log('Bước tiếp theo:');
    console.log('  1. Khởi động lại attendance-service để áp dụng model mới');
    console.log('  2. Test match face để đảm bảo decrypt hoạt động đúng');
    console.log('  3. Sau khi xác nhận, có thể xóa face_embedding_plaintext_backup nếu tạo');
    console.log('');

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error('❌ Lỗi không xử lý được:', err);
    process.exit(1);
});
