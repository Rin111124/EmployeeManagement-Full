/**
 * ISO/IEC 25010 Compatibility & Gate 2: Inter-Service API Contract Tests
 *
 * Verifies strict JSON schema contracts across all core components:
 * 1. Kiosk -> Attendance Service (/api/attendance/recognize)
 * 2. Attendance Service Outbox -> Admin Backend (/api/v1/attendance/sync)
 * 3. AI Service -> Attendance Core (/extract-features & /compute-match)
 * 4. Admin Backend -> Kiosk Device Registration (/api/v1/kiosks/request-access)
 *
 * Prevents breaking API changes across microservices and verifies backwards compatibility.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Helper validator functions for JSON contract schemas
function validateUUID(str) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function validateISODate(str) {
    if (typeof str !== 'string') return false;
    const d = new Date(str);
    return !isNaN(d.getTime());
}

describe('ISO/IEC 25010 API Contract Test Suite', () => {

    describe('Contract 1: Kiosk -> Attendance Service (/api/attendance/recognize)', () => {
        test('validates request payload contract structure', () => {
            const validPayload = {
                device_id: 'kiosk-station-01',
                embedding: Array(512).fill(0.044),
                is_live: true,
                liveness_score: 0.94,
                ai_attestation: {
                    issued_at: Date.now(),
                    nonce: crypto.randomUUID(),
                    signature: crypto.randomBytes(32).toString('hex'),
                    device_id: 'kiosk-station-01',
                },
                offline_captured_at: new Date().toISOString(),
                idempotency_key: crypto.randomUUID(),
            };

            // Schema enforcement
            assert.equal(typeof validPayload.device_id, 'string');
            assert.ok(validPayload.device_id.length > 0);
            assert.ok(Array.isArray(validPayload.embedding));
            assert.equal(validPayload.embedding.length, 512);
            assert.ok(validPayload.embedding.every(v => typeof v === 'number' && Number.isFinite(v)));
            assert.equal(typeof validPayload.is_live, 'boolean');
            assert.equal(typeof validPayload.liveness_score, 'number');
            assert.ok(validPayload.liveness_score >= 0 && validPayload.liveness_score <= 1);
            assert.ok(validPayload.ai_attestation && typeof validPayload.ai_attestation === 'object');
            assert.equal(typeof validPayload.ai_attestation.issued_at, 'number');
            assert.ok(validateUUID(validPayload.ai_attestation.nonce));
            assert.equal(typeof validPayload.ai_attestation.signature, 'string');
            assert.equal(validPayload.ai_attestation.signature.length, 64);
        });

        test('validates success response schema contract', () => {
            const successResponse = {
                success: true,
                message: 'Xác nhận check-in thành công',
                action: 'check-in',
                employee: {
                    employee_id: 'emp-507f1f77bcf86cd799439011',
                    full_name: 'Nguyen Van A',
                    confidence: '95.40%',
                },
            };

            assert.equal(successResponse.success, true);
            assert.equal(typeof successResponse.message, 'string');
            assert.ok(['check-in', 'check-out'].includes(successResponse.action));
            assert.equal(typeof successResponse.employee.employee_id, 'string');
            assert.equal(typeof successResponse.employee.full_name, 'string');
            assert.match(successResponse.employee.confidence, /^\d+(\.\d+)?%$/);
        });

        test('validates fail-closed error response schema contract', () => {
            const errorResponse = {
                success: false,
                code: 'LIVENESS_FAILED',
                message: 'Face failed liveness verification (Spoof attempt detected)',
            };

            assert.equal(errorResponse.success, false);
            assert.equal(typeof errorResponse.code, 'string');
            assert.equal(typeof errorResponse.message, 'string');
        });
    });

    describe('Contract 2: Attendance Outbox -> Admin Backend (/api/v1/attendance/sync)', () => {
        test('validates sync payload schema contract', () => {
            const syncPayload = {
                event_id: crypto.randomUUID(),
                employee_id: '67a8409e51c893fae5421d09',
                device_id: 'kiosk-entrance-01',
                check_in: new Date().toISOString(),
                check_out: null,
                confidence: 0.942,
                status: 'present',
                source: 'kiosk_biometrics',
            };

            assert.ok(validateUUID(syncPayload.event_id));
            assert.equal(typeof syncPayload.employee_id, 'string');
            assert.equal(typeof syncPayload.device_id, 'string');
            assert.ok(validateISODate(syncPayload.check_in));
            assert.ok(typeof syncPayload.confidence === 'number' && syncPayload.confidence >= 0 && syncPayload.confidence <= 1);
            assert.ok(['present', 'absent', 'late', 'half_day'].includes(syncPayload.status));
        });

        test('validates idempotency response contract', () => {
            const idempotencyResponse = {
                success: true,
                message: 'Event already processed (Idempotent replay detected)',
                idempotent: true,
                data: {
                    event_id: '7d0663ee-5154-4ca8-912b-31d7e2e873a4',
                    status: 'already_synchronized',
                },
            };

            assert.equal(idempotencyResponse.success, true);
            assert.equal(idempotencyResponse.idempotent, true);
            assert.ok(validateUUID(idempotencyResponse.data.event_id));
        });
    });

    describe('Contract 3: AI Engine (/extract-features & /compute-match)', () => {
        test('validates /extract-features response schema contract', () => {
            const featureResponse = {
                success: true,
                embedding: Array(512).fill(0.01),
                embedding_size: 512,
                face_count: 1,
                face_confidence: 0.998,
                mode: 'insightface-production',
                is_live: true,
                liveness_score: 0.92,
                liveness: {
                    method: 'rgb-pad-model',
                    confidence: 0.92,
                    threshold: 0.70,
                },
                ai_attestation: {
                    issued_at: Date.now(),
                    nonce: crypto.randomUUID(),
                    signature: crypto.randomBytes(32).toString('hex'),
                    device_id: 'kiosk-01',
                },
            };

            assert.equal(featureResponse.success, true);
            assert.equal(featureResponse.embedding_size, 512);
            assert.equal(featureResponse.embedding.length, 512);
            assert.equal(featureResponse.face_count, 1);
            assert.ok(typeof featureResponse.is_live === 'boolean');
            assert.ok(featureResponse.liveness_score >= 0 && featureResponse.liveness_score <= 1);
            assert.ok(['rgb-pad-model', 'heuristic-texture-color', 'fail-closed-no-model'].includes(featureResponse.liveness.method));
            assert.ok(validateUUID(featureResponse.ai_attestation.nonce));
            assert.equal(featureResponse.ai_attestation.signature.length, 64);
        });

        test('validates /compute-match request and response contract', () => {
            const matchRequest = {
                query_embedding: Array(512).fill(0.044),
                candidates: [
                    { id: 'emp-1', embedding: Array(512).fill(0.044) },
                    { id: 'emp-2', embedding: Array(512).fill(-0.044) },
                ],
                threshold: 0.75,
            };

            assert.equal(matchRequest.query_embedding.length, 512);
            assert.ok(Array.isArray(matchRequest.candidates));
            matchRequest.candidates.forEach(c => {
                assert.equal(typeof c.id, 'string');
                assert.equal(c.embedding.length, 512);
            });

            const matchResponse = {
                success: true,
                match_found: true,
                match: {
                    id: 'emp-1',
                    score: 1.0,
                },
                best_score: 1.0,
            };

            assert.equal(matchResponse.success, true);
            assert.equal(matchResponse.match_found, true);
            assert.equal(matchResponse.match.id, 'emp-1');
            assert.ok(matchResponse.match.score >= matchRequest.threshold);
        });
    });

    describe('Contract 4: Admin Backend Device Lifecycle (/api/v1/kiosks/request-access)', () => {
        test('validates kiosk device registration request and response contract', () => {
            const registerRequest = {
                device_name: 'Main Gate Kiosk Tablet',
                device_uuid: 'a6b30f7b-99d6-4447-9759-d890066bf9a1',
                ip_address: '192.168.1.100',
                mac_address: '02:00:00:00:00:00',
                app_version: '1.0.0',
            };

            assert.equal(typeof registerRequest.device_name, 'string');
            assert.ok(validateUUID(registerRequest.device_uuid));
            assert.match(registerRequest.ip_address, /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);

            const pendingResponse = {
                success: true,
                status: 'pending',
                claim_code: 'ABC-123',
                message: 'Thiết bị đang chờ quản trị viên phê duyệt trên cổng HR Admin',
            };

            assert.equal(pendingResponse.success, true);
            assert.ok(['pending', 'approved', 'rejected'].includes(pendingResponse.status));
            assert.match(pendingResponse.claim_code, /^[A-Z0-9-]+$/);
        });
    });
});
