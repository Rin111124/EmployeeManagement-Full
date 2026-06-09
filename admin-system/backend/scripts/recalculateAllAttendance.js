const mongoose = require('mongoose');
const connectDatabase = require('../loaders/database.loader');
const { Attendance } = require('../models');
const attendanceService = require('../services/attendance.service');
const logger = require('../utils/logger');

async function main() {
    await connectDatabase();

    // Lấy tất cả các bản ghi có đủ check-in và check-out
    const records = await Attendance.find({
        check_in: { $ne: null },
        check_out: { $ne: null }
    }).select('_id employee_id work_date check_in check_out worked_hours');

    console.log(`Found ${records.length} records to recalculate.`);

    let updated = 0;
    let failed = 0;

    for (const record of records) {
        try {
            // Gọi updateAttendance mà không truyền dữ liệu thay đổi để kích hoạt logic tính toán lại worked_hours
            // Logic này nằm trong attendanceService.updateAttendance
            await attendanceService.updateAttendance(record._id, {
                // Chúng ta truyền lại chính check_in/check_out để đảm bảo trigger tính toán
                check_in: record.check_in,
                check_out: record.check_out
            });
            updated++;
            if (updated % 10 === 0) console.log(`Processed ${updated}/${records.length}...`);
        } catch (error) {
            failed++;
            logger.error(`[RECALC_ALL] Failed for record ${record._id}:`, error.message);
        }
    }

    console.log(`Recalculation complete.`);
    console.log(`Total: ${records.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
}

main()
    .catch((error) => {
        console.error('Recalculation script failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
