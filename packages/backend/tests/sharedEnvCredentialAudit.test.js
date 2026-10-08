process.env.NODE_ENV = 'test';

const { describe, test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

describe('Security Audit: Seed & Shared Environment Credential Protection (P1-QA-06)', () => {
    after(async () => {
        await mongoose.disconnect();
    });
    test('AUDIT-01: seedDemo rejects execution in staging or production', async () => {
        const seedDemo = require('../scripts/seedDemo');

        // Test with production
        const originalEnv = process.env.NODE_ENV;
        try {
            process.env.NODE_ENV = 'production';
            await assert.rejects(
                async () => {
                    await seedDemo();
                },
                /strictly prohibited in production or staging/
            );

            // Test with staging
            process.env.NODE_ENV = 'staging';
            await assert.rejects(
                async () => {
                    await seedDemo();
                },
                /strictly prohibited in production or staging/
            );
        } finally {
            process.env.NODE_ENV = originalEnv;
        }
    });

    test('AUDIT-02: seedAdmin rejects known default/weak passwords in staging or production', async () => {
        const seedAdmin = require('../scripts/seedAdmin');
        const originalEnv = process.env.NODE_ENV;
        const originalPw = process.env.ADMIN_PASSWORD;

        try {
            process.env.NODE_ENV = 'staging';
            process.env.ADMIN_PASSWORD = 'Admin@123456';

            await assert.rejects(
                async () => {
                    await seedAdmin();
                },
                /Using default\/known credentials in staging or production is strictly forbidden/
            );

            process.env.ADMIN_PASSWORD = 'password123';
            await assert.rejects(
                async () => {
                    await seedAdmin();
                },
                /Using default\/known credentials in staging or production is strictly forbidden/
            );
        } finally {
            process.env.NODE_ENV = originalEnv;
            process.env.ADMIN_PASSWORD = originalPw;
        }
    });

    test('AUDIT-03: env configuration files do not expose live credentials in shared examples', () => {
        const backendDir = path.resolve(__dirname, '..');
        const stagingExamplePath = path.join(backendDir, '.env.staging.example');
        const prodExamplePath = path.join(backendDir, '.env.production.example');

        const forbiddenProdStrings = [
            'mongodb://localhost',
            'supersecretadminpassword',
            'production-real-secret',
        ];

        if (fs.existsSync(stagingExamplePath)) {
            const content = fs.readFileSync(stagingExamplePath, 'utf8');
            // Ensure placeholders or clear warnings are used
            assert.ok(
                content.includes('your-') || content.includes('CHANGE_ME') || content.includes('generate-') || content.includes('staging'),
                '.env.staging.example should use clear placeholders'
            );
        }

        if (fs.existsSync(prodExamplePath)) {
            const content = fs.readFileSync(prodExamplePath, 'utf8');
            for (const badStr of forbiddenProdStrings) {
                assert.ok(!content.includes(badStr), `Production example should not include ${badStr}`);
            }
        }
    });
});
