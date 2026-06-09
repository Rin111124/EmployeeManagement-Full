/**
 * Utility script: Xoá toàn bộ dữ liệu khuôn mặt (face IDs) đã đăng ký.
 * Bao gồm:
 * 1. Xoá face_data trong bộ sưu tập Employee (Admin system)
 * 2. Xoá face_embedding trong bộ sưu tập LocalEmployee (Attendance service)
 * 3. Xoá toàn bộ BiometricRequest (Yêu cầu đăng ký)
 * 4. Xoá toàn bộ FaceLog (Lịch sử nhận diện)
 * 
 * Chạy: node scripts/clear_biometrics.js
 */
const mongoose = require('mongoose');
const path = require('path');
const env = require('../config/env');

// Import models từ Admin System
const Employee = require('../models/employee');
const FaceLog = require('../models/faceLog');
const BiometricRequest = require('../models/biometricRequest');

// DB URIs
const ADMIN_DB_URI = env.mongoUri;
// Giả định attendance service dùng chung host mongo nhưng DB khác (theo docker-compose)
// Tên DB mặc định trong docker-compose là 'attendance'
const ATTENDANCE_DB_URI = ADMIN_DB_URI.replace(/\/[^/?]+(\?.*)?$/, '/attendance$1');

async function clearBiometrics() {
    try {
        console.log('--- BẮT ĐẦU XOÁ DỮ LIỆU BIOMETRIC ---\n');

        // 1. Dọn dẹp Admin Database
        console.log(`Kết nối tới Admin DB: ${ADMIN_DB_URI}`);
        await mongoose.connect(ADMIN_DB_URI);
        
        const empResult = await Employee.updateMany({}, { $set: { face_data: [] } });
        console.log(`- Đã xoá face_data của ${empResult.modifiedCount} nhân viên.`);

        const requestResult = await BiometricRequest.deleteMany({});
        console.log(`- Đã xoá ${requestResult.deletedCount} yêu cầu đăng ký.`);

        const logResult = await FaceLog.deleteMany({});
        console.log(`- Đã xoá ${logResult.deletedCount} nhật ký nhận diện.`);

        await mongoose.disconnect();
        console.log('Đã ngắt kết nối Admin DB.\n');

        // 2. Dọn dẹp Attendance Database
        console.log(`Kết nối tới Attendance DB: ${ATTENDANCE_DB_URI}`);
        await mongoose.connect(ATTENDANCE_DB_URI);
        
        // Model cho LocalEmployee
        const LocalEmployee = mongoose.model('LocalEmployee', new mongoose.Schema({
            face_embedding: [Number]
        }, { collection: 'localemployees' }));

        const localResult = await LocalEmployee.updateMany({}, { $set: { face_embedding: [] } });
        console.log(`- Đã xoá face_embedding của ${localResult.modifiedCount} bản ghi trong 'localemployees'.`);

        // Kiểm tra xem có collection 'employees' cũ không (một số phiên bản sync có thể dùng tên này)
        try {
            const collections = await mongoose.connection.db.listCollections({ name: 'employees' }).toArray();
            if (collections.length > 0) {
                const legacyResult = await mongoose.connection.db.collection('employees').updateMany({}, { $set: { face_embedding: [] } });
                console.log(`- Đã dọn dẹp thêm ${legacyResult.modifiedCount} bản ghi trong collection 'employees' cũ của Attendance DB.`);
            }
        } catch (e) {
            // Bỏ qua nếu không có quyền list collections
        }

        await mongoose.disconnect();
        console.log('Đã ngắt kết nối Attendance DB.\n');

        console.log('--- HOÀN THÀNH XOÁ TOÀN BỘ FACE IDS ---');
        process.exit(0);
    } catch (err) {
        console.error('LỖI KHI XOÁ DỮ LIỆU:', err);
        process.exit(1);
    }
}

clearBiometrics();
