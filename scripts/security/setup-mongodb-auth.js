#!/usr/bin/env node
/**
 * Script thiết lập Authentication an toàn cho MongoDB (Phase 3 Hardening)
 * 
 * Cách dùng:
 *   node scripts/security/setup-mongodb-auth.js [--dry-run]
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSecurePassword(length = 24) {
    return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
}

async function main() {
    console.log('====================================================');
    console.log('  MONGODB SECURITY HARDENING & USER SETUP (PHASE 3) ');
    console.log('====================================================\n');

    const host = process.env.MONGO_HOST || '127.0.0.1';
    const port = process.env.MONGO_PORT || 27017;
    const uri = `mongodb://${host}:${port}/admin`;

    console.log(`Connecting to MongoDB at ${host}:${port}...`);
    let client;
    try {
        client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, directConnection: true });
        await client.connect();
        console.log('[OK] Connected to MongoDB.');
    } catch (err) {
        console.error('[ERROR] Cannot connect to MongoDB:', err.message);
        process.exit(1);
    }

    try {
        const adminDb = client.db('admin');

        // Check if users already exist
        const adminUsers = await adminDb.command({ usersInfo: 1 });
        const existingUsers = adminUsers.users.map(u => u.user);
        console.log(`[INFO] Existing users in admin db: ${existingUsers.join(', ') || 'None (Auth not configured yet)'}`);

        const adminPassword = process.env.MONGO_ADMIN_PASSWORD || generateSecurePassword(28);
        const appPassword = process.env.MONGO_APP_PASSWORD || generateSecurePassword(28);

        // 1. Root / Superadmin
        const adminUser = 'sys_security_admin';
        if (!existingUsers.includes(adminUser)) {
            console.log(`\n[1/3] Creating root admin user '${adminUser}'...`);
            await adminDb.command({
                createUser: adminUser,
                pwd: adminPassword,
                roles: [
                    { role: 'userAdminAnyDatabase', db: 'admin' },
                    { role: 'readWriteAnyDatabase', db: 'admin' },
                    { role: 'dbAdminAnyDatabase', db: 'admin' },
                    { role: 'clusterAdmin', db: 'admin' },
                ],
            });
            console.log(`[OK] Root admin user '${adminUser}' created.`);
        } else {
            console.log(`[1/3] Root admin '${adminUser}' already exists. Skipping.`);
        }

        // 2. Employee Management App User
        const empDb = client.db('employee_management');
        const empUsers = await empDb.command({ usersInfo: 1 });
        const existingEmpUsers = empUsers.users.map(u => u.user);
        const appUser = 'app_emp_user';

        if (!existingEmpUsers.includes(appUser)) {
            console.log(`\n[2/3] Creating application user '${appUser}' on 'employee_management'...`);
            await empDb.command({
                createUser: appUser,
                pwd: appPassword,
                roles: [
                    { role: 'readWrite', db: 'employee_management' },
                ],
            });
            console.log(`[OK] User '${appUser}' created.`);
        } else {
            console.log(`[2/3] User '${appUser}' already exists. Skipping.`);
        }

        // 3. Attendance App User
        const attDb = client.db('attendance');
        const attUsers = await attDb.command({ usersInfo: 1 });
        const existingAttUsers = attUsers.users.map(u => u.user);
        const attUser = 'app_att_user';

        if (!existingAttUsers.includes(attUser)) {
            console.log(`\n[3/3] Creating application user '${attUser}' on 'attendance'...`);
            await attDb.command({
                createUser: attUser,
                pwd: appPassword,
                roles: [
                    { role: 'readWrite', db: 'attendance' },
                ],
            });
            console.log(`[OK] User '${attUser}' created.`);
        } else {
            console.log(`[3/3] User '${attUser}' already exists. Skipping.`);
        }

        console.log('\n====================================================');
        console.log('             THIẾT LẬP THÀNH CÔNG!                  ');
        console.log('====================================================\n');
        console.log('1. THÔNG TIN ĐĂNG NHẬP MONGODB:');
        console.log(`   - SuperAdmin: ${adminUser}`);
        console.log(`   - SuperAdmin Pwd: ${adminPassword}`);
        console.log(`   - App User: ${appUser} (database: employee_management)`);
        console.log(`   - Attendance User: ${attUser} (database: attendance)`);
        console.log(`   - App Password: ${appPassword}\n`);

        console.log('2. CHUỖI KẾT NỐI CHO .env (chạy local trên Windows):');
        console.log(`   MONGODB_URI=mongodb://${appUser}:${encodeURIComponent(appPassword)}@127.0.0.1:27017/employee_management?authSource=employee_management`);
        console.log(`   ATTENDANCE_DB_URI=mongodb://${attUser}:${encodeURIComponent(appPassword)}@127.0.0.1:27017/attendance?authSource=attendance\n`);

        console.log('3. CHUỖI KẾT NỐI CHO .env.docker (chạy qua Docker):');
        console.log(`   MONGODB_URI=mongodb://${appUser}:${encodeURIComponent(appPassword)}@host.docker.internal:27017/employee_management?authSource=employee_management`);
        console.log(`   ATTENDANCE_DB_URI=mongodb://${attUser}:${encodeURIComponent(appPassword)}@host.docker.internal:27017/attendance?authSource=attendance\n`);

        console.log('4. BƯỚC CUỐI CÙNG ĐỂ BẬT BẢO MẬT:');
        console.log('   Mở file "C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.cfg" bằng Notepad (Admin):');
        console.log('   Thêm dòng sau (bỏ dấu #):');
        console.log('   security:');
        console.log('     authorization: enabled');
        console.log('   Sau đó khởi động lại Windows Service:');
        console.log('   Restart-Service MongoDB\n');

        // Lưu thông tin credentials vào file bí mật cục bộ không commit git
        const credFile = path.resolve(__dirname, 'mongodb-credentials.json');
        fs.writeFileSync(credFile, JSON.stringify({
            created_at: new Date().toISOString(),
            sys_security_admin: { user: adminUser, password: adminPassword },
            app_emp_user: { user: appUser, password: appPassword, db: 'employee_management' },
            app_att_user: { user: attUser, password: appPassword, db: 'attendance' },
            docker_uris: {
                MONGODB_URI: `mongodb://${appUser}:${encodeURIComponent(appPassword)}@host.docker.internal:27017/employee_management?authSource=employee_management`,
                ATTENDANCE_DB_URI: `mongodb://${attUser}:${encodeURIComponent(appPassword)}@host.docker.internal:27017/attendance?authSource=attendance`,
            },
            local_uris: {
                MONGODB_URI: `mongodb://${appUser}:${encodeURIComponent(appPassword)}@127.0.0.1:27017/employee_management?authSource=employee_management`,
                ATTENDANCE_DB_URI: `mongodb://${attUser}:${encodeURIComponent(appPassword)}@127.0.0.1:27017/attendance?authSource=attendance`,
            }
        }, null, 2), { mode: 0o600 });
        console.log(`[SECURITY] Đã lưu bản sao lưu chứng chỉ vào: ${credFile}`);

    } finally {
        await client.close();
    }
}

main().catch(err => {
    console.error('[ERROR FATAL]:', err);
    process.exit(1);
});
