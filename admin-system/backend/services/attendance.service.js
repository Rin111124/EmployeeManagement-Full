const { Attendance, Employee, Setting, ShiftAssignment } = require('../models');
const AppError = require('../utils/AppError');
const PayrollEngine = require('./payrollEngine');
const { startOfDay, endOfDay, monthRange } = require('../utils/date');
const logger = require('../utils/logger');

const axios = require('axios');
const env = require('../config/env');

function workDateFromTimestamp(value = new Date()) {
    const date = new Date(value);
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

async function resolveShiftAssignment(employeeId, workDate) {
    return ShiftAssignment.findOne({
        employee_id: employeeId,
        work_date: workDate,
    }).populate('shift_id');
}

function getShiftStartTimestamp(workDate, shiftConfig = null) {
    if (!workDate || !shiftConfig?.start_time) return null;
    const [hours, minutes] = shiftConfig.start_time.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

    const workDateValue = new Date(workDate);
    return new Date(
        workDateValue.getUTCFullYear(),
        workDateValue.getUTCMonth(),
        workDateValue.getUTCDate(),
        hours,
        minutes,
        0,
        0,
    );
}

function getShiftEndTimestamp(workDate, shiftConfig = null) {
    if (!workDate || !shiftConfig?.end_time) return null;
    const [hours, minutes] = shiftConfig.end_time.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

    const workDateValue = new Date(workDate);
    const end = new Date(
        workDateValue.getUTCFullYear(),
        workDateValue.getUTCMonth(),
        workDateValue.getUTCDate(),
        hours,
        minutes,
        0,
        0,
    );

    // Xử lý ca đêm: Nếu end_time < start_time (ví dụ: vào 22:00 ra 06:00), end là ngày hôm sau
    if (shiftConfig.start_time) {
        const [sH, sM] = shiftConfig.start_time.split(':').map(Number);
        if (hours < sH || (hours === sH && minutes < sM)) {
            end.setDate(end.getDate() + 1);
        }
    }

    return end;
}

function calculateLateMinutes(checkIn, workDate, shiftConfig = null) {
    const shiftStart = getShiftStartTimestamp(workDate, shiftConfig);
    if (!shiftStart || !checkIn) return 0;

    const diffMs = new Date(checkIn) - shiftStart;
    return diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
}

function normalizeCheckOutForOvernightShift(checkIn, checkOut) {
    if (!checkIn || !checkOut) return checkOut;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
        return checkOut;
    }

    if (checkOutDate < checkInDate) {
        checkOutDate.setDate(checkOutDate.getDate() + 1);
        return checkOutDate;
    }

    return checkOut;
}

function applyShiftMetrics(attendance, assignment) {
    const shiftConfig = assignment?.shift_id || null;
    attendance.shift_id = shiftConfig?._id || assignment?.shift_id || null;
    attendance.late_minutes = calculateLateMinutes(attendance.check_in, attendance.work_date, shiftConfig);
    return shiftConfig;
}

async function resolveEmployeeByFace(payload) {
    if (payload.employee_id) {
        const employee = await Employee.findById(payload.employee_id);
        if (!employee) {
            throw new AppError('Employee not found', 404);
        }
        return employee;
    }

    if (payload.face_image_path) {
        const employee = await Employee.findOne({ 'face_data.image_path': payload.face_image_path });
        if (employee) return employee;
    }

    if (payload.face_embedding?.length) {
        // Optimization: Fetch only active employees with face data
        const employees = await Employee.find({ 
            status: 'Active',
            'face_data.embedding.0': { $exists: true } 
        }).select('face_data');

        if (employees.length === 0) {
            throw new AppError('No registered faces found in system', 404);
        }

        // Flatten all registered faces for vectorized matching
        const candidates = [];
        employees.forEach(emp => {
            emp.face_data.forEach(face => {
                if (face.embedding?.length) {
                    candidates.push({
                        id: emp._id.toString(),
                        embedding: face.embedding
                    });
                }
            });
        });

        if (candidates.length === 0) {
            throw new AppError('No valid face embeddings found', 404);
        }

        try {
            // Offload matching to specialized AI Service (Python/NumPy)
            const aiResponse = await axios.post(`${env.aiServiceUrl}/compute-match`, {
                query_embedding: payload.face_embedding,
                candidates,
                threshold: FACE_SIMILARITY_THRESHOLD
            }, {
                headers: env.aiApiKey ? { 'x-api-key': env.aiApiKey } : {}
            });

            if (aiResponse.data?.match_found) {
                const matchedId = aiResponse.data.match.id;
                const employee = await Employee.findById(matchedId);
                if (employee) return employee;
            }
        } catch (error) {
            logger.error('[AI_MATCH] Error calling AI service', { error: error.message });
            // Fallback to manual match if AI service fails (to ensure availability)
            const matchedCandidate = candidates.find(c => sameEmbedding(c.embedding, payload.face_embedding));
            if (matchedCandidate) {
                return Employee.findById(matchedCandidate.id);
            }
        }
    }

    throw new AppError('Face could not be matched to an employee', 404);
}

