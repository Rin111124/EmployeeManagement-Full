const Joi = require('joi');
const { ROLES } = require('../constants/roles');
const { objectId } = require('./common.validator');

const loginSchema = Joi.object({
    username: Joi.string().trim().lowercase().required(),
    password: Joi.string().min(6).required(),
});

const registerSchema = Joi.object({
    employee_id: objectId.required(),
    username: Joi.string().trim().lowercase().required(),
    password: Joi.string().min(6).required(),
    roles: Joi.array().items(Joi.string().valid(...Object.values(ROLES))).default([ROLES.EMPLOYEE]),
});

module.exports = {
    loginSchema,
    registerSchema,
};
