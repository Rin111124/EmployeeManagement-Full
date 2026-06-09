const { LeaveRequest, Overtime } = require('../models');
const { REQUEST_STATUS } = require('../constants/workflow');
const AppError = require('../utils/AppError');

const resources = {
    leave: {
        Model: LeaveRequest,
        name: 'Leave request',
        populate: 'employee_id reviewed_by',
    },
    overtime: {
        Model: Overtime,
        name: 'Overtime request',
        populate: 'employee_id reviewed_by',
    },
};

function getResource(type) {
    const resource = resources[type];
    if (!resource) {
        throw new AppError('Invalid workflow resource', 500);
    }
    return resource;
}

async function createOwn(type, employeeId, payload) {
    const { Model, populate } = getResource(type);
    const document = await Model.create({
        ...payload,
        employee_id: employeeId,
        status: REQUEST_STATUS.PENDING,
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
    });

    return Model.findById(document._id).populate(populate);
}

async function transition(type, id, status, reviewerId, reviewNote) {
    const { Model, name, populate } = getResource(type);
    const document = await Model.findById(id);

    if (!document) {
        throw new AppError(`${name} not found`, 404);
    }

    if (document.status !== REQUEST_STATUS.PENDING) {
        throw new AppError(`${name} is already ${document.status.toLowerCase()}`, 409);
    }

    document.status = status;
    document.reviewed_by = reviewerId;
    document.reviewed_at = new Date();
    document.review_note = reviewNote || null;
    await document.save();

    return Model.findById(document._id).populate(populate);
}

async function cancelOwn(type, id, employeeId) {
    const { Model, name, populate } = getResource(type);
    const document = await Model.findById(id);

    if (!document) {
        throw new AppError(`${name} not found`, 404);
    }

    if (document.employee_id.toString() !== employeeId.toString()) {
        throw new AppError('You do not have permission to cancel this request', 403);
    }

    if (document.status !== REQUEST_STATUS.PENDING) {
        throw new AppError(`Only pending ${name.toLowerCase()} can be cancelled`, 409);
    }

    document.status = REQUEST_STATUS.CANCELLED;
    document.reviewed_at = new Date();
    document.review_note = 'Cancelled by employee';
    await document.save();

    return Model.findById(document._id).populate(populate);
}

module.exports = {
    cancelOwn,
    createOwn,
    transition,
};
