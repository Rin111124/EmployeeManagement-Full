
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const Employee = require('../models/employee');
const Attendance = require('../models/attendance');
const FaceLog = require('../models/faceLog');
const BiometricRequest = require('../models/biometricRequest');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employee_management';
const ATTENDANCE_DB_URI = MONGODB_URI.replace(/\/[^/?]+(\?.*)?$/, '/attendance$1');

async function cleanupToday() {
    try {
        console.log('--- BẮT ĐẦU DỌN DẸP DỮ LIỆU NGÀY HÔM NAY (2026-05-15) ---\n');

        // Xác định khoảng thời gian ngày hôm nay (Local time 2026-05-15)
        const startOfDay = new Date('2026-05-15T00:00:00Z'); // Chỉnh sửa theo UTC nếu cần, nhưng ở đây dùng hardcode cho chắc chắn theo yêu cầu
        const endOfDay = new Date('2026-05-15T23:59:59Z');

        // 1. Dọn dẹp Admin Database
        console.log(`Kết nối tới Admin DB: ${MONGODB_URI}`);
        await mongoose.connect(MONGODB_URI);

        // Xoá chấm công hôm nay
        const attResult = await Attendance.deleteMany({
            $or: [
                { work_date: { $gte: startOfDay, $lte: endOfDay } },
                { createdAt: { $gte: startOfDay, $lte: endOfDay } }
            ]
        });
        console.log(`- Đã xoá ${attResult.deletedCount} bản ghi chấm công hôm nay.`);

        // Xoá log khuôn mặt hôm nay
        const logResult = await FaceLog.deleteMany({
            $or: [
                { detected_at: { $gte: startOfDay, $lte: endOfDay } },
                { createdAt: { $gte: startOfDay, $lte: endOfDay } }
            ]
        });
        console.log(`- Đã xoá ${logResult.deletedCount} nhật ký nhận diện hôm nay.`);

        // Xoá yêu cầu sinh trắc học hôm nay
        const reqResult = await BiometricRequest.deleteMany({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });
        console.log(`- Đã xoá ${reqResult.deletedCount} yêu cầu đăng ký khuôn mặt hôm nay.`);

        // Xoá face_data trong Employee (chỉ xoá những entry được tạo hôm nay trong mảng)
        const empResult = await Employee.updateMany(
            { 'face_data.created_at': { $gte: startOfDay, $lte: endOfDay } },
            { $pull: { face_data: { created_at: { $gte: startOfDay, $lte: endOfDay } } } }
        );
        console.log(`- Đã dọn dẹp dữ liệu khuôn mặt trong ${empResult.modifiedCount} nhân viên.`);

        await mongoose.disconnect();
        console.log('Đã ngắt kết nối Admin DB.\n');

        // 2. Dọn dẹp Attendance Database
        console.log(`Kết nối tới Attendance DB: ${ATTENDANCE_DB_URI}`);
        await mongoose.connect(ATTENDANCE_DB_URI);

        // Xoá chấm công trong Attendance DB (nếu có lưu riêng)
        const LocalAttendance = mongoose.models.Attendance || mongoose.model('Attendance', new mongoose.Schema({}, { strict: false, collection: 'attendances' }));
        const localAttResult = await LocalAttendance.deleteMany({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });
        console.log(`- Đã xoá ${localAttResult.deletedCount} bản ghi chấm công trong Attendance DB.`);

        // Xoá face_embedding của LocalEmployee nếu đăng ký hôm nay
        const LocalEmployee = mongoose.models.LocalEmployee || mongoose.model('LocalEmployee', new mongoose.Schema({}, { strict: false, collection: 'localemployees' }));
        const localEmpResult = await LocalEmployee.updateMany(
            { updatedAt: { $gte: startOfDay, $lte: endOfDay } },
            { $set: { face_embedding: [] } }
        );
        console.log(`- Đã reset face_embedding cho ${localEmpResult.modifiedCount} nhân viên tại kiosk.`);

        await mongoose.disconnect();
        console.log('Đã ngắt kết nối Attendance DB.\n');

        console.log('--- HOÀN THÀNH DỌN DẸP ---');
        process.exit(0);
    } catch (err) {
        console.error('LỖI KHI DỌN DẸP:', err);
        process.exit(1);
    }
}

cleanupToday();
