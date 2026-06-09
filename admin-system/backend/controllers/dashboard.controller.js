const { Employee, Attendance, LeaveRequest, Payroll } = require('../models');
const AppError = require('../utils/AppError');
const { startOfDay, endOfDay, subMonths, startOfMonth, endOfMonth } = require('../utils/date');

async function getDashboardMetrics(req, res, next) {
    try {
        const today = startOfDay();
        const endOfToday = endOfDay();

        // 1. Headcount & Department distribution
        const [totalEmployees, activeEmployees, departmentCounts] = await Promise.all([
            Employee.countDocuments(),
            Employee.countDocuments({ status: 'Active' }),
            Employee.aggregate([
                { $match: { status: 'Active' } },
                // Employee.department là String trực tiếp (vd: 'Kế toán'), không phải ObjectId
                { $group: { _id: '$department', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);

        const departmentDistribution = departmentCounts.map(d => ({
            name: d._id || 'Chưa phân công',
            value: d.count
        }));

        // 2. Today's Attendance
        const [presentCount, leaveRequestsToday] = await Promise.all([
            Attendance.countDocuments({
                work_date: today,
                check_in: { $exists: true }
            }),
            LeaveRequest.countDocuments({
                status: 'Approved',
                start_date: { $lte: endOfToday },
                end_date: { $gte: today }
            })
        ]);

        const absentCount = Math.max(0, activeEmployees - presentCount - leaveRequestsToday);

        const attendanceStats = {
            present: presentCount,
            on_leave: leaveRequestsToday,
            absent: absentCount,
            total: activeEmployees
        };

        // 3. Payroll Expenses Trend (Last 6 months)
        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
        const payrollData = await Payroll.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }, // assuming payrolls are created in their respective months
                    status: 'Finalized'
                }
            },
            {
                $group: {
                    _id: { year: '$year', month: '$month' },
                    totalSalary: { $sum: '$net_salary' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const payrollTrend = payrollData.map(p => ({
            month: `${p._id.month}/${p._id.year}`,
            amount: p.totalSalary
        }));

        // 4. Pending Requests for HR
        const pendingLeaves = await LeaveRequest.find({ status: 'Pending' })
            .populate('employee_id', 'full_name employee_code')
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            data: {
                headcount: {
                    total: totalEmployees,
                    active: activeEmployees,
                    departments: departmentDistribution
                },
                attendance: attendanceStats,
                payrollTrend: payrollTrend,
                recentPendingRequests: pendingLeaves.map(l => ({
                    _id: l._id,
                    employee_name: l.employee_id?.full_name,
                    type: l.type,
                    createdAt: l.createdAt
                }))
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getDashboardMetrics
};
