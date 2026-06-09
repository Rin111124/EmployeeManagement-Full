const Joi = require('joi');
const { objectId, paginationQuery } = require('./common.validator');

const facePayload = {
    employee_id: objectId,
    face_embedding: Joi.array().items(Joi.number()),
    face_image_path: Joi.string().trim(),
    device_id: objectId.allow(null),
};

const checkInSchema = Joi.object(facePayload).or('employee_id', 'face_embedding', 'face_image_path');
const checkOutSchema = Joi.object(facePayload).or('employee_id', 'face_embedding', 'face_image_path');

const historyQuerySchema = Joi.object({
    ...paginationQuery,
    employee_id: objectId,
    device_id: objectId,
    from: Joi.date(),
    to: Joi.date(),
});

const dailyReportQuerySchema = Joi.object({
    date: Joi.date().default(() => new Date()),
});

const monthlyReportQuerySchema = Joi.object({
    year: Joi.number().integer().min(2000).max(2100).required(),
    month: Joi.number().integer().min(1).max(12).required(),
});

const attendanceIdParamSchema = Joi.object({
    id: objectId.required(),
});

const updateAttendanceSchema = Joi.object({
    employee_id: objectId,
    shift_id: objectId.allow(null),
    work_date: Joi.date(),
    check_in: Joi.date().allow(null),
    check_out: Joi.date().allow(null),
    worked_hours: Joi.number().min(0),
    late_minutes: Joi.number().min(0),
    status: Joi.string().valid('CheckedIn', 'CheckedOut', 'MissingCheckout'),
    method: Joi.string().valid('face', 'manual'),
    device_id: objectId.allow(null),
    check_in_face_image: Joi.string().trim().allow('', null),
    check_out_face_image: Joi.string().trim().allow('', null),
}).min(1);

const createAttendanceSchema = Joi.object({
    employee_id: objectId.required(),
    shift_id: objectId.allow(null),
    work_date: Joi.date().required(),
    check_in: Joi.date().required(),
    check_out: Joi.date().allow(null),
    method: Joi.string().valid('face', 'manual').default('manual'),
});

module.exports = {
    checkInSchema,
    checkOutSchema,
    historyQuerySchema,
    dailyReportQuerySchema,
    monthlyReportQuerySchema,
    attendanceIdParamSchema,
    updateAttendanceSchema,
    createAttendanceSchema,
};
