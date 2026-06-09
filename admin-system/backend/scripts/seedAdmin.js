const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const { ROLES } = require('../constants/roles');
const { Employee, User } = require('../models');

async function seedAdmin() {
    await connectDB();

    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD;
    const employeeCode = process.env.ADMIN_EMPLOYEE_CODE || 'ADMIN001';
    const fullName = process.env.ADMIN_FULL_NAME || 'System Administrator';

    if (!password) {
        throw new Error('ADMIN_PASSWORD is required when seeding an admin user');
    }

    const existingUser = await User.findOne({ username });
    let employee = await Employee.findOne({ employee_code: employeeCode });
    if (!employee) {
        employee = await Employee.create({
            employee_code: employeeCode,
            full_name: fullName,
            date_of_birth: new Date('1990-01-01'),
            gender: 'Other',
            position: 'Administrator',
            department: 'System',
            hire_date: new Date(),
            status: 'Active',
        });
        console.log(`Created admin employee profile: ${employeeCode}`);
    }

    const password_hash = await bcrypt.hash(password, 12);

    if (existingUser) {
        existingUser.employee_id = employee._id;
        existingUser.password_hash = password_hash;
        existingUser.roles = [ROLES.ADMIN];
        existingUser.is_active = true;
        await existingUser.save();
        console.log(`Admin user updated: ${username}`);
        process.exit(0);
    }

    await User.create({
        employee_id: employee._id,
        username,
        password_hash,
        roles: [ROLES.ADMIN],
        is_active: true,
    });

    console.log(`Admin user created: ${username}`);
    process.exit(0);
}

if (require.main === module) {
    seedAdmin().catch((error) => {
        console.error('Failed to seed admin:', error.message);
        process.exit(1);
    });
}

module.exports = seedAdmin;
