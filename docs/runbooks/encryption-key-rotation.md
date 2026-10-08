# Application Encryption Key Rotation

This runbook rotates biometric and other application-level ciphertext from one
`APP_ENCRYPTION_KEY` version to another. Backup encryption uses the separate
`BACKUP_ENCRYPTION_KEY` and is not rotated by these steps.

## Rotation procedure

1. Take and verify an encrypted database backup. Keep the old application key
   available in the secret manager so existing data and backups remain readable.
2. Generate a new key with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. Configure both admin-backend and attendance-service with the same key ring:
   set `APP_ENCRYPTION_KEY_VERSION=v2`, set `APP_ENCRYPTION_KEY` to the new key,
   and set `APP_ENCRYPTION_KEY_V1` to the old key. Restart both services. New
   ciphertext is written as `v2`; `v1` ciphertext remains readable.
4. In staging, run both migrations without `--apply` and review the counts:
   - `node admin-system/backend/scripts/migrateFaceEmbeddingsToEncrypted.js`
   - `node attendance-system/attendance-service/scripts/maintenance/migrateLocalFaceEmbeddingsToEncrypted.js`
5. Run both commands again with `--apply`, then run them without `--apply`.
   The second dry run must report zero fields to migrate. Verify registration,
   recognition, employee reads, and attendance sync in staging.
6. Repeat with a maintenance window in production. Keep `APP_ENCRYPTION_KEY_V1`
   until every production ciphertext has been migrated and every backup that
   contains `v1` data has expired or been re-encrypted and restore-tested.

Do not remove the old key based only on service health: old database snapshots
and encrypted backups may still contain `v1` ciphertext.
