const bcrypt = require('bcryptjs');
const { Employee, User } = require('../models');
const AppError = require('../utils/AppError');

async function createEmployee(payload) {
    const { account, ...employeePayload } = payload;
    const employee = await Employee.create(employeePayload);

    if (!account) {
        return employee;
    }

    try {
        const password_hash = await bcrypt.hash(account.password, 12);
        await User.create({
            employee_id: employee._id,
            username: account.username,
            password_hash,
            roles: account.roles,
        });
    } catch (error) {
        await Employee.findByIdAndDelete(employee._id);
        throw error;
    }

    return employee;
}

async function updateEmployee(id, payload) {
    const employee = await Employee.findByIdAndUpdate(id, payload, {
        returnDocument: 'after',
        runValidators: true,
    });

    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    return employee;
}

async function deleteEmployee(id) {
    const employee = await Employee.findByIdAndDelete(id);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }
    return employee;
}

async function getEmployee(id) {
    const employee = await Employee.findById(id);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }
    return employee;
}

async function listEmployees(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const filter = {};

    if (query.status) {
        filter.status = query.status;
    }

    if (query.department) {
        filter.department = query.department;
    }

    if (query.search) {
        filter.$or = [
            { employee_code: new RegExp(query.search, 'i') },
            { full_name: new RegExp(query.search, 'i') },
            { 'contact.email': new RegExp(query.search, 'i') },
        ];
    }

    const [items, total] = await Promise.all([
        Employee.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Employee.countDocuments(filter),
    ]);

    return {
        items,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
        },
    };
}

async function addFaceData(id, faceData) {
    const mongoose = require('mongoose');
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    
    // Tìm theo _id hoặc employee_code
    const query = isObjectId ? { _id: id } : { employee_code: id };

    const employee = await Employee.findOneAndUpdate(
        query,
        { $push: { face_data: faceData } },
        { returnDocument: 'after', runValidators: true },
    );

    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    return employee;
}

module.exports = {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployee,
    listEmployees,
    addFaceData,
};
