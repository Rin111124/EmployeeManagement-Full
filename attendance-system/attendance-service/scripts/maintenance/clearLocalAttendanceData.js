const mongoose = require('mongoose');
const LocalEmployee = require('../../src/models/LocalEmployee');
const Attendance = require('../../src/models/Attendance');
const env = require('../../src/config/env');

async function fix() {
    if (process.env.ALLOW_ATTENDANCE_DATA_RESET !== 'true') {
        throw new Error('Set ALLOW_ATTENDANCE_DATA_RESET=true to run this destructive cleanup script.');
    }

    await mongoose.connect(env.mongoUri);

    // The admin DB was cleared, so we need to clear ALL LocalEmployees
    // because their _id refs no longer match the ones in Admin DB.
    const delEmp = await LocalEmployee.deleteMany({});
    const delAtt = await Attendance.deleteMany({});
    
    console.log(`Deleted ${delEmp.deletedCount} ghost LocalEmployees.`);
    console.log(`Deleted ${delAtt.deletedCount} ghost LocalAttendances.`);
    
    process.exit(0);
}
fix();
