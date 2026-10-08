#!/usr/bin/env node

/**
 * scripts/backup/backup-encrypted-mongo.mjs
 *
 * Automated, Cross-Platform Encrypted MongoDB Backup Utility.
 * - Dumps MongoDB collections to compressed JSON archive
 * - Encrypts the archive using AES-256-GCM
 * - Computes SHA-256 checksum for integrity verification
 *
 * Usage:
 *   node scripts/backup/backup-encrypted-mongo.mjs [--out=./backups]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { deriveBackupKey } from './backup-key.mjs';
import { encryptBackupArchive } from './backup-archive.mjs';

const _require = createRequire(import.meta.url);
const mongoose = (() => {
    try { return _require('mongoose'); } catch {
        try { return _require(path.resolve(process.cwd(), 'packages/backend/node_modules/mongoose')); } catch {
            return _require('../../packages/backend/node_modules/mongoose');
        }
    }
})();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employee_management';

async function performBackup(targetUri = null) {
    const mongoUri = targetUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employee_management';
    const key = deriveBackupKey();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = process.env.BACKUP_OUT_DIR || path.join(process.cwd(), 'backups');

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    console.log(`[BACKUP] Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`[BACKUP] Found ${collections.length} collections.`);

        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            database: mongoose.connection.db.databaseName,
            collections: {},
        };

        for (const col of collections) {
            const name = col.name;
            if (name.startsWith('system.')) continue;

            const docs = await mongoose.connection.db.collection(name).find({}).toArray();
            backupData.collections[name] = docs;
            console.log(`[BACKUP]   - ${name}: ${docs.length} documents`);
        }

        // 1. Serialize and encrypt using the shared versioned backup format.
        const jsonBuffer = Buffer.from(JSON.stringify(backupData), 'utf8');
        const encrypted = encryptBackupArchive(jsonBuffer, key);

        const archiveFilename = `mongo-backup-${timestamp}.enc`;
        const archivePath = path.join(outDir, archiveFilename);

        const payload = encrypted;
        fs.writeFileSync(archivePath, payload);

        // 3. Compute Checksum & Metadata
        const checksum = crypto.createHash('sha256').update(payload).digest('hex');
        const metadata = {
            filename: archiveFilename,
            timestamp: backupData.timestamp,
            sizeBytes: payload.length,
            sha256: checksum,
            collectionsCount: Object.keys(backupData.collections).length,
            documentCounts: Object.fromEntries(
                Object.entries(backupData.collections).map(([k, v]) => [k, v.length])
            ),
        };

        const metaPath = path.join(outDir, `mongo-backup-${timestamp}.meta.json`);
        fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

        console.log(`[BACKUP] âœ… Backup completed successfully:`);
        console.log(`[BACKUP]   - Archive: ${archivePath} (${(payload.length / 1024).toFixed(2)} KB)`);
        console.log(`[BACKUP]   - SHA256:  ${checksum}`);
        console.log(`[BACKUP]   - Metadata: ${metaPath}`);

        return { archivePath, metaPath, checksum };
    } finally {
        await mongoose.disconnect();
    }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    performBackup().catch((err) => {
        console.error('[BACKUP] âŒ Backup failed:', err);
        process.exit(1);
    });
}

export { performBackup };

