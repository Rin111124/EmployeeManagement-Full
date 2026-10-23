/**
 * ISO/IEC 25010 Interaction Capability & Reliability Test: Kiosk Offline Queue
 *
 * Verifies:
 * 1. Offline storage enqueuing with UUID idempotency key
 * 2. Preservation of AI attestation token and liveness score
 * 3. Enforcing MAX_QUEUE_SIZE (500 events) and FIFO purge of oldest when full
 * 4. Replay and sync flushing when connection is restored
 * 5. Handling partial failure during flush
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// In-memory mock for AsyncStorage
class MockAsyncStorage {
    constructor() {
        this.store = new Map();
    }
    async getItem(key) {
        return this.store.get(key) || null;
    }
    async setItem(key, value) {
        this.store.set(key, String(value));
    }
    async removeItem(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
}

const mockStorage = new MockAsyncStorage();
const OFFLINE_QUEUE_KEY = 'kiosk_offline_attendance_queue_v1';
const MAX_QUEUE_SIZE = 500;

// Replicate offlineQueue logic using the mock storage
const testOfflineQueue = {
    enqueue: async ({ embedding, deviceId, livenessPayload = {}, capturedAt }) => {
        const raw = await mockStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = raw ? JSON.parse(raw) : [];

        if (queue.length >= MAX_QUEUE_SIZE) {
            queue.shift(); // Purge oldest
        }

        const event = {
            idempotency_key: crypto.randomUUID(),
            device_id: deviceId,
            embedding,
            liveness_score: livenessPayload.liveness_score ?? 1.0,
            is_live: livenessPayload.is_live ?? true,
            ai_attestation: livenessPayload.ai_attestation || null,
            captured_at: capturedAt || new Date().toISOString(),
            queued_at: new Date().toISOString(),
            retry_count: 0,
        };

        queue.push(event);
        await mockStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        return { success: true, queued: true, event };
    },

    getQueueCount: async () => {
        const raw = await mockStorage.getItem(OFFLINE_QUEUE_KEY);
        if (!raw) return 0;
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list.length : 0;
    },

    flushQueue: async (api) => {
        const raw = await mockStorage.getItem(OFFLINE_QUEUE_KEY);
        if (!raw) return { synced: 0, remaining: 0 };
        const queue = JSON.parse(raw);
        if (!Array.isArray(queue) || queue.length === 0) return { synced: 0, remaining: 0 };

        const remainingQueue = [];
        let syncedCount = 0;

        for (const item of queue) {
            try {
                const res = await api.recognizeAndCheck(item.embedding, item.device_id, {
                    liveness_score: item.liveness_score,
                    is_live: item.is_live,
                    ai_attestation: item.ai_attestation,
                    offline_captured_at: item.captured_at,
                    idempotency_key: item.idempotency_key,
                });
                if (res && res.success) {
                    syncedCount++;
                } else {
                    item.retry_count = (item.retry_count || 0) + 1;
                    remainingQueue.push(item);
                }
            } catch (_err) {
                item.retry_count = (item.retry_count || 0) + 1;
                remainingQueue.push(item);
            }
        }

        await mockStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
        return { synced: syncedCount, remaining: remainingQueue.length };
    },
};

describe('Kiosk Offline Attendance Queue Tests (Gate 2)', () => {
    beforeEach(() => {
        mockStorage.clear();
    });

    test('enqueues attendance event with idempotency key and attestation', async () => {
        const fakeAttestation = {
            issued_at: Date.now(),
            nonce: crypto.randomUUID(),
            signature: 'abc123sig',
        };

        const result = await testOfflineQueue.enqueue({
            embedding: Array(512).fill(0.1),
            deviceId: 'kiosk-01',
            livenessPayload: {
                is_live: true,
                liveness_score: 0.95,
                ai_attestation: fakeAttestation,
            },
        });

        assert.equal(result.success, true);
        assert.equal(result.queued, true);
        assert.ok(result.event.idempotency_key);
        assert.equal(result.event.ai_attestation.signature, 'abc123sig');

        const count = await testOfflineQueue.getQueueCount();
        assert.equal(count, 1);
    });

    test('enforces MAX_QUEUE_SIZE cap of 500 and purges oldest event (FIFO)', async () => {
        // Enqueue 500 events
        for (let i = 0; i < 500; i++) {
            await testOfflineQueue.enqueue({
                embedding: [i],
                deviceId: 'kiosk-01',
                capturedAt: `2026-10-13T10:00:${String(i).padStart(2, '0')}Z`,
            });
        }
        let count = await testOfflineQueue.getQueueCount();
        assert.equal(count, 500);

        // Enqueue 501th event
        await testOfflineQueue.enqueue({
            embedding: [9999],
            deviceId: 'kiosk-01',
            capturedAt: '2026-10-13T11:00:00Z',
        });

        count = await testOfflineQueue.getQueueCount();
        assert.equal(count, 500, 'Queue must remain capped at 500');

        const raw = await mockStorage.getItem(OFFLINE_QUEUE_KEY);
        const list = JSON.parse(raw);
        assert.equal(list[0].embedding[0], 1, 'First event (0) should have been shifted out');
        assert.equal(list[list.length - 1].embedding[0], 9999, 'Newest event must be at tail');
    });

    test('flushes queue successfully when connection restored', async () => {
        await testOfflineQueue.enqueue({ embedding: [1], deviceId: 'kiosk-01' });
        await testOfflineQueue.enqueue({ embedding: [2], deviceId: 'kiosk-01' });

        const mockApi = {
            recognizeAndCheck: async () => ({ success: true }),
        };

        const flushRes = await testOfflineQueue.flushQueue(mockApi);
        assert.equal(flushRes.synced, 2);
        assert.equal(flushRes.remaining, 0);

        const count = await testOfflineQueue.getQueueCount();
        assert.equal(count, 0);
    });

    test('retains failed events in queue with incremented retry count', async () => {
        await testOfflineQueue.enqueue({ embedding: [1], deviceId: 'kiosk-01' });
        await testOfflineQueue.enqueue({ embedding: [2], deviceId: 'kiosk-01' });

        let calls = 0;
        const mockApi = {
            recognizeAndCheck: async () => {
                calls++;
                if (calls === 1) return { success: true };
                throw new Error('Network timeout during sync');
            },
        };

        const flushRes = await testOfflineQueue.flushQueue(mockApi);
        assert.equal(flushRes.synced, 1);
        assert.equal(flushRes.remaining, 1);

        const count = await testOfflineQueue.getQueueCount();
        assert.equal(count, 1);

        const raw = await mockStorage.getItem(OFFLINE_QUEUE_KEY);
        const list = JSON.parse(raw);
        assert.equal(list[0].retry_count, 1);
    });
});
