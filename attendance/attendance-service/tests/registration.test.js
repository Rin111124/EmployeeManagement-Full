process.env.NODE_ENV = 'test';

const request = require('supertest');
const { describe, test } = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const LocalEmployee = require('../src/models/LocalEmployee');

let mongo;

test.before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
});

test.afterEach(async () => {
    await LocalEmployee.deleteMany({});
});

test.after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});

function expect(value) {
    return {
        toBe(expected) {
            if (value !== expected) {
                throw new Error(`Expected ${value} to be ${expected}`);
            }
        },
        toBeDefined() {
            if (value === undefined) {
                throw new Error('Expected value to be defined');
            }
        },
        toBeGreaterThan(expected) {
            if (!(value > expected)) {
                throw new Error(`Expected ${value} to be greater than ${expected}`);
            }
        },
        toContain(expected) {
            if (!String(value).includes(expected)) {
                throw new Error(`Expected ${value} to contain ${expected}`);
            }
        },
    };
}

function unitEmbedding(seed = 1) {
    const vector = Array.from({ length: 512 }, (_, index) => ((index + seed) % 17) - 8);
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return vector.map((value) => value / norm);
}

function shiftedEmbedding(seed = 1, shift = 0.01) {
    return unitEmbedding(seed).map((value, index) => (index === 0 ? value + shift : value));
}

