const Joi = require('joi');
const { objectId } = require('./common.validator');

const idParamSchema = Joi.object({
    id: objectId.required(),
});

const leaveSubmitSchema = Joi.object({
    type: Joi.string().trim().required(),
    start_date: Joi.date().required(),
    end_date: Joi.date().required(),
    total_days: Joi.number().min(0).required(),
    reason: Joi.string().trim().allow('', null),
});

const overtimeSubmitSchema = Joi.object({
    work_date: Joi.date().required(),
    hours: Joi.number().min(0).required(),
    type: Joi.string().trim().required(),
    reason: Joi.string().trim().allow('', null),
});

const reviewSchema = Joi.object({
    review_note: Joi.string().trim().allow('', null),
});

module.exports = {
    idParamSchema,
    leaveSubmitSchema,
    overtimeSubmitSchema,
    reviewSchema,
};
