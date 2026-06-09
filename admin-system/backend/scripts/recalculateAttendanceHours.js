const mongoose = require('mongoose');
const connectDatabase = require('../loaders/database.loader');
const { Attendance } = require('../models');
const attendanceService = require('../services/attendance.service');
const logger = require('../utils/logger');

async function main() {
    await connectDatabase();

    const records = await Attendance.find({
        check_in: { $ne: null },
        check_out: { $ne: null },
        $or: [
            { worked_hours: { $exists: false } },
            { worked_hours: null },
            { worked_hours: 0 },
        ],
    }).select('_id employee_id check_in check_out worked_hours');

    let updated = 0;
    let skipped = 0;

    for (const record of records) {
        try {
            const before = Number(record.worked_hours || 0);
            const updatedRecord = await attendanceService.updateAttendance(record._id, {
                check_out: record.check_out,
            });

            if (Number(updatedRecord.worked_hours || 0) !== before) {
                updated += 1;
            } else {
                skipped += 1;
            }
        } catch (error) {
            skipped += 1;
            logger.warn('[ATTENDANCE_RECALC] Skipped record', {
                id: record._id,
                error: error.message,
            });
        }
    }

    console.log(`Attendance hour recalculation complete. Updated: ${updated}. Skipped: ${skipped}.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
