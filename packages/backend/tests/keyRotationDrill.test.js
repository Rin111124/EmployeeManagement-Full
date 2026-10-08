process.env.NODE_ENV = 'test';

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
    encryptJSON,
    decryptJSON,
    reencryptJSON,
    getEncryptionKey,
} = require('../utils/cryptoVault');

describe('Security: Key Rotation Rehearsal Drill v1 -> v2 (Gate 2 / P1-PRIV-03)', () => {
    let mongoServer;
    let employeeCollection;

    const keyV1 = '0123456789012345678901234567890101234567890123456789012345678901';
    const keyV2 = '9876543210987654321098765432109898765432109876543210987654321098';

    const envSnapshot = { ...process.env };

    before(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
        employeeCollection = mongoose.connection.collection('employees');
    });

    after(async () => {
        await mongoose.disconnect();
        if (mongoServer) await mongoServer.stop();
        // Restore environment variables
        process.env = envSnapshot;
    });

    test('KEY-ROTATION-01: Ghi nhận dữ liệu ban đầu với khóa phiên bản v1', async () => {
        process.env.APP_ENCRYPTION_KEY_VERSION = 'v1';
        process.env.APP_ENCRYPTION_KEY = keyV1;
        process.env.APP_ENCRYPTION_KEY_V1 = keyV1;
        delete process.env.APP_ENCRYPTION_KEY_V2;

        const emp1FaceEmbedding = [0.12, 0.34, -0.56, 0.78];
        const emp1CCCD = '001201009999';

        const emp1Doc = {
            employee_code: 'ROT001',
            full_name: 'Hoang Van X',
            identity: {
                number_ciphertext: encryptJSON(emp1CCCD),
            },
            face_data: [
                {
                    label: 'kiosk_enroll',
                    embedding_ciphertext: encryptJSON(emp1FaceEmbedding),
                },
            ],
            bank_accounts: [
                {
                    bank_name: 'Vietcombank',
                    account_number_ciphertext: encryptJSON('101234567890'),
                },
            ],
        };

        assert.ok(emp1Doc.identity.number_ciphertext.startsWith('v1:'), 'Phải được mã hóa bằng v1');
        assert.ok(emp1Doc.face_data[0].embedding_ciphertext.startsWith('v1:'), 'Embedding phải được mã hóa bằng v1');

        await employeeCollection.insertOne(emp1Doc);
        console.log('[KEY_ROTATION] Đã tạo bản ghi nhân viên ROT001 với ciphertext v1');
    });

    test('KEY-ROTATION-02: Thiết lập Key Ring v2 và xác minh Dual-Read (đọc v1 trong khi ghi v2)', async () => {
        // Thiết lập key ring v2
        process.env.APP_ENCRYPTION_KEY_VERSION = 'v2';
        process.env.APP_ENCRYPTION_KEY = keyV2;
        process.env.APP_ENCRYPTION_KEY_V2 = keyV2;
        process.env.APP_ENCRYPTION_KEY_V1 = keyV1; // Dual read: giữ key v1 để giải mã bản ghi cũ

        // 1. Dual Read: Đọc lại bản ghi v1 cũ nhưng giải mã thành công
        const emp1 = await employeeCollection.findOne({ employee_code: 'ROT001' });
        assert.ok(emp1, 'Tìm thấy nhân viên ROT001');

        const decryptedCCCD = decryptJSON(emp1.identity.number_ciphertext);
        const decryptedFace = decryptJSON(emp1.face_data[0].embedding_ciphertext);
        assert.strictEqual(decryptedCCCD, '001201009999', 'Dual-read: giải mã CCCD v1 thành công');
        assert.deepStrictEqual(decryptedFace, [0.12, 0.34, -0.56, 0.78], 'Dual-read: giải mã Face embedding v1 thành công');

        // 2. New Write: Ghi bản ghi mới ROT002 -> phải tự động sử dụng v2
        const emp2Doc = {
            employee_code: 'ROT002',
            full_name: 'Pham Thi Y',
            identity: {
                number_ciphertext: encryptJSON('001202008888'),
            },
            face_data: [
                {
                    label: 'kiosk_enroll',
                    embedding_ciphertext: encryptJSON([0.99, -0.88, 0.77]),
                },
            ],
        };

        assert.ok(emp2Doc.identity.number_ciphertext.startsWith('v2:'), 'Bản ghi mới phải dùng v2:');
        assert.ok(emp2Doc.face_data[0].embedding_ciphertext.startsWith('v2:'), 'Bản ghi mới embedding phải dùng v2:');

        await employeeCollection.insertOne(emp2Doc);
        console.log('[KEY_ROTATION] Dual-read thành công; bản ghi mới ROT002 tự động dùng v2:');
    });

    test('KEY-ROTATION-03: Diễn tập Migration nâng cấp toàn bộ ciphertext v1 -> v2', async () => {
        // Mô phỏng logic migration của migrateFaceEmbeddingsToEncrypted.js
        const cursor = employeeCollection.find({});
        let migratedCount = 0;

        for await (const employee of cursor) {
            let changed = false;
            const updateSet = {};

            if (employee.identity?.number_ciphertext) {
                const rotated = reencryptJSON(employee.identity.number_ciphertext);
                if (rotated !== employee.identity.number_ciphertext) {
                    updateSet['identity.number_ciphertext'] = rotated;
                    changed = true;
                }
            }

            if (employee.face_data?.length) {
                const updatedFaceData = employee.face_data.map((face) => {
                    if (face.embedding_ciphertext) {
                        const rotated = reencryptJSON(face.embedding_ciphertext);
                        if (rotated !== face.embedding_ciphertext) {
                            changed = true;
                            return { ...face, embedding_ciphertext: rotated };
                        }
                    }
                    return face;
                });
                if (changed) updateSet['face_data'] = updatedFaceData;
            }

            if (employee.bank_accounts?.length) {
                const updatedBank = employee.bank_accounts.map((acc) => {
                    if (acc.account_number_ciphertext) {
                        const rotated = reencryptJSON(acc.account_number_ciphertext);
                        if (rotated !== acc.account_number_ciphertext) {
                            changed = true;
                            return { ...acc, account_number_ciphertext: rotated };
                        }
                    }
                    return acc;
                });
                if (changed) updateSet['bank_accounts'] = updatedBank;
            }

            if (changed) {
                await employeeCollection.updateOne({ _id: employee._id }, { $set: updateSet });
                migratedCount++;
            }
        }

        assert.strictEqual(migratedCount, 1, 'Chỉ 1 bản ghi cũ ROT001 cần nâng cấp sang v2');

        // Xác minh toàn bộ bản ghi trong DB hiện tại đều là v2
        const allEmployees = await employeeCollection.find({}).toArray();
        for (const emp of allEmployees) {
            assert.ok(emp.identity.number_ciphertext.startsWith('v2:'), `${emp.employee_code} identity phải là v2`);
            assert.ok(emp.face_data[0].embedding_ciphertext.startsWith('v2:'), `${emp.employee_code} face embedding phải là v2`);
        }

        console.log(`[KEY_ROTATION] Migration hoàn tất. 100% bản ghi đã nâng cấp lên v2`);
    });

    test('KEY-ROTATION-04: Tính Idempotent — chạy lại migration lần 2 không thay đổi gì', async () => {
        const cursor = employeeCollection.find({});
        let secondPassChanged = 0;

        for await (const employee of cursor) {
            if (employee.identity?.number_ciphertext) {
                const rotated = reencryptJSON(employee.identity.number_ciphertext);
                if (rotated !== employee.identity.number_ciphertext) secondPassChanged++;
            }
            if (employee.face_data?.[0]?.embedding_ciphertext) {
                const rotated = reencryptJSON(employee.face_data[0].embedding_ciphertext);
                if (rotated !== employee.face_data[0].embedding_ciphertext) secondPassChanged++;
            }
        }

        assert.strictEqual(secondPassChanged, 0, 'Lần chạy thứ hai phải phát hiện 0 trường cần migrate (Idempotent đạt)');
        console.log('[KEY_ROTATION] Idempotency xác nhận: 0 bản ghi thay đổi ở lần quét thứ hai');
    });

    test('KEY-ROTATION-05: Thu hồi khóa cũ (Key Retirement) — hệ thống hoạt động thuần túy trên v2', async () => {
        // Thu hồi hoàn toàn key v1
        delete process.env.APP_ENCRYPTION_KEY_V1;

        // Giải mã cả 2 nhân viên (ROT001 và ROT002) chỉ với key v2
        const emp1 = await employeeCollection.findOne({ employee_code: 'ROT001' });
        const emp2 = await employeeCollection.findOne({ employee_code: 'ROT002' });

        const cccd1 = decryptJSON(emp1.identity.number_ciphertext);
        const face1 = decryptJSON(emp1.face_data[0].embedding_ciphertext);
        const cccd2 = decryptJSON(emp2.identity.number_ciphertext);
        const face2 = decryptJSON(emp2.face_data[0].embedding_ciphertext);

        assert.strictEqual(cccd1, '001201009999');
        assert.deepStrictEqual(face1, [0.12, 0.34, -0.56, 0.78]);
        assert.strictEqual(cccd2, '001202008888');
        assert.deepStrictEqual(face2, [0.99, -0.88, 0.77]);

        console.log('[KEY_ROTATION] Khóa v1 đã thu hồi an toàn. Dịch vụ hoạt động hoàn hảo trên khóa v2 ✅');
    });
});