/**
 * Tính cosine similarity giữa hai embedding vectors.
 * @returns {number} Giá trị trong khoảng [-1, 1]; càng gần 1 càng giống nhau.
 */
function cosineSimilarity(left = [], right = []) {
    if (left.length === 0 || left.length !== right.length) return 0;

    let dot = 0;
    let normLeft = 0;
    let normRight = 0;

    for (let i = 0; i < left.length; i++) {
        const l = Number(left[i]);
        const r = Number(right[i]);
        dot += l * r;
        normLeft += l * l;
        normRight += r * r;
    }

    const denom = Math.sqrt(normLeft) * Math.sqrt(normRight);
    return denom === 0 ? 0 : dot / denom;
}

/**
 * Kiểm tra xem hai face embeddings có coi là cùng người không.
 * Threshold mặc định 0.82 — phù hợp với model Facenet512.
 * Giá trị cao hơn = nghiêm ngặt hơn (ít false positive).
 */
const FACE_SIMILARITY_THRESHOLD = 0.82;

function sameEmbedding(left = [], right = [], threshold = FACE_SIMILARITY_THRESHOLD) {
    return cosineSimilarity(left, right) >= threshold;
}

async function checkIn(payload) {
    const employee = await resolveEmployeeByFace(payload);
    const today = workDateFromTimestamp();

    const existing = await Attendance.findOne({
        employee_id: employee._id,
        work_date: today,
    });

    if (existing?.check_in && !existing.check_out) {
        throw new AppError('Employee already checked in today', 409);
    }

    if (existing?.check_out) {
        throw new AppError('Employee already completed attendance today', 409);
    }

    const assignment = await resolveShiftAssignment(employee._id, today);
    const attendance = new Attendance({
        employee_id: employee._id,
        work_date: today,
        check_in: new Date(),
        status: 'CheckedIn',
        method: 'face',
        device_id: payload.device_id || null,
        check_in_face_image: payload.face_image_path,
    });
    applyShiftMetrics(attendance, assignment);
    await attendance.save();

    return attendance.populate('employee_id');
}

async function checkOut(payload) {
    const employee = await resolveEmployeeByFace(payload);
    const today = workDateFromTimestamp();

    const attendance = await Attendance.findOne({
        employee_id: employee._id,
        work_date: today,
    });

    if (!attendance?.check_in) {
        throw new AppError('Employee has not checked in today', 409);
    }

    if (attendance.check_out) {
        throw new AppError('Employee already checked out today', 409);
    }

    attendance.check_out = new Date();
    attendance.status = 'CheckedOut';
    attendance.check_out_face_image = payload.face_image_path;

    // Tìm ca làm việc của nhân viên trong ngày để áp dụng giờ nghỉ chính xác
    const assignment = await resolveShiftAssignment(employee._id, today);
    const shiftConfig = applyShiftMetrics(attendance, assignment);

    const metrics = await calculateWorkedHours(attendance.check_in, attendance.check_out, shiftConfig, attendance.work_date);
    attendance.worked_hours = metrics.worked_hours;
    attendance.ot_hours = metrics.ot_hours;
    await attendance.save();

    return attendance.populate('employee_id');
}

