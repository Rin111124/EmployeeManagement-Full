const {
    Asset,
    Contract,
    ContractTemplate,
    Department,
    EmployeePosition,
    FaceLog,
    LeaveRequest,
    Overtime,
    Payroll,
    Shift,
    ShiftAssignment,
    Training,
    Setting,
} = require('../models');
const createCrudService = require('./crud.service');
const AppError = require('../utils/AppError');
const { REQUEST_STATUS } = require('../constants/workflow');

const CONTRACT_STATUS_TRANSITIONS = {
    Draft: ['Pending', 'Terminated'],
    Pending: ['Approved', 'Draft', 'Terminated'],
    Approved: ['Signed', 'Draft', 'Terminated'],
    Signed: ['Terminated'],
    Terminated: [],
};

function toDateKey(value) {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString().slice(0, 10);
}

function normalizeHolidaySet(holidays = []) {
    return new Set(
        (Array.isArray(holidays) ? holidays : [])
            .map((item) => {
                const value = typeof item === 'string' ? item : item?.date;
                return value ? toDateKey(value) : null;
            })
            .filter(Boolean)
    );
}

async function createHolidayOvertimes(overtimes = []) {
    if (!overtimes.length) return 0;

    let created = 0;
    for (const overtime of overtimes) {
        const existing = await Overtime.findOne({
            employee_id: overtime.employee_id,
            work_date: overtime.work_date,
            type: 'Holiday',
        }).lean();

        if (existing) continue;
        await Overtime.create(overtime);
        created += 1;
    }

    return created;
}

function assertContractCanChange(current, payload = {}) {
    if (current.status === 'Terminated') {
        throw new AppError('Terminated contracts cannot be modified', 409);
    }

    if (current.status === 'Signed') {
        const onlyTerminate = Object.keys(payload).length === 1 && payload.status === 'Terminated';
        if (!onlyTerminate) {
            throw new AppError('Signed contracts cannot be modified. Terminate or create an addendum instead.', 409);
        }
    }

    if (payload.status && payload.status !== current.status) {
        const allowed = CONTRACT_STATUS_TRANSITIONS[current.status] || [];
        if (!allowed.includes(payload.status)) {
            throw new AppError(`Invalid contract status transition: ${current.status} -> ${payload.status}`, 400);
        }
    }
}

