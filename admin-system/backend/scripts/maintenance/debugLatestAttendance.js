const mongoose = require('mongoose');
const Attendance = require('../../models/attendance');
const Employee = require('../../models/employee');
const env = require('../../config/env');

async function test() {
    await mongoose.connect(env.mongoUri);
    
    const attendances = await Attendance.find({}).sort({ createdAt: -1 }).limit(1);
    if (attendances.length > 0) {
        const att = attendances[0];
        console.log("Latest Attendance:");
        console.log("Attendance ID:", att._id);
        console.log("Employee ID in Attendance:", att.employee_id);
        console.log("Method:", att.method);
        console.log("Status:", att.status);
        
        const emp = await Employee.findById(att.employee_id);
        if (emp) {
            console.log("Found Employee:", emp.full_name);
        } else {
            console.log("EMPLOYEE NOT FOUND in Employee collection!");
            
            // Just check how many employees we have
            const allEmp = await Employee.find({});
            console.log(`Total employees in Employee collection: ${allEmp.length}`);
            if (allEmp.length > 0) {
                console.log(`First employee _id: ${allEmp[0]._id}`);
            }
        }
    } else {
        console.log("No attendances found.");
    }
    
    process.exit(0);
}
test();