async function calculateWorkedHours(checkIn, checkOut, shiftConfig = null, workDate = null) {
    if (!checkIn || !checkOut) return { worked_hours: 0, ot_hours: 0 };
    
    let cin = new Date(checkIn);
    let cout = new Date(normalizeCheckOutForOvernightShift(cin, checkOut));

    const EARLY_LEAVE_BUFFER_MINS = 5; 
    const OT_MIN_THRESHOLD_MINS = 30;  

    if (workDate && shiftConfig?.start_time) {
        const shiftStart = getShiftStartTimestamp(workDate, shiftConfig);
        if (shiftStart && cin < shiftStart) cin = shiftStart;
    }

    if (workDate && shiftConfig?.end_time) {
        const shiftEnd = getShiftEndTimestamp(workDate, shiftConfig);
        if (shiftEnd) {
            const diffMs = cout - shiftEnd;
            const diffMins = diffMs / 60000;
            if (diffMins < 0 && Math.abs(diffMins) <= EARLY_LEAVE_BUFFER_MINS) cout = shiftEnd;
            else if (diffMins > 0 && diffMins < OT_MIN_THRESHOLD_MINS) cout = shiftEnd;
        }
    }
    
    try {
        const timeConfig = await Setting.findOne({ key: 'time_config' });
        const config = {
            ...(timeConfig?.value || {}),
            standardHoursPerDay: 8,
            useStrictOTApproval: false 
        };
        const engine = new PayrollEngine(config);
        
        const buckets = engine.analyzeShift(cin, cout, 'Normal', shiftConfig ? { ...shiftConfig.toObject ? shiftConfig.toObject() : shiftConfig, standard_hours: 8 } : { standard_hours: 8 });
        
        const totalMins = (buckets.day_normal || 0) + (buckets.night_normal || 0) + (buckets.day_ot || 0) + (buckets.night_ot || 0);
        
        return {
            worked_hours: Math.round((totalMins / 60) * 100) / 100,
            ot_hours: 0
        };
    } catch (err) {
        logger.error('[CALC] Error calculating worked hours', { error: err.message });
        const diffMs = Math.max(0, cout - cin);
        const totalHours = Math.round((diffMs / 3600000) * 100) / 100;
        return {
            worked_hours: Math.min(8, totalHours),
            ot_hours: Math.max(0, totalHours - 8)
        };
    }
}

