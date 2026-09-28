const Joi = require('joi');
const { objectId } = require('./common.validator');

const requestAccessSchema = Joi.object({
    device_name: Joi.string().trim().min(2).max(100).required(),
    device_id: Joi.string().trim().max(100).optional().allow('', null),
    bootstrap_hash: Joi.string().trim().regex(/^[a-fA-F0-9]{64}$/).optional().allow('', null),
    ip_address: Joi.string().ip({ version: ['ipv4', 'ipv6'] }).optional().allow('', null),
    port: Joi.number().integer().min(1).max(65535).optional().allow(null),
    location: Joi.string().trim().max(200).optional().allow('', null),
    device_type: Joi.string().valid('face', 'fingerprint', 'rfid', 'kiosk', 'mobile', 'attendance_terminal', 'camera').default('face'),
});

const enrollmentChallengeSchema = Joi.object({
    device_id: Joi.string().trim().required(),
    id: Joi.string().trim().optional(),
});

const claimTokenSchema = Joi.object({
    device_id: Joi.string().trim().optional(),
    device_name: Joi.string().trim().optional(),
    challenge: Joi.string().trim().hex().optional(),
    proof: Joi.string().trim().hex().optional(),
    claim_code: Joi.string().trim().optional(),
    bootstrap_hash: Joi.string().trim().regex(/^[a-fA-F0-9]{64}$/).optional(),
    device_instance_id: Joi.string().trim().max(100).optional(),
}).or('challenge', 'claim_code');

const deviceIdParamSchema = Joi.object({
    id: objectId.required(),
});

const deviceStatusParamSchema = Joi.object({
    deviceId: Joi.string().trim().required(),
});

module.exports = {
    requestAccessSchema,
    enrollmentChallengeSchema,
    claimTokenSchema,
    deviceIdParamSchema,
    deviceStatusParamSchema,
};