module.exports = {
    department: createCrudService(Department, {
        resourceName: 'Department',
        allowedFilters: ['parent_id'],
        searchFields: ['department_name', 'department_code'],
        populate: [
            { path: 'parent_id', select: 'department_name' },
            { path: 'manager_id', select: 'full_name employee_code' }
        ],
    }),
    employeePosition: createCrudService(EmployeePosition, {
        resourceName: 'Employee position',
        allowedFilters: ['employee_id', 'department_id', 'is_current'],
        searchFields: ['position_name'],
        populate: ['employee_id', 'department_id'],
    }),
    shift: createCrudService(Shift, {
        resourceName: 'Shift',
        allowedFilters: ['is_night_shift'],
        searchFields: ['shift_name'],
    }),
    shiftAssignment: (() => {
        const service = createCrudService(ShiftAssignment, {
            resourceName: 'Shift assignment',
            allowedFilters: ['employee_id', 'shift_id'],
            dateField: 'work_date',
            populate: ['employee_id', 'shift_id'],
            sort: { work_date: -1 },
        });

        service.bulkCreate = async (payload) => {
            const { employee_ids, shift_id, start_date, end_date, days_of_week, create_holiday_overtime = false } = payload;
            const timeConfig = await Setting.findOne({ key: 'time_config' }).lean();
            const holidays = normalizeHolidaySet(timeConfig?.value?.holidays);
            const shift = create_holiday_overtime
                ? await Shift.findById(shift_id).select('standard_hours start_time end_time').lean()
                : null;

            const start = new Date(start_date);
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date(end_date);
            end.setUTCHours(0, 0, 0, 0);
            const assignments = [];
            let holidaySkipped = 0;
            const holidayOvertimes = [];

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (holidays.has(toDateKey(d))) {
                    holidaySkipped += employee_ids.length;
                    if (create_holiday_overtime) {
                        for (const empId of employee_ids) {
                            holidayOvertimes.push({
                                employee_id: empId,
                                work_date: new Date(d),
                                hours: shift?.standard_hours || 8,
                                type: 'Holiday',
                                status: REQUEST_STATUS.APPROVED,
                                reason: 'Auto-created from holiday bulk scheduling',
                            });
                        }
                    }
                    continue;
                }

                const dayOfWeek = d.getDay();
                if (days_of_week && days_of_week.length > 0 && !days_of_week.includes(dayOfWeek)) {
                    continue;
                }

                for (const empId of employee_ids) {
                    assignments.push({
                        employee_id: empId,
                        shift_id: shift_id,
                        work_date: new Date(d),
                    });
                }
            }

            if (assignments.length === 0) {
                const holidayOvertimeCreated = await createHolidayOvertimes(holidayOvertimes);
                return {
                    requested: holidaySkipped,
                    created: 0,
                    skipped: holidaySkipped,
                    holiday_skipped: holidaySkipped,
                    holiday_overtime_created: holidayOvertimeCreated,
                    items: [],
                };
            }

            const uniqueDates = [...new Set(assignments.map((item) => item.work_date.getTime()))]
                .map((time) => new Date(time));
            const existing = await ShiftAssignment.find({
                employee_id: { $in: employee_ids },
                work_date: { $in: uniqueDates },
            }).select('employee_id work_date').lean();

            const existingKeys = new Set(existing.map((item) => (
                `${item.employee_id.toString()}:${new Date(item.work_date).toISOString()}`
            )));

            const toInsert = assignments.filter((item) => !existingKeys.has(
                `${item.employee_id.toString()}:${item.work_date.toISOString()}`
            ));

            if (toInsert.length === 0) {
                const holidayOvertimeCreated = await createHolidayOvertimes(holidayOvertimes);
                return {
                    requested: assignments.length + holidaySkipped,
                    created: 0,
                    skipped: assignments.length + holidaySkipped,
                    holiday_skipped: holidaySkipped,
                    holiday_overtime_created: holidayOvertimeCreated,
                    items: [],
                };
            }

            const inserted = await ShiftAssignment.insertMany(toInsert, { ordered: true });
            const holidayOvertimeCreated = await createHolidayOvertimes(holidayOvertimes);
            return {
                requested: assignments.length + holidaySkipped,
                created: inserted.length,
                skipped: assignments.length - inserted.length + holidaySkipped,
                holiday_skipped: holidaySkipped,
                holiday_overtime_created: holidayOvertimeCreated,
                items: inserted,
            };
        };

        return service;
    })(),
    leaveRequest: createCrudService(LeaveRequest, {
        resourceName: 'Leave request',
        allowedFilters: ['employee_id', 'status'],
        dateField: 'start_date',
        populate: 'employee_id',
        sort: { start_date: -1 },
    }),
    overtime: createCrudService(Overtime, {
        resourceName: 'Overtime request',
        allowedFilters: ['employee_id', 'status'],
        dateField: 'work_date',
        populate: 'employee_id',
        sort: { work_date: -1 },
    }),
    contract: (() => {
        const service = createCrudService(Contract, {
            resourceName: 'Contract',
            allowedFilters: ['employee_id', 'status'],
            populate: ['employee_id'],
            sort: { createdAt: -1 },
        });

        // Auto-update expired contracts on list/get
        const originalList = service.list;
        service.list = async (query) => {
            // Update expired contracts before listing
            await Contract.updateMany(
                {
                    status: { $in: ['Signed', 'Approved'] },
                    $and: [
                        { end_date: { $ne: null } },
                        { end_date: { $lt: new Date() } },
                    ],
                },
                { status: 'Terminated' }
            );
            return originalList(query);
        };

        const originalCreate = service.create;
        service.create = async (payload) => {
            if (!payload.employee_id || !payload.start_date) {
                throw new AppError('employee_id and start_date are required', 400);
            }
            await validateOverlap(payload.employee_id, payload.start_date, payload.end_date);
            return originalCreate(payload);
        };

        const originalUpdate = service.update;
        service.update = async (id, payload) => {
            const current = await Contract.findById(id);
            if (!current) {
                throw new AppError('Contract not found', 404);
            }
            assertContractCanChange(current, payload);

            if (payload.start_date || payload.end_date || payload.employee_id) {
                await validateOverlap(
                    payload.employee_id || current.employee_id,
                    payload.start_date || current.start_date,
                    payload.end_date !== undefined ? payload.end_date : current.end_date,
                    id
                );
            }
            return originalUpdate(id, payload);
        };

        const originalRemove = service.remove;
        service.remove = async (id) => {
            const current = await Contract.findById(id);
            if (!current) {
                throw new AppError('Contract not found', 404);
            }
            if (['Signed', 'Terminated'].includes(current.status)) {
                throw new AppError('Signed or terminated contracts cannot be deleted', 409);
            }
            return originalRemove(id);
        };

        const validateOverlap = async (employee_id, start_date, end_date, excludeId = null) => {
            if (!start_date) return;

            const newStart = new Date(start_date);
            const newEnd = end_date ? new Date(end_date) : null;
            const query = {
                employee_id,
                _id: { $ne: excludeId },
                start_date: newEnd ? { $lte: newEnd } : { $exists: true },
                $or: [{ end_date: null }, { end_date: { $gte: newStart } }],
            };
            const overlapping = await Contract.findOne(query);
            if (overlapping) {
                throw new AppError(
                    `Hợp đồng bị chồng lấn thời gian với hợp đồng đã tồn tại (ID: ${overlapping._id}). / Contract overlaps with an existing one.`,
                    409,
                );
            }
        };

        return service;
    })(),
    contractTemplate: createCrudService(ContractTemplate, {
        resourceName: 'Contract template',
        allowedFilters: ['contract_type_match'],
        searchFields: ['name', 'description'],
    }),
    payroll: createCrudService(Payroll, {
        resourceName: 'Payroll',
        allowedFilters: ['employee_id', 'month', 'year'],
        populate: 'employee_id',
        sort: { year: -1, month: -1 },
    }),
    asset: (() => {
        const service = createCrudService(Asset, {
            resourceName: 'Asset',
            allowedFilters: ['status', 'category', 'assigned_to'],
            searchFields: ['asset_name', 'serial_number', 'location'],
            populate: { path: 'assigned_to', select: 'full_name employee_code department position' },
        });

        const normalizeQuery = (query = {}) => ({
            ...query,
            assigned_to: query.assigned_to || query.employee_id,
        });

        const originalList = service.list;
        service.list = async (query) => originalList(normalizeQuery(query));

        return service;
    })(),
    training: createCrudService(Training, {
        resourceName: 'Training course',
        searchFields: ['course_name'],
    }),
    faceLog: createCrudService(FaceLog, {
        resourceName: 'Face log',
        allowedFilters: ['employee_id', 'status'],
        dateField: 'detected_at',
        populate: 'employee_id',
        sort: { detected_at: -1 },
    }),
};
