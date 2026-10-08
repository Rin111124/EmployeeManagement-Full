const asyncHandler = require('../utils/asyncHandler');
const auditService = require('../services/audit.service');
const AppError = require('../utils/AppError');

function createCrudController(service, messages = {}) {
    return {
        create: asyncHandler(async (req, res) => {
            const data = await service.create(req.body);
            await auditService.logAction({
                userId: req.user._id,
                action: messages.auditCreate || 'RESOURCE_CREATE',
                target: { type: messages.resourceType || 'Resource', id: data._id },
                req,
            });
            res.status(201).json({
                success: true,
                message: messages.created || 'Resource created successfully',
                data,
            });
        }),

        update: asyncHandler(async (req, res) => {
            const data = await service.update(req.params.id, req.body);
            await auditService.logAction({
                userId: req.user._id,
                action: messages.auditUpdate || 'RESOURCE_UPDATE',
                target: { type: messages.resourceType || 'Resource', id: data._id },
                metadata: { fields: Object.keys(req.body) },
                req,
            });
            res.json({
                success: true,
                message: messages.updated || 'Resource updated successfully',
                data,
            });
        }),

        remove: asyncHandler(async (req, res) => {
            await service.remove(req.params.id);
            await auditService.logAction({
                userId: req.user._id,
                action: messages.auditDelete || 'RESOURCE_DELETE',
                target: { type: messages.resourceType || 'Resource', id: req.params.id },
                req,
            });
            res.status(204).send();
        }),

        get: asyncHandler(async (req, res) => {
            const data = await service.get(req.params.id);
            res.json({
                success: true,
                data,
            });
        }),

        list: asyncHandler(async (req, res) => {
            const query = { ...req.query };
            if (messages.selfFilter && !messages.managementRoles?.some((role) => req.user.roles.includes(role))) {
                query[messages.selfFilter] = req.user.employee_id._id.toString();
            }
            const data = await service.list(query);
            res.json({
                success: true,
                data,
            });
        }),

        bulkCreate: asyncHandler(async (req, res) => {
            if (!service.bulkCreate) {
                throw new AppError('Bulk create not implemented for this resource', 400);
            }
            const data = await service.bulkCreate(req.body);
            await auditService.logAction({
                userId: req.user._id,
                action: messages.auditBulkCreate || `${messages.resourceType?.toUpperCase() || 'RESOURCE'}_BULK_CREATE`,
                target: { type: messages.resourceType || 'Resource' },
                metadata: { count: Array.isArray(data) ? data.length : 0 },
                req,
            });
            res.status(201).json({
                success: true,
                message: messages.bulkCreated || 'Resources created successfully',
                data,
            });
        }),
    };
}

module.exports = createCrudController;
