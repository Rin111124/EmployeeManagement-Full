const AppError = require('../utils/AppError');

const validate = (schema, source = 'body') => (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
    });

    if (error) {
        const details = error.details.map((item) => ({
            field: item.path.join('.'),
            message: item.message,
        }));
        return next(new AppError('Request validation failed', 400, details));
    }

    req[source] = value;
    next();
};

module.exports = validate;
