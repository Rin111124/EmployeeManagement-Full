const { purgeTerminatedBiometrics } = require('../services/retention.service');

function startRetentionWorker(intervalMs = 24 * 60 * 60 * 1000) {
    let running = false;
    const run = async () => {
        if (running) return;
        running = true;
        try {
            const result = await purgeTerminatedBiometrics(null, null);
            if (result.purged_count) {
                console.info(`[RETENTION] Purged biometrics for ${result.purged_count} terminated employee(s).`);
            }
        } catch (error) {
            console.error('[RETENTION] Biometric retention job failed:', error.message);
        } finally {
            running = false;
        }
    };
    const initialTimer = setTimeout(run, 30_000);
    const interval = setInterval(run, intervalMs);
    initialTimer.unref?.();
    interval.unref?.();
    return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
    };
}

module.exports = { startRetentionWorker };