describe('Face Registration and Matching', () => {
    describe('POST /api/registration/enroll', () => {
        test('should successfully enroll a new employee face', async () => {
            const embedding = unitEmbedding(1);

            const response = await request(app)
                .post('/api/registration/enroll')
                .send({
                    employee_id: '507f1f77bcf86cd799439011',
                    full_name: 'John Doe',
                    embedding,
                    device_id: 'device-123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.employee_id).toBe('507f1f77bcf86cd799439011');

            // Verify in database
            const saved = await LocalEmployee.findOne({
                employee_id: '507f1f77bcf86cd799439011'
            });
            expect(saved).toBeDefined();
            expect(saved.face_embedding.length).toBe(512);
        });

        test('should reject invalid embedding - wrong dimension', async () => {
            const response = await request(app)
                .post('/api/registration/enroll')
                .send({
                    employee_id: '507f1f77bcf86cd799439011',
                    full_name: 'John Doe',
                    embedding: [0.1, 0.2, 0.3] // Only 3 dims, should be 512
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid embedding');
        });

        test('should reject missing employee_id', async () => {
            const embedding = unitEmbedding(1);

            const response = await request(app)
                .post('/api/registration/enroll')
                .send({
                    full_name: 'John Doe',
                    embedding
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should reject missing embedding', async () => {
            const response = await request(app)
                .post('/api/registration/enroll')
                .send({
                    employee_id: '507f1f77bcf86cd799439011',
                    full_name: 'John Doe'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should update existing employee face', async () => {
            const oldEmbedding = unitEmbedding(1);
            const newEmbedding = unitEmbedding(2);

            // First enrollment
            await request(app)
                .post('/api/registration/enroll')
                .send({
                    employee_id: '507f1f77bcf86cd799439011',
                    full_name: 'John Doe',
                    embedding: oldEmbedding
                });

            // Second enrollment with different embedding
            const response = await request(app)
                .post('/api/registration/enroll')
                .send({
                    employee_id: '507f1f77bcf86cd799439011',
                    full_name: 'John Doe Updated',
                    embedding: newEmbedding
                });

            expect(response.status).toBe(200);

            // Verify updated in database
            const saved = await LocalEmployee.findOne({
                employee_id: '507f1f77bcf86cd799439011'
            });
            expect(saved.full_name).toBe('John Doe Updated');
            expect(saved.face_embedding[0]).toBe(newEmbedding[0]);
        });
    });

    describe('POST /api/registration/match', () => {
        test('should match an exact embedding', async () => {
            const embedding = unitEmbedding(1);

            // Setup: enroll employee
            await request(app)
                .post('/api/registration/enroll')
                .send({
                    employee_id: '507f1f77bcf86cd799439011',
                    full_name: 'John Doe',
                    embedding
                });

            // Try to match the exact same embedding
            const response = await request(app)
                .post('/api/registration/match')
                .send({ embedding })
                .query({ confidence_threshold: 0.9 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.employee_id).toBe('507f1f77bcf86cd799439011');
            expect(response.body.data.confidence).toBeGreaterThan(0.99);
        });

        test('should reject unknown face above threshold', async () => {
            // Setup: enroll one employee
            const embedding1 = unitEmbedding(1);
            await request(app)
                .post('/api/registration/enroll')
                .send({
                    employee_id: '507f1f77bcf86cd799439011',
                    full_name: 'John Doe',
                    embedding: embedding1
                });

            // Try to match a very different embedding
            const embedding2 = unitEmbedding(9);

            const response = await request(app)
                .post('/api/registration/match')
                .send({ embedding: embedding2 })
                .query({ confidence_threshold: 0.99 });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('No matching face');
        });

        test('should find best match among multiple enrollments', async () => {
            // Enroll 3 employees
            const embeddings = [
                unitEmbedding(1),
                unitEmbedding(2),
                unitEmbedding(3)
            ];

            for (let i = 0; i < 3; i++) {
                await request(app)
                    .post('/api/registration/enroll')
                    .send({
                        employee_id: `emp-${i}`,
                        full_name: `Employee ${i}`,
                        embedding: embeddings[i]
                    });
            }

            // Query with embedding similar to emp-1
            const queryEmbedding = embeddings[1];

            const response = await request(app)
                .post('/api/registration/match')
                .send({ embedding: queryEmbedding })
                .query({ confidence_threshold: 0.5 });

            expect(response.status).toBe(200);
            expect(response.body.data.employee_id).toBe('emp-1');
        });

        test('should return error when no enrollments exist', async () => {
            const embedding = unitEmbedding(1);

            const response = await request(app)
                .post('/api/registration/match')
                .send({ embedding });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('No enrolled employees');
        });

        test('should reject invalid embedding dimension', async () => {
            const response = await request(app)
                .post('/api/registration/match')
                .send({ embedding: [0.1, 0.2] });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid embedding');
        });

        test('should reject invalid threshold', async () => {
            const embedding = unitEmbedding(1);

            const response = await request(app)
                .post('/api/registration/match')
                .send({ embedding })
                .query({ confidence_threshold: 1.5 });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('threshold must be between 0 and 1');
        });

        test('should respect confidence threshold', async () => {
            const embedding = unitEmbedding(1);

            await request(app)
                .post('/api/registration/enroll')
                .send({
                    employee_id: 'emp-1',
                    full_name: 'Employee 1',
                    embedding
                });

            // Match with high threshold - should fail
            const response1 = await request(app)
                .post('/api/registration/match')
                .send({
                    embedding: shiftedEmbedding(1, 0.5)
                })
                .query({ confidence_threshold: 0.99 });

            expect(response1.status).toBe(404);

            // Match with low threshold - should succeed
            const response2 = await request(app)
                .post('/api/registration/match')
                .send({
                    embedding: shiftedEmbedding(1, 0.5)
                })
                .query({ confidence_threshold: 0.5 });

            expect(response2.status).toBe(200);
        });

        test('should return top match even when below threshold', async () => {
            const embedding = unitEmbedding(1);

            await request(app)
                .post('/api/registration/enroll')
                .send({
                    employee_id: 'emp-1',
                    full_name: 'Employee 1',
                    embedding
                });

            const response = await request(app)
                .post('/api/registration/match')
                .send({
                    embedding: unitEmbedding(9)
                })
                .query({ confidence_threshold: 0.99 });

            expect(response.status).toBe(404);
            expect(response.body.top_match).toBeDefined();
            expect(response.body.top_match.employee_id).toBe('emp-1');
        });

        test('should handle missing embedding in request', async () => {
            const response = await request(app)
                .post('/api/registration/match')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Missing embedding');
        });
    });

    describe('Rate Limiting', () => {
        test('should rate limit excessive enroll requests', async () => {
            const embedding = unitEmbedding(1);

            // Make 6 requests (limit is 5 per minute)
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/api/registration/enroll')
                    .set('x-enable-rate-limit', '1')
                    .send({
                        employee_id: `emp-${i}`,
                        full_name: `Employee ${i}`,
                        embedding
                    });
            }

            // 6th request should be rate limited
            const response = await request(app)
                .post('/api/registration/enroll')
                .set('x-enable-rate-limit', '1')
                .send({
                    employee_id: 'emp-6',
                    full_name: 'Employee 6',
                    embedding
                });

            expect(response.status).toBe(429); // Too Many Requests
        });

        test('should rate limit excessive match requests', async () => {
            const embedding = unitEmbedding(1);

            // Make 20 requests (limit is 20 per minute)
            for (let i = 0; i < 20; i++) {
                await request(app)
                    .post('/api/registration/match')
                    .set('x-enable-rate-limit', '1')
                    .send({ embedding });
            }

            // 21st request should be rate limited
            const response = await request(app)
                .post('/api/registration/match')
                .set('x-enable-rate-limit', '1')
                .send({ embedding });

            expect(response.status).toBe(429); // Too Many Requests
        });
    });
});
