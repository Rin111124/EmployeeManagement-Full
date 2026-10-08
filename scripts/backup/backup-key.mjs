import crypto from 'crypto';

export function deriveBackupKey(environment = process.env) {
    const secret = environment.BACKUP_ENCRYPTION_KEY;
    if (typeof secret !== 'string' || !/^[a-f0-9]{64}$/i.test(secret)) {
        throw new Error(
            'Set BACKUP_ENCRYPTION_KEY to 32 cryptographically random bytes encoded as 64 hex characters; no default backup key is allowed.'
        );
    }

    // Derive a fixed-size AES key while keeping backup encryption isolated
    // from APP_ENCRYPTION_KEY, which protects application-level biometrics.
    return crypto.createHash('sha256').update(secret, 'utf8').digest();
}
