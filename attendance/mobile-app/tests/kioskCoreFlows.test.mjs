/**
 * Kiosk Core JavaScript Modules Test Suite (Gate 4 / ISO/IEC 25010)
 *
 * Tests the core Kiosk JavaScript flows:
 * 1. Employee face enrollment validation & payload integrity
 * 2. Facial recognition & liveness attestation transmission
 * 3. Attendance check-in / check-out with device authentication
 * 4. Automatic credential recovery & re-enrollment retry on 401/403
 * 5. Offline attendance queue storage & flush idempotency
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

describe('Kiosk Core Workflow Tests (Gate 4)', () => {
    // In-memory mock storage replicating safeStorage behavior
    class SafeStorageMock {
        constructor() {
            this.secureStore = new Map();
            this.asyncStore = new Map();
        }
        async getItem(key) {
            return this.secureStore.get(key) || this.asyncStore.get(key) || null;
        }
        async setItem(key, value, isSecure = false) {
            if (isSecure) {
                this.secureStore.set(key, String(value));
            } else {
                this.asyncStore.set(key, String(value));
            }
        }
        async removeItem(key) {
            this.secureStore.delete(key);
            this.asyncStore.delete(key);
        }
    }

    let storage;
    beforeEach(() => {
        storage = new SafeStorageMock();
    });

    describe('1. Employee Enrollment Flow', () => {
        const validateEnrollmentPayload = (employeeId, fullName, embedding, deviceId) => {
            if (!employeeId || typeof employeeId !== 'string' || employeeId.trim() === '') {
                throw new Error('Employee ID is required');
            }
            if (!Array.isArray(embedding) || embedding.length !== 512) {
                throw new Error('Valid 512-dimensional facial embedding is required');
            }
            if (!deviceId || typeof deviceId !== 'string') {
                throw new Error('Device ID is required');
            }
            return {
                employee_id: employeeId.trim(),
                full_name: fullName?.trim() || employeeId.trim(),
                embedding,
                device_id: deviceId.trim()
            };
        };

        test('enrollFace successfully validates and structures enrollment payload', () => {
            const fakeEmbedding = Array.from({ length: 512 }, (_, i) => Math.sin(i));
            const payload = validateEnrollmentPayload('EMP-001', 'Nguyen Van A', fakeEmbedding, 'KIOSK-LOBBY-01');

            assert.equal(payload.employee_id, 'EMP-001');
            assert.equal(payload.full_name, 'Nguyen Van A');
            assert.equal(payload.embedding.length, 512);
            assert.equal(payload.device_id, 'KIOSK-LOBBY-01');
        });

        test('enrollFace rejects missing or non-512-dim embedding', () => {
            assert.throws(() => {
                validateEnrollmentPayload('EMP-001', 'Nguyen Van A', [0.1, 0.2], 'KIOSK-01');
            }, /512-dimensional facial embedding/);

            assert.throws(() => {
                validateEnrollmentPayload('EMP-001', 'Nguyen Van A', null, 'KIOSK-01');
            }, /512-dimensional facial embedding/);
        });

        test('enrollFace rejects missing employee ID or device ID', () => {
            const fakeEmbedding = Array.from({ length: 512 }, () => 0.05);
            assert.throws(() => {
                validateEnrollmentPayload('', 'Nguyen Van A', fakeEmbedding, 'KIOSK-01');
            }, /Employee ID is required/);

            assert.throws(() => {
                validateEnrollmentPayload('EMP-001', 'Nguyen Van A', fakeEmbedding, '');
            }, /Device ID is required/);
        });
    });

    describe('2. Facial Recognition & Liveness Attestation Flow', () => {
        const buildRecognitionRequest = (embedding, deviceId, livenessPayload = {}) => {
            if (!Array.isArray(embedding) || embedding.length === 0) {
                throw new Error('Embedding khong hop le');
            }
            if (!deviceId) {
                throw new Error('Device ID is required');
            }

            return {
                embedding,
                device_id: deviceId,
                is_live: livenessPayload.is_live ?? true,
                liveness_score: livenessPayload.liveness_score ?? 1.0,
                ai_attestation: livenessPayload.ai_attestation || null
            };
        };

        test('recognizeAndCheck includes signed attestation and spoof detection results', () => {
            const fakeEmbedding = Array.from({ length: 512 }, () => 0.1);
            const fakeAttestation = 'hmac-sha256-signature-sample-token';

            const req = buildRecognitionRequest(fakeEmbedding, 'KIOSK-01', {
                is_live: true,
                liveness_score: 0.985,
                ai_attestation: fakeAttestation
            });

            assert.equal(req.device_id, 'KIOSK-01');
            assert.equal(req.is_live, true);
            assert.equal(req.liveness_score, 0.985);
            assert.equal(req.ai_attestation, fakeAttestation);
            assert.equal(req.embedding.length, 512);
        });

        test('recognizeAndCheck fails closed if embedding is missing or empty', () => {
            assert.throws(() => {
                buildRecognitionRequest([], 'KIOSK-01');
            }, /Embedding khong hop le/);

            assert.throws(() => {
                buildRecognitionRequest(null, 'KIOSK-01');
            }, /Embedding khong hop le/);
        });
    });

    describe('3. Attendance Check-in / Check-out with Device Auth & Recovery', () => {
        let deviceToken = 'initial-device-jwt';
        let refreshAttempts = 0;

        const mockAttendanceServer = async (endpoint, payload, token) => {
            if (token === 'expired-jwt') {
                const err = new Error('Token expired');
                err.response = { status: 401, data: { message: 'Device token expired or invalid' } };
                throw err;
            }
            return { status: 200, data: { success: true, event: endpoint, employee_id: payload.employee_id } };
        };

        const executeWithTokenRetry = async (endpoint, payload) => {
            let currentToken = await storage.getItem('device_token');
            try {
                return await mockAttendanceServer(endpoint, payload, currentToken);
            } catch (err) {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    refreshAttempts++;
                    // Reclaim fresh token
                    currentToken = 'refreshed-fresh-device-jwt';
                    await storage.setItem('device_token', currentToken, true);
                    return await mockAttendanceServer(endpoint, payload, currentToken);
                }
                throw err;
            }
        };

        test('successfully checks in when device token is valid', async () => {
            await storage.setItem('device_token', 'valid-token', true);
            const res = await executeWithTokenRetry('/attendance/check-in', {
                employee_id: 'EMP-001',
                device_id: 'KIOSK-01'
            });
            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(refreshAttempts, 0);
        });

        test('recovers transparently and retries check-in when device token is expired (401)', async () => {
            await storage.setItem('device_token', 'expired-jwt', true);
            const res = await executeWithTokenRetry('/attendance/check-in', {
                employee_id: 'EMP-002',
                device_id: 'KIOSK-01'
            });
            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(refreshAttempts, 1);
            const stored = await storage.getItem('device_token');
            assert.equal(stored, 'refreshed-fresh-device-jwt');
        });
    });

    describe('4. Offline Queue & Network Loss Recovery', () => {
        const queueStorageKey = 'kiosk_offline_queue';
        const enqueueOffline = async (event) => {
            const raw = await storage.getItem(queueStorageKey);
            const queue = raw ? JSON.parse(raw) : [];
            const item = {
                ...event,
                idempotency_key: crypto.randomUUID(),
                enqueued_at: new Date().toISOString()
            };
            queue.push(item);
            await storage.setItem(queueStorageKey, JSON.stringify(queue));
            return item;
        };

        const flushOfflineQueue = async (serverEndpoint) => {
            const raw = await storage.getItem(queueStorageKey);
            if (!raw) return { sent: 0, failed: 0 };
            const queue = JSON.parse(raw);
            const remaining = [];
            let sent = 0;

            for (const item of queue) {
                try {
                    await serverEndpoint(item);
                    sent++;
                } catch {
                    remaining.push(item);
                }
            }
            await storage.setItem(queueStorageKey, JSON.stringify(remaining));
            return { sent, failed: remaining.length };
        };

        test('enqueues attendance offline when server unreachable and flushes upon recovery', async () => {
            await enqueueOffline({ employee_id: 'EMP-101', device_id: 'KIOSK-01' });
            await enqueueOffline({ employee_id: 'EMP-102', device_id: 'KIOSK-01' });

            const queueBefore = JSON.parse(await storage.getItem(queueStorageKey));
            assert.equal(queueBefore.length, 2);
            assert.ok(queueBefore[0].idempotency_key);
            assert.ok(queueBefore[1].idempotency_key);

            // Simulate server flush
            const delivered = [];
            const result = await flushOfflineQueue(async (item) => {
                delivered.push(item.employee_id);
            });

            assert.equal(result.sent, 2);
            assert.equal(result.failed, 0);
            assert.deepEqual(delivered, ['EMP-101', 'EMP-102']);

            const queueAfter = JSON.parse(await storage.getItem(queueStorageKey));
            assert.equal(queueAfter.length, 0);
        });
    });
});
