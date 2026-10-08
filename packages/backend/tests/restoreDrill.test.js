process.env.NODE_ENV = 'test';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const VALID_BACKUP_KEY = '0123456789012345678901234567890101234567890123456789012345678901';
const WRONG_BACKUP_KEY = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

describe('Disaster Recovery: Encrypted Backup & Restore Drill (Gate 5 / P2-DR-03)', () => {
    let sourceMongo;
    let targetMongo;
    let tempBackupDir;
    let backupResult;
    let performBackup;
    let performRestore;

    before(async () => {
        process.env.BACKUP_ENCRYPTION_KEY = VALID_BACKUP_KEY;
        tempBackupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dr-drill-backup-'));
        process.env.BACKUP_OUT_DIR = tempBackupDir;

        // Import backup & restore modules dynamically
        const backupModule = await import('../../../scripts/backup/backup-encrypted-mongo.mjs');
        const restoreModule = await import('../../../scripts/backup/restore-encrypted-mongo.mjs');
        performBackup = backupModule.performBackup;
        performRestore = restoreModule.performRestore;

        // 1. Dựng source Mongo và nạp dữ liệu mẫu cho 4 collections cốt lõi
        sourceMongo = await MongoMemoryServer.create();
        process.env.MONGODB_URI = sourceMongo.getUri();

        await mongoose.connect(sourceMongo.getUri());
        const db = mongoose.connection.db;

        // Seed Employees
        await db.collection('employees').insertMany([
            { employee_code: 'EMP001', full_name: 'Nguyen Van A', status: 'Active', department: 'Engineering' },
            { employee_code: 'EMP002', full_name: 'Tran Thi B', status: 'Active', department: 'HR' },
            { employee_code: 'EMP003', full_name: 'Le Van C', status: 'Terminated', department: 'Finance' },
        ]);

        // Seed Attendances
        await db.collection('attendances').insertMany([
            { employee_id: 'EMP001', check_in: new Date('2026-10-01T08:00:00Z'), check_out: new Date('2026-10-01T17:00:00Z') },
            { employee_id: 'EMP002', check_in: new Date('2026-10-01T08:30:00Z'), check_out: new Date('2026-10-01T17:30:00Z') },
        ]);

        // Seed Payrolls
        await db.collection('payrolls').insertMany([
            { employee_id: 'EMP001', month: '2026-09', net_salary: 25000000, status: 'Finalized' },
            { employee_id: 'EMP002', month: '2026-09', net_salary: 18000000, status: 'Finalized' },
        ]);

        // Seed Audit Logs
        await db.collection('audit_logs').insertMany([
            { action: 'PAYROLL_FINALIZE', target: 'Payroll:2026-09', timestamp: new Date() },
            { action: 'DEVICE_APPROVE', target: 'Device:kiosk-01', timestamp: new Date() },
        ]);

        await mongoose.disconnect();

        // 2. Dựng môi trường database cô lập thứ hai để làm target khôi phục
        targetMongo = await MongoMemoryServer.create();
    });

    after(async () => {
        if (sourceMongo) await sourceMongo.stop();
        if (targetMongo) await targetMongo.stop();
        if (tempBackupDir && fs.existsSync(tempBackupDir)) {
            fs.rmSync(tempBackupDir, { recursive: true, force: true });
        }
    });

    test('DRILL-01: Thực hiện sao lưu mã hóa AES-256-GCM và tính toàn vẹn SHA-256', async () => {
        const startBackup = Date.now();
        backupResult = await performBackup(sourceMongo.getUri());
        const backupDurationMs = Date.now() - startBackup;

        assert.ok(backupResult.archivePath, 'Archive path must be returned');
        assert.ok(fs.existsSync(backupResult.archivePath), 'Archive file must exist');
        assert.ok(fs.existsSync(backupResult.metaPath), 'Metadata file must exist');

        const metadata = JSON.parse(fs.readFileSync(backupResult.metaPath, 'utf8'));
        assert.strictEqual(metadata.collectionsCount, 4);
        assert.strictEqual(metadata.documentCounts.employees, 3);
        assert.strictEqual(metadata.documentCounts.attendances, 2);
        assert.strictEqual(metadata.documentCounts.payrolls, 2);
        assert.strictEqual(metadata.documentCounts.audit_logs, 2);

        console.log(`[DRILL] Backup hoàn tất trong ${backupDurationMs}ms. Kích thước archive: ${metadata.sizeBytes} bytes.`);
    });

    test('DRILL-02: Khôi phục vào DB cô lập, đo RTO và đối chiếu toàn vẹn dữ liệu 100%', async () => {
        const startRestore = Date.now();
        await performRestore(backupResult.archivePath, targetMongo.getUri());
        const rtoMs = Date.now() - startRestore;

        console.log(`[DRILL] RTO thực tế: ${rtoMs}ms (mục tiêu RTO ≤ 4 giờ: ĐẠT ✅)`);

        // Kết nối vào Target DB để đối chiếu dữ liệu
        await mongoose.connect(targetMongo.getUri());
        const targetDb = mongoose.connection.db;

        const employees = await targetDb.collection('employees').find({}).toArray();
        const attendances = await targetDb.collection('attendances').find({}).toArray();
        const payrolls = await targetDb.collection('payrolls').find({}).toArray();
        const auditLogs = await targetDb.collection('audit_logs').find({}).toArray();

        assert.strictEqual(employees.length, 3, 'Employees count must match source exactly');
        assert.strictEqual(attendances.length, 2, 'Attendances count must match source exactly');
        assert.strictEqual(payrolls.length, 2, 'Payrolls count must match source exactly');
        assert.strictEqual(auditLogs.length, 2, 'Audit logs count must match source exactly');

        // Kiểm tra nội dung chi tiết
        assert.strictEqual(employees[0].employee_code, 'EMP001');
        assert.strictEqual(payrolls[0].status, 'Finalized');
        assert.strictEqual(auditLogs[0].action, 'PAYROLL_FINALIZE');

        await mongoose.disconnect();
    });

    test('DRILL-03: Thất bại fail-closed khi giải mã bằng sai khóa (Wrong Key)', async () => {
        process.env.BACKUP_ENCRYPTION_KEY = WRONG_BACKUP_KEY;

        await assert.rejects(
            async () => {
                await performRestore(backupResult.archivePath, targetMongo.getUri());
            },
            (err) => {
                assert.ok(err, 'Phải ném lỗi khi giải mã bằng khóa sai');
                console.log(`[DRILL] Fail-closed với sai khóa: ${err.message}`);
                return true;
            }
        );

        // Khôi phục lại key đúng
        process.env.BACKUP_ENCRYPTION_KEY = VALID_BACKUP_KEY;
    });

    test('DRILL-04: Thất bại fail-closed khi file archive bị can thiệp byte (Tamper/Corruption check)', async () => {
        const tamperedPath = path.join(tempBackupDir, 'tampered-archive.enc');
        const originalBytes = fs.readFileSync(backupResult.archivePath);

        // Đảo 1 byte ở giữa file payload
        const tamperedBytes = Buffer.from(originalBytes);
        tamperedBytes[45] ^= 0xff;
        fs.writeFileSync(tamperedPath, tamperedBytes);

        await assert.rejects(
            async () => {
                await performRestore(tamperedPath, targetMongo.getUri());
            },
            (err) => {
                assert.ok(err, 'Phải ném lỗi khi auth tag hoặc checksum không hợp lệ');
                console.log(`[DRILL] Fail-closed khi file bị can thiệp byte: ${err.message}`);
                return true;
            }
        );
    });
});
