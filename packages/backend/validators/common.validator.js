const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const paginationQuery = {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
};

const idParamSchema = Joi.object({
    id: objectId.required(),
});

module.exports = {
    objectId,
    paginationQuery,
    idParamSchema,
};