async function getHistory(query) {
    const page = Number(query.page);
    const limit = Number(query.limit);
    const filter = {};

    if (query.employee_id) {
        filter.employee_id = query.employee_id;
    }

    if (query.device_id) {
        filter.device_id = query.device_id;
    }

    if (query.from || query.to) {
        filter.work_date = {};
        if (query.from) filter.work_date.$gte = startOfDay(query.from);
        if (query.to) filter.work_date.$lte = endOfDay(query.to);
    }

    const [items, total] = await Promise.all([
        Attendance.find(filter)
            .populate('employee_id')
            .sort({ work_date: -1, check_in: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Attendance.countDocuments(filter),
    ]);

    return {
        items,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
        },
    };
}

async function getAttendance(id) {
    const attendance = await Attendance.findById(id).populate('employee_id');
    if (!attendance) {
        throw new AppError('Attendance not found', 404);
    }
    return attendance;
}

async function createAttendance(payload) {
    const { employee_id, work_date, check_in, check_out, method } = payload;
    const today = workDateFromTimestamp(new Date(work_date));
    logger.info('[ATTENDANCE] Manual create', { employee_id, date: today.toISOString() });

    const existing = await Attendance.findOne({
        employee_id,
        work_date: today,
    });

    if (existing) {
        throw new AppError('Attendance record already exists for this date', 409);
    }

    const checkInDate = new Date(check_in);
    const checkOutDate = check_out ? normalizeCheckOutForOvernightShift(checkInDate, check_out) : null;

    let attendance = new Attendance({
        employee_id,
        work_date: today,
        check_in: checkInDate,
        check_out: checkOutDate,
        method: method || 'manual',
        status: check_out ? 'CheckedOut' : 'CheckedIn'
    });

    const assignment = await resolveShiftAssignment(employee_id, today);
    const shiftConfig = applyShiftMetrics(attendance, assignment);

    // Calculate hours if check_out is provided
    if (check_out) {
        const metrics = await calculateWorkedHours(attendance.check_in, attendance.check_out, shiftConfig, attendance.work_date);
        attendance.worked_hours = metrics.worked_hours;
        attendance.ot_hours = metrics.ot_hours;
    }
    await attendance.save();

    return attendance.populate('employee_id');
}

async function updateAttendance(id, payload) {
    let attendance = await Attendance.findById(id);
    if (!attendance) {
        throw new AppError('Attendance not found', 404);
    }

    // Update fields
    Object.assign(attendance, payload);

    if (attendance.check_in && attendance.check_out) {
        attendance.check_out = normalizeCheckOutForOvernightShift(attendance.check_in, attendance.check_out);
    }

    // Auto-update status if check_out is provided and status isn't explicitly set
    if (attendance.check_out && !payload.status) {
        attendance.status = 'CheckedOut';
    }

    const shouldRecalculateHours =
        attendance.check_in &&
        attendance.check_out &&
        (Object.prototype.hasOwnProperty.call(payload, 'check_in') ||
            Object.prototype.hasOwnProperty.call(payload, 'check_out'));

    if (shouldRecalculateHours) {
        const assignment = await resolveShiftAssignment(attendance.employee_id, attendance.work_date);
        const shiftConfig = applyShiftMetrics(attendance, assignment);
        const metrics = await calculateWorkedHours(attendance.check_in, attendance.check_out, shiftConfig, attendance.work_date);
        attendance.worked_hours = metrics.worked_hours;
        attendance.ot_hours = metrics.ot_hours;
    }

    await attendance.save();
    return attendance.populate('employee_id');
}

async function deleteAttendance(id) {
    const attendance = await Attendance.findByIdAndDelete(id);
    if (!attendance) {
        throw new AppError('Attendance not found', 404);
    }
    return attendance;
}

async function dailyReport(date) {
    const start = startOfDay(date);
    const end = endOfDay(date);
    const records = await Attendance.find({ work_date: { $gte: start, $lte: end } }).populate('employee_id');

    return summarize(records, { date: start });
}

async function monthlyReport(year, month) {
    const { start, end } = monthRange(year, month);
    const records = await Attendance.find({ work_date: { $gte: start, $lte: end } }).populate('employee_id');

    return summarize(records, { year: Number(year), month: Number(month) });
}

function summarize(records, period) {
    const totalWorkedHours = records.reduce((sum, item) => sum + (item.worked_hours || 0), 0);
    const totalOTHours = records.reduce((sum, item) => sum + (item.ot_hours || 0), 0);

    return {
        period,
        total_records: records.length,
        checked_in: records.filter((item) => item.status === 'CheckedIn').length,
        checked_out: records.filter((item) => item.status === 'CheckedOut').length,
        total_worked_hours: Math.round(totalWorkedHours * 100) / 100,
        total_ot_hours: Math.round(totalOTHours * 100) / 100,
        records,
    };
}

async function syncFromDevice(payload) {
    const { employee_id, check_in, check_out, device_id, confidence, method } = payload;
    const today = workDateFromTimestamp(new Date(check_in));
    logger.info('[SYNC] Receiving check-in from device', { employee_id, date: today.toISOString(), device_id });
    const mongoose = require('mongoose');

    // Robustness: ensure device_id is a valid ObjectId, otherwise set to null to avoid CastError 400
    const validDeviceId = mongoose.Types.ObjectId.isValid(device_id) ? device_id : null;

    const assignment = await resolveShiftAssignment(employee_id, today);
    const shiftConfig = assignment?.shift_id || null;
    const shiftId = shiftConfig?._id || assignment?.shift_id || null;
    const lateMinutes = calculateLateMinutes(check_in, today, shiftConfig);
    const normalizedCheckOut = check_out ? normalizeCheckOutForOvernightShift(check_in, check_out) : null;

    let attendance = await Attendance.findOneAndUpdate(
        { employee_id, work_date: today },
        {
            $setOnInsert: {
                employee_id,
                work_date: today,
                check_in: new Date(check_in),
                method: method || 'face',
                device_id: validDeviceId,
                confidence: confidence || null,
            },
            $set: {
                shift_id: shiftId,
                late_minutes: lateMinutes,
                ...(normalizedCheckOut
                    ? { check_out: new Date(normalizedCheckOut), status: 'CheckedOut' }
                    : { status: 'CheckedIn' }),
            },
        },
        { upsert: true, new: true },
    );

    // CRITICAL FIX: Tính toán số giờ làm việc khi thiết bị đồng bộ check-out
    if (normalizedCheckOut) {
        const metrics = await calculateWorkedHours(attendance.check_in, attendance.check_out, shiftConfig, attendance.work_date);
        attendance.worked_hours = metrics.worked_hours;
        attendance.ot_hours = metrics.ot_hours;
        await attendance.save();
    }

    return attendance;
}

module.exports = {
    resolveEmployeeByFace,
    sameEmbedding,
    checkIn,
    checkOut,
    getHistory,
    getAttendance,
    createAttendance,
    updateAttendance,
    deleteAttendance,
    dailyReport,
    monthlyReport,
    syncFromDevice,
};
