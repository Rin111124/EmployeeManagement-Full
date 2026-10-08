const Joi = require('joi');
const { objectId, paginationQuery } = require('./common.validator');

const listQuery = (extra = {}) => Joi.object({
    ...paginationQuery,
    search: Joi.string().trim().allow('', null),
    ...extra,
});

const optionalUpdate = (schema) => schema.fork(
    Object.keys(schema.describe().keys),
    (field) => field.optional(),
).min(1);

const allowanceSchema = Joi.object({
    name: Joi.string().trim().required(),
    amount: Joi.number().min(0).required(),
});

const trainingSessionSchema = Joi.object({
    start_date: Joi.date().required(),
    end_date: Joi.date().required(),
    employees: Joi.array().items(Joi.object({
        employee_id: objectId.required(),
        status: Joi.string().trim().required(),
        score: Joi.number().min(0).max(100),
    })).default([]),
});

const allowanceValidatorSchema = Joi.object({
    name: Joi.string().trim().required(),
    amount: Joi.number().min(0).required(),
});

const departmentCreate = Joi.object({
    department_name: Joi.string().trim().required(),
    department_code: Joi.string().trim().uppercase().allow('', null),
    parent_id: objectId.allow(null),
    manager_id: objectId.allow(null),
    level: Joi.number().integer().min(0).max(5).default(0),
    description: Joi.string().trim().allow('', null),
    default_allowances: Joi.array().items(allowanceValidatorSchema).default([]),
});

const employeePositionCreate = Joi.object({
    employee_id: objectId.required(),
    department_id: objectId.required(),
    position_name: Joi.string().trim().required(),
    start_date: Joi.date().required(),
    end_date: Joi.date().allow(null),
    is_current: Joi.boolean().default(true),
});

const shiftCreate = Joi.object({
    shift_name: Joi.string().trim().required(),
    start_time: Joi.string().trim().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
    end_time: Joi.string().trim().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
    is_night_shift: Joi.boolean().default(false),
    standard_hours: Joi.number().min(0).required(),
    break_mins: Joi.number().min(0).default(30),
    min_work_mins_for_break: Joi.number().min(0).default(240),
});

const shiftAssignmentCreate = Joi.object({
    employee_id: objectId.required(),
    shift_id: objectId.required(),
    work_date: Joi.date().required(),
});

const leaveRequestCreate = Joi.object({
    employee_id: objectId.required(),
    type: Joi.string().trim().required(),
    start_date: Joi.date().required(),
    end_date: Joi.date().required(),
    total_days: Joi.number().min(0).required(),
    status: Joi.string().valid('Pending', 'Approved', 'Rejected', 'Cancelled').default('Pending'),
    reason: Joi.string().trim().allow('', null),
    review_note: Joi.string().trim().allow('', null),
});

const overtimeCreate = Joi.object({
    employee_id: objectId.required(),
    work_date: Joi.date().required(),
    hours: Joi.number().min(0).required(),
    type: Joi.string().trim().required(),
    status: Joi.string().valid('Pending', 'Approved', 'Rejected', 'Cancelled').default('Pending'),
    reason: Joi.string().trim().allow('', null),
    review_note: Joi.string().trim().allow('', null),
});

const contractCreate = Joi.object({
    employee_id: objectId.required(),
    type: Joi.string().trim().valid('Probation', 'Fixed-term', 'Indefinite', 'Freelance', 'Full-time').required(),
    start_date: Joi.date().required(),
    end_date: Joi.date().allow(null),
    base_salary: Joi.number().min(0).required(),
    allowances: Joi.array().items(allowanceSchema).default([]),
    status: Joi.string().valid('Draft', 'Pending', 'Approved', 'Signed', 'Terminated').default('Draft'),
    template_id: objectId.allow(null),
});

const contractUpdate = Joi.object({
    employee_id: objectId,
    type: Joi.string().trim().valid('Probation', 'Fixed-term', 'Indefinite', 'Freelance', 'Full-time'),
    start_date: Joi.date(),
    end_date: Joi.date().allow(null),
    base_salary: Joi.number().min(0),
    allowances: Joi.array().items(allowanceSchema),
    status: Joi.string().valid('Draft', 'Pending', 'Approved', 'Signed', 'Terminated'),
    template_id: objectId.allow(null),
}).min(1);

const payrollCreate = Joi.object({
    employee_id: objectId.required(),
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(1900).required(),
    total_work_hours: Joi.number().min(0).default(0),
    total_overtime_hours: Joi.number().min(0).default(0),
    basic_salary: Joi.number().min(0).required(),
    overtime_salary: Joi.number().min(0).default(0),
    allowance: Joi.number().min(0).default(0),
    deduction: Joi.number().min(0).default(0),
    net_salary: Joi.number().min(0).required(),
    status: Joi.string().valid('Draft', 'Finalized').default('Draft'),
});

