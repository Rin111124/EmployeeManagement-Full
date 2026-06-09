const Joi = require('joi');
const { ROLES } = require('../constants/roles');
const { objectId, paginationQuery } = require('./common.validator');

const faceData = Joi.object({
    label: Joi.string().trim().allow('', null),
    embedding: Joi.array()
        .items(Joi.number().min(-2).max(2))
        .length(512)
        .required(),
    image_path: Joi.string().trim().allow('', null),
    provider: Joi.string()
        .valid('manual', 'kiosk', 'insightface')
        .default('manual'),
}).unknown(false);

const employeeBody = {
    employee_code: Joi.string().trim().uppercase().required(),
    full_name: Joi.string().trim().required(),
    date_of_birth: Joi.date().required(),
    gender: Joi.string().trim().required(),
    place_of_birth: Joi.string().trim().allow('', null),
    identity: Joi.object({
        number: Joi.string().trim().allow('', null),
        issue_date: Joi.date().allow(null),
        issue_place: Joi.string().trim().allow('', null),
    }).default({}),
    contact: Joi.object({
        phone: Joi.string().trim().allow('', null),
        email: Joi.string().email().trim().lowercase().allow('', null),
        permanent_address: Joi.string().trim().allow('', null),
        current_address: Joi.string().trim().allow('', null),
    }).default({}),
    position: Joi.string().trim().allow('', null),
    department: Joi.string().trim().allow('', null),
    insurance: Joi.object({
        tax_code: Joi.string().trim().allow('', null),
        social_insurance: Joi.string().trim().allow('', null),
        health_insurance: Joi.string().trim().allow('', null),
    }).default({}),
    bank_accounts: Joi.array().items(Joi.object({
        bank_name: Joi.string().trim().required(),
        account_number: Joi.string().trim().required(),
        is_primary: Joi.boolean().default(false),
    })).default([]),
    status: Joi.string().valid('Active', 'Inactive', 'Terminated').default('Active'),
    hire_date: Joi.date().required(),
    face_data: Joi.array().items(faceData).default([]),
    avatar: Joi.string().trim().allow('', null),
};

const createEmployeeSchema = Joi.object({
    ...employeeBody,
    account: Joi.object({
        username: Joi.string().trim().lowercase().required(),
        password: Joi.string().min(6).required(),
        roles: Joi.array().items(Joi.string().valid(...Object.values(ROLES))).default([ROLES.EMPLOYEE]),
    }).optional(),
});
const updateEmployeeSchema = Joi.object(employeeBody).fork(
    ['employee_code', 'full_name', 'date_of_birth', 'gender', 'hire_date'],
    (schema) => schema.optional(),
).min(1);

const employeeIdParamSchema = Joi.object({
    id: objectId.required(),
});

const listEmployeeQuerySchema = Joi.object({
    ...paginationQuery,
    search: Joi.string().trim().allow('', null),
    status: Joi.string().valid('Active', 'Inactive', 'Terminated'),
    department: Joi.string().trim().allow('', null),
});

const faceDataSchema = Joi.object({
    face_data: faceData.required(),
});

module.exports = {
    createEmployeeSchema,
    updateEmployeeSchema,
    employeeIdParamSchema,
    listEmployeeQuerySchema,
    faceDataSchema,
};
