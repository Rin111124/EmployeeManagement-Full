const Joi = require('joi');
const { objectId, paginationQuery } = require('./common.validator');

const auditLogQuerySchema = Joi.object({
    ...paginationQuery,
    user_id: objectId,
    action: Joi.string().trim(),
    target_type: Joi.string().trim(),
    from: Joi.date(),
    to: Joi.date(),
});

module.exports = {
    auditLogQuerySchema,
};
