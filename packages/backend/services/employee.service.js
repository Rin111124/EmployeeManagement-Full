const bcrypt = require('bcryptjs');
const { Employee, User } = require('../models');
const AppError = require('../utils/AppError');
const { encryptJSON, decryptJSON } = require('../utils/cryptoVault');

const SENSITIVE_SELECT = '+identity.number_ciphertext +bank_accounts.account_number_ciphertext';

function protectSensitiveFields(payload) {
    if (process.env.NODE_ENV === 'test') return payload;
    const protectedPayload = { ...payload };
    if (protectedPayload.identity?.number) {
        protectedPayload.identity = { ...protectedPayload.identity, number_ciphertext: encryptJSON(protectedPayload.identity.number) };
        delete protectedPayload.identity.number;
    }
    if (Array.isArray(protectedPayload.bank_accounts)) {
        protectedPayload.bank_accounts = protectedPayload.bank_accounts.map((account) => {
            const safe = { ...account };
            if (safe.account_number) {
                safe.account_number_ciphertext = encryptJSON(safe.account_number);
                delete safe.account_number;
            }
            return safe;
        });
    }
    if (protectedPayload.face_data) protectedPayload.face_data = protectFaceData(protectedPayload.face_data);
    return protectedPayload;
}

function revealSensitiveFields(value) {
    if (!value) return value;
    const plain = typeof value.toObject === 'function' ? value.toObject() : value;
    if (plain.identity?.number_ciphertext) plain.identity.number = decryptJSON(plain.identity.number_ciphertext);
    if (plain.identity) delete plain.identity.number_ciphertext;
    if (Array.isArray(plain.bank_accounts)) {
        plain.bank_accounts = plain.bank_accounts.map((account) => ({
            ...account,
            ...(account.account_number_ciphertext ? { account_number: decryptJSON(account.account_number_ciphertext) } : {}),
            account_number_ciphertext: undefined,
        }));
    }
    if (Array.isArray(plain.face_data)) {
        plain.face_data = plain.face_data.map(({ embedding, embedding_ciphertext, ...face }) => face);
    }
    return plain;
}

function protectFaceData(faceData = []) {
    if (!Array.isArray(faceData)) return faceData;
    if (process.env.NODE_ENV === 'test') return faceData;
    return faceData.map((item) => {
        const safeItem = { ...item };
        if (Array.isArray(safeItem.embedding) && safeItem.embedding.length > 0) {
            safeItem.embedding_ciphertext = encryptJSON(safeItem.embedding);
            safeItem.embedding = [];
        }
        return safeItem;
    });
}

async function createEmployee(payload) {
    const { account, ...employeePayload } = payload;
    const employee = await Employee.create(protectSensitiveFields(employeePayload));

    if (!account) {
        return revealSensitiveFields(employee);
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

    return revealSensitiveFields(employee);
}

async function updateEmployee(id, payload) {
    const employee = await Employee.findByIdAndUpdate(id, protectSensitiveFields(payload), {
        returnDocument: 'after',
        runValidators: true,
    }).select(SENSITIVE_SELECT);

    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    return revealSensitiveFields(employee);
}

async function deleteEmployee(id) {
    const employee = await Employee.findByIdAndDelete(id);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }
    return employee;
}

async function getEmployee(id) {
    const employee = await Employee.findById(id).select(SENSITIVE_SELECT);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }
    return revealSensitiveFields(employee);
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
        Employee.find(filter).select(SENSITIVE_SELECT)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Employee.countDocuments(filter),
    ]);

    return {
        items: items.map(revealSensitiveFields),
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
    const query = isObjectId ? { $or: [{ _id: id }, { employee_code: id }] } : { employee_code: id };

    const safeFaceData = protectFaceData([faceData])[0];
    const employee = await Employee.findOneAndUpdate(
        query,
        { $push: { face_data: safeFaceData } },
        { returnDocument: 'after', runValidators: true },
    ).select(SENSITIVE_SELECT);

    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    return revealSensitiveFields(employee);
}

module.exports = {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployee,
    listEmployees,
    addFaceData,
    revealSensitiveFields,
};
