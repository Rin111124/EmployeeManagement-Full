const mongoose = require('mongoose');
const Employee = require('./models/employee');
const env = require('./config/env');

const seedEmployees = [
  {
    employee_code: 'NV001',
    full_name: 'Nguyễn Văn Nam',
    date_of_birth: new Date('1995-05-15'),
    gender: 'Nam',
    department: 'Phòng Kỹ thuật',
    position: 'Kỹ sư phần mềm',
    status: 'Active',
    hire_date: new Date('2023-01-10'),
    face_data: []
  },
  {
    employee_code: 'NV002',
    full_name: 'Trần Thị Mai',
    date_of_birth: new Date('1998-08-22'),
    gender: 'Nữ',
    department: 'Phòng Hành chính',
    position: 'Chuyên viên nhân sự',
    status: 'Active',
    hire_date: new Date('2023-03-15'),
    face_data: []
  },
  {
    employee_code: 'NV003',
    full_name: 'Lê Hoàng Long',
    date_of_birth: new Date('1992-12-10'),
    gender: 'Nam',
    department: 'Phòng Sản xuất',
    position: 'Trưởng nhóm sản xuất',
    status: 'Active',
    hire_date: new Date('2022-11-20'),
    face_data: []
  }
];

async function runSeed() {
  try {
    console.log('Connecting to MongoDB: ' + env.mongoUri);
    await mongoose.connect(env.mongoUri);
    console.log('Connected to database.');

    for (const emp of seedEmployees) {
      const exists = await Employee.findOne({ employee_code: emp.employee_code });
      if (!exists) {
        await Employee.create(emp);
        console.log(`Created employee: ${emp.full_name} (${emp.employee_code})`);
      } else {
        console.log(`Employee ${emp.employee_code} already exists.`);
      }
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

runSeed();
