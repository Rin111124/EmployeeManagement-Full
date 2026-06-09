const createCrudController = require('../controllers/crud.controller');
const createCrudRouter = require('./crud.routes');
const { MANAGEMENT_ROLES } = require('../constants/roles');
const services = require('../services/adminResources.service');
const schemas = require('../validators/adminResources.validator');

function resourceRouter(resourceKey, labels, options = {}) {
    const controller = createCrudController(services[resourceKey], {
        created: `${labels.singular} created successfully`,
        updated: `${labels.singular} updated successfully`,
        resourceType: labels.singular,
        auditCreate: `${resourceKey.toUpperCase()}_CREATE`,
        auditUpdate: `${resourceKey.toUpperCase()}_UPDATE`,
        auditDelete: `${resourceKey.toUpperCase()}_DELETE`,
        managementRoles: options.roles,
        selfFilter: options.selfFilter,
    });

    return createCrudRouter(controller, schemas[resourceKey], options);
}

module.exports = {
    departmentRoutes: resourceRouter('department', { singular: 'Department' }, { roles: MANAGEMENT_ROLES }),
    employeePositionRoutes: resourceRouter('employeePosition', { singular: 'Employee position' }, { roles: MANAGEMENT_ROLES }),
    shiftRoutes: resourceRouter('shift', { singular: 'Shift' }, { roles: MANAGEMENT_ROLES }),
    shiftAssignmentRoutes: resourceRouter('shiftAssignment', { singular: 'Shift assignment' }, {
        roles: MANAGEMENT_ROLES,
        allowEmployeeListOwn: true,
        ownerResolver: async (req) => {
            const item = await services.shiftAssignment.get(req.params.id);
            return item.employee_id?._id || item.employee_id;
        },
        selfFilter: 'employee_id',
    }),
    leaveRequestRoutes: resourceRouter('leaveRequest', { singular: 'Leave request' }, {
        roles: MANAGEMENT_ROLES,
        allowEmployeeListOwn: true,
        ownerResolver: async (req) => {
            const item = await services.leaveRequest.get(req.params.id);
            return item.employee_id?._id || item.employee_id;
        },
        selfFilter: 'employee_id',
    }),
    overtimeRoutes: resourceRouter('overtime', { singular: 'Overtime request' }, {
        roles: MANAGEMENT_ROLES,
        allowEmployeeListOwn: true,
        ownerResolver: async (req) => {
            const item = await services.overtime.get(req.params.id);
            return item.employee_id?._id || item.employee_id;
        },
        selfFilter: 'employee_id',
    }),
    contractRoutes: resourceRouter('contract', { singular: 'Contract' }, {
        roles: MANAGEMENT_ROLES,
        allowEmployeeListOwn: true,
        ownerResolver: async (req) => {
            const item = await services.contract.get(req.params.id);
            return item.employee_id?._id || item.employee_id;
        },
        selfFilter: 'employee_id',
    }),
    contractTemplateRoutes: resourceRouter('contractTemplate', { singular: 'Contract template' }, { roles: MANAGEMENT_ROLES }),
    payrollRoutes: resourceRouter('payroll', { singular: 'Payroll' }, {
        roles: MANAGEMENT_ROLES,
        allowEmployeeListOwn: true,
        ownerResolver: async (req) => {
            const item = await services.payroll.get(req.params.id);
            return item.employee_id?._id || item.employee_id;
        },
        selfFilter: 'employee_id',
    }),
    assetRoutes: resourceRouter('asset', { singular: 'Asset' }, {
        roles: MANAGEMENT_ROLES,
        allowEmployeeListOwn: true,
        ownerResolver: async (req) => {
            const item = await services.asset.get(req.params.id);
            return item.assigned_to?._id || item.assigned_to;
        },
        selfFilter: 'assigned_to',
    }),
    trainingRoutes: resourceRouter('training', { singular: 'Training course' }, { roles: MANAGEMENT_ROLES }),
    faceLogRoutes: resourceRouter('faceLog', { singular: 'Face log' }, { roles: MANAGEMENT_ROLES }),
};
