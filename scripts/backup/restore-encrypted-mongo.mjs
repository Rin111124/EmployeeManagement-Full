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
import { createRequire } from 'module';
import { deriveBackupKey } from './backup-key.mjs';
import { decryptBackupArchive } from './backup-archive.mjs';

const _require = createRequire(import.meta.url);
const mongoose = (() => {
    try { return _require('mongoose'); } catch {
        try { return _require(path.resolve(process.cwd(), 'packages/backend/node_modules/mongoose')); } catch {
            return _require('../../packages/backend/node_modules/mongoose');
        }
    }
})();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employee_management';

async function performRestore(archivePath, targetUri = null) {
    const mongoUri = targetUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employee_management';
    const key = deriveBackupKey();
    if (!archivePath || !fs.existsSync(archivePath)) {
        throw new Error(`Archive file not found: ${archivePath}`);
    }

    const payload = fs.readFileSync(archivePath);
    if (payload.length < 33) throw new Error('Corrupt or invalid backup file: file is too small');

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

    // 2. Authenticate, decrypt, decompress, and parse the versioned archive.
    const decrypted = decryptBackupArchive(payload, key);
    const backupData = JSON.parse(decrypted.toString('utf8'));

    console.log(`[RESTORE] Archive timestamp: ${backupData.timestamp}`);
    console.log(`[RESTORE] Target database: ${mongoUri}`);

    await mongoose.connect(mongoUri);
    try {
        for (const [colName, docs] of Object.entries(backupData.collections)) {
            const col = mongoose.connection.db.collection(colName);
            await col.deleteMany({});
            if (docs.length > 0) {
                await col.insertMany(docs);
            }
            console.log(`[RESTORE]   - ${colName}: restored ${docs.length} documents.`);
        }
        console.log(`[RESTORE] âœ… Restore drill completed successfully.`);
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
        console.error('[RESTORE] âŒ Restore failed:', err);
        process.exit(1);
    });
}

export { performRestore };

