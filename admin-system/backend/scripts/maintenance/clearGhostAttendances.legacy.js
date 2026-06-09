const mongoose = require('mongoose');
const Attendance = require('../../models/attendance');
const Employee = require('../../models/employee');
const env = require('../../config/env');

async function fix() {
    if (process.env.ALLOW_ATTENDANCE_CLEANUP !== 'true') {
        throw new Error('Set ALLOW_ATTENDANCE_CLEANUP=true to run this cleanup script.');
    }

    await mongoose.connect(env.mongoUri);
    
    // Find all attendances where employee no longer exists
    const attendances = await Attendance.find({});
    let deleted = 0;
    for (const att of attendances) {
        const emp = await Employee.findById(att.employee_id);
        if (!emp) {
            await Attendance.findByIdAndDelete(att._id);
            deleted++;
        }
    }
    console.log(`Deleted ${deleted} ghost attendances from admin-system.`);
    process.exit(0);
}
fix();
