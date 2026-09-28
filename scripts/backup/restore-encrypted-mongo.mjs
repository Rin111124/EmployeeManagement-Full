#!/usr/bin/env node

/**
 * scripts/backup/restore-encrypted-mongo.mjs
 *
 * Restore an encrypted MongoDB backup archive.
 * Verifies SHA-256 checksum and AES-256-GCM auth tag before restoring.
 *
 * Usage:
 *   node scripts/backup/restore-encrypted-mongo.mjs <path-to-archive.enc>
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employee_management';
const BACKUP_KEY = process.env.BACKUP_ENCRYPTION_KEY || process.env.APP_ENCRYPTION_KEY || 'default-backup-secure-key-32bytes-min';

async function performRestore(archivePath) {
    if (!archivePath || !fs.existsSync(archivePath)) {
        throw new Error(`Archive file not found: ${archivePath}`);
    }

    const payload = fs.readFileSync(archivePath);
    if (payload.length < 28) {
        throw new Error('Corrupt or invalid backup file: file is too small');
    }

    // 1. Verify metadata checksum if available
    const metaPath = archivePath.replace(/\.enc$/, '.meta.json');
    if (fs.existsSync(metaPath)) {
        const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const calculatedHash = crypto.createHash('sha256').update(payload).digest('hex');
        if (metadata.sha256 && metadata.sha256 !== calculatedHash) {
            throw new Error(`Checksum mismatch! File may be corrupted or tampered. Expected ${metadata.sha256}, calculated ${calculatedHash}`);
        }
        console.log(`[RESTORE] Integrity check passed (SHA256 verified).`);
    }

    // 2. Decrypt AES-256-GCM
    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const ciphertext = payload.subarray(28);

    const key = crypto.createHash('sha256').update(BACKUP_KEY).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const compressed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    // 3. Decompress JSON
    const decompressed = zlib.gunzipSync(compressed);
    const backupData = JSON.parse(decompressed.toString('utf8'));

    console.log(`[RESTORE] Archive timestamp: ${backupData.timestamp}`);
    console.log(`[RESTORE] Target database: ${MONGODB_URI}`);

    await mongoose.connect(MONGODB_URI);
    try {
        for (const [colName, docs] of Object.entries(backupData.collections)) {
            const col = mongoose.connection.db.collection(colName);
            await col.deleteMany({});
            if (docs.length > 0) {
                await col.insertMany(docs);
            }
            console.log(`[RESTORE]   - ${colName}: restored ${docs.length} documents.`);
        }
        console.log(`[RESTORE] ✅ Restore drill completed successfully.`);
    } finally {
        await mongoose.disconnect();
    }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    const targetArchive = process.argv[2];
    if (!targetArchive) {
        console.error('Usage: node scripts/backup/restore-encrypted-mongo.mjs <path-to-archive.enc>');
        process.exit(1);
    }
    performRestore(targetArchive).catch((err) => {
        console.error('[RESTORE] ❌ Restore failed:', err);
        process.exit(1);
    });
}

export { performRestore };
