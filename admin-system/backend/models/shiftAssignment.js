const mongoose = require('mongoose');

const { Schema } = mongoose;

function normalizeWorkDate(value) {
    if (!value) return value;
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
}

const shiftAssignmentSchema = new Schema(
    {
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        shift_id: {
            type: Schema.Types.ObjectId,
            ref: 'Shift',
            required: true,
            index: true,
        },
        work_date: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
        collection: 'shift_assignments',
    }
);

shiftAssignmentSchema.pre('validate', function normalizeAssignmentDate() {
    this.work_date = normalizeWorkDate(this.work_date);
});

shiftAssignmentSchema.pre('findOneAndUpdate', function normalizeAssignmentUpdate() {
    const update = this.getUpdate() || {};
    if (update.work_date) {
        update.work_date = normalizeWorkDate(update.work_date);
    }
    if (update.$set?.work_date) {
        update.$set.work_date = normalizeWorkDate(update.$set.work_date);
    }
    this.setUpdate(update);
});

shiftAssignmentSchema.index({ employee_id: 1, work_date: 1 }, { unique: true });

module.exports = mongoose.models.ShiftAssignment || mongoose.model('ShiftAssignment', shiftAssignmentSchema);
