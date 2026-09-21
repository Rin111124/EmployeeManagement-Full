const Joi = require('joi');
const { objectId } = require('./common.validator');

const generatePayrollSchema = Joi.object({
    employee_id: objectId.required(),
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(1900).required(),
    deduction: Joi.number().min(0).default(0),
    standard_month_hours: Joi.number().min(1).default(176),
    overtime_rate: Joi.number().min(0).default(1.5),
    finalize: Joi.boolean().default(false),
    engineConfig: Joi.object().unknown(true).optional(),
});

const generateBulkPayrollSchema = Joi.object({
    employeeIds: Joi.array().items(objectId).min(1).required()
        .messages({ 'array.min': 'At least one employeeId is required' }),
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(1900).required(),
    deduction: Joi.number().min(0).default(0),
    finalize: Joi.boolean().default(false),
});

module.exports = {
    generatePayrollSchema,
    generateBulkPayrollSchema,
};