const assetCreate = Joi.object({
    asset_name: Joi.string().trim().required(),
    category: Joi.string().valid('Laptop', 'Desktop', 'Mobile', 'Tablet', 'Storage', 'Peripherals', 'Other').default('Other'),
    serial_number: Joi.string().trim().uppercase().allow('', null),
    status: Joi.string().valid('Available', 'Assigned', 'Maintenance', 'Broken', 'Lost', 'Retired').default('Available'),
    assigned_to: objectId.allow(null),
    assigned_date: Joi.date().allow(null),
    purchase_date: Joi.date().allow(null),
    purchase_cost: Joi.number().min(0).default(0),
    warranty_until: Joi.date().allow(null),
    location: Joi.string().trim().allow('', null),
    notes: Joi.string().trim().allow('', null),
});

const trainingCreate = Joi.object({
    course_name: Joi.string().trim().required(),
    sessions: Joi.array().items(trainingSessionSchema).default([]),
});

const faceLogCreate = Joi.object({
    employee_id: objectId.required(),
    confidence: Joi.number().min(0).max(1).required(),
    captured_image: Joi.string().trim().required(),
    detected_at: Joi.date().required(),
    status: Joi.string().trim().required(),
});

module.exports = {
    department: {
        create: departmentCreate,
        update: optionalUpdate(departmentCreate),
        listQuery: listQuery({ parent_id: objectId.allow(null) }),
    },
    employeePosition: {
        create: employeePositionCreate,
        update: optionalUpdate(employeePositionCreate),
        listQuery: listQuery({
            employee_id: objectId,
            department_id: objectId,
            is_current: Joi.boolean(),
        }),
    },
    shift: {
        create: shiftCreate,
        update: optionalUpdate(shiftCreate),
        listQuery: listQuery({ is_night_shift: Joi.boolean() }),
    },
    shiftAssignment: {
        create: shiftAssignmentCreate,
        update: optionalUpdate(shiftAssignmentCreate),
        bulk: Joi.object({
            employee_ids: Joi.array().items(objectId).min(1).required(),
            shift_id: objectId.required(),
            start_date: Joi.date().required(),
            end_date: Joi.date().required(),
            days_of_week: Joi.array().items(Joi.number().min(0).max(6)).default([]),
            create_holiday_overtime: Joi.boolean().default(false),
        }),
        listQuery: listQuery({
            employee_id: objectId,
            shift_id: objectId,
            from: Joi.date(),
            to: Joi.date(),
        }),
    },
    leaveRequest: {
        create: leaveRequestCreate,
        update: optionalUpdate(leaveRequestCreate),
        listQuery: listQuery({
            employee_id: objectId,
            status: Joi.string().valid('Pending', 'Approved', 'Rejected', 'Cancelled'),
            from: Joi.date(),
            to: Joi.date(),
        }),
    },
    overtime: {
        create: overtimeCreate,
        update: optionalUpdate(overtimeCreate),
        listQuery: listQuery({
            employee_id: objectId,
            status: Joi.string().valid('Pending', 'Approved', 'Rejected', 'Cancelled'),
            from: Joi.date(),
            to: Joi.date(),
        }),
    },
    contract: {
        create: contractCreate,
        update: contractUpdate,
        listQuery: listQuery({
            employee_id: objectId,
            from: Joi.date(),
            to: Joi.date(),
        }),
    },
    payroll: {
        create: payrollCreate,
        update: optionalUpdate(payrollCreate),
        listQuery: listQuery({
            employee_id: objectId,
            month: Joi.number().integer().min(1).max(12),
            year: Joi.number().integer().min(1900),
        }),
    },
    asset: {
        create: assetCreate,
        update: optionalUpdate(assetCreate),
        listQuery: listQuery({
            status: Joi.string().valid('Available', 'Assigned', 'Maintenance', 'Broken', 'Lost', 'Retired'),
            category: Joi.string().valid('Laptop', 'Desktop', 'Mobile', 'Tablet', 'Storage', 'Peripherals', 'Other'),
            assigned_to: objectId,
            employee_id: objectId,
        }),
    },
    training: {
        create: trainingCreate,
        update: optionalUpdate(trainingCreate),
        listQuery: listQuery(),
    },
    contractTemplate: {
        create: Joi.object({
            name: Joi.string().trim().required(),
            description: Joi.string().trim().allow('', null),
            html_content: Joi.string().required(),
            contract_type_match: Joi.string().valid('Probation', 'Fixed-term', 'Indefinite', 'Freelance', 'All').default('All'),
            is_default: Joi.boolean().default(false),
        }),
        update: Joi.object({
            name: Joi.string().trim(),
            description: Joi.string().trim().allow('', null),
            html_content: Joi.string(),
            contract_type_match: Joi.string().valid('Probation', 'Fixed-term', 'Indefinite', 'Freelance', 'All'),
            is_default: Joi.boolean(),
        }).min(1),
        listQuery: listQuery({ contract_type_match: Joi.string() }),
    },
    faceLog: {
        create: faceLogCreate,
        update: optionalUpdate(faceLogCreate),
        listQuery: listQuery({
            employee_id: objectId,
            status: Joi.string().trim(),
            from: Joi.date(),
            to: Joi.date(),
        }),
    },
};
