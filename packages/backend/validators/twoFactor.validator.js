/**
 * validators/twoFactor.validator.js
 * Schema xác thực dữ liệu đầu vào cho các request 2FA
 */

const Joi = require('joi');

const verifySetupSchema = Joi.object({
    token: Joi.string()
        .trim()
        .regex(/^\d{6}$/)
        .required()
        .messages({
            'string.pattern.base': 'Verification code must be a 6-digit number',
            'any.required': 'Verification code is required',
        }),
});

const verifyLoginSchema = Joi.object({
    temp_token: Joi.string().trim().required().messages({
        'any.required': 'Temporary 2FA session token is required',
    }),
    token: Joi.string()
        .trim()
        .regex(/^\d{6}$/)
        .messages({
            'string.pattern.base': 'Verification code must be a 6-digit number',
        }),
    recovery_code: Joi.string()
        .trim()
        .regex(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/)
        .messages({
            'string.pattern.base': 'Recovery code must be in the format XXXX-XXXX',
        }),
})
    .xor('token', 'recovery_code')
    .messages({
        'object.xor': 'Please provide either a 6-digit verification code or a recovery code',
        'object.missing': 'Either a 6-digit verification code or a recovery code must be provided',
    });

const disableSchema = Joi.object({
    password: Joi.string().required().messages({
        'any.required': 'Account password is required to disable 2FA',
    }),
    token: Joi.string()
        .trim()
        .regex(/^\d{6}$/)
        .required()
        .messages({
            'string.pattern.base': 'Verification code must be a 6-digit number',
            'any.required': 'Verification code is required',
        }),
});

const regenerateSchema = Joi.object({
    password: Joi.string().required().messages({
        'any.required': 'Account password is required to regenerate recovery codes',
    }),
});

module.exports = {
    verifySetupSchema,
    verifyLoginSchema,
    disableSchema,
    regenerateSchema,
};
