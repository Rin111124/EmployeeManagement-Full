const { Employee, Department, Contract, EmployeePosition } = require('../models');
const AppError = require('../utils/AppError');

/**
 * POST /api/v1/departments/:id/transfer
 * Body: { employee_ids: [...], reason?: string }
 *
 * Quy trình:
 *   1. Validate department đích tồn tại
 *   2. Với mỗi nhân viên:
 *      a. Đọc department_code prefix để generate mã NV mới
 *      b. Cập nhật employee.department
 *      c. Tạo bản ghi EmployeePosition mới (lịch sử điều chuyển)
 *      d. Nếu department đích có default_allowances → cập nhật contract hiện tại
 */
async function transferEmployees(req, res, next) {
    try {
        const { id: targetDeptId } = req.params;
        const { employee_ids, reason } = req.body;

        if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
            throw new AppError('employee_ids must be a non-empty array', 400);
        }

        const targetDept = await Department.findById(targetDeptId);
        if (!targetDept) throw new AppError('Target department not found', 404);

        const results = [];
        const errors = [];

        for (const empId of employee_ids) {
            try {
                const employee = await Employee.findById(empId);
                if (!employee) {
                    errors.push({ employee_id: empId, error: 'Employee not found' });
                    continue;
                }

                const oldDept = employee.department;

                // 1. Cập nhật department trên Employee
                employee.department = targetDept.department_name;

                // 2. Cập nhật employee_code prefix nếu department có code
                if (targetDept.department_code) {
                    // Giữ nguyên phần số, chỉ đổi prefix
                    // Ví dụ: BGD-001 → SX-001
                    const numPart = employee.employee_code.replace(/^[A-Z-]+-/, '');
                    employee.employee_code = `${targetDept.department_code}-${numPart}`;
                }

                await employee.save();

                // 3. Tạo bản ghi EmployeePosition mới (lịch sử điều chuyển)
                await EmployeePosition.create({
                    employee_id: empId,
                    department_id: targetDeptId,
                    position_name: employee.position || 'Staff',
                    start_date: new Date(),
                    is_current: true,
                    // Kết thúc bản ghi position cũ
                });

                // 4. Nếu có default_allowances → cập nhật lên contract mới nhất
                if (targetDept.default_allowances && targetDept.default_allowances.length > 0) {
                    const latestContract = await Contract.findOne({ employee_id: empId })
                        .sort({ start_date: -1 });

                    if (latestContract) {
                        // Merge: giữ allowances cũ không trùng tên, thêm allowances mới từ dept
                        const newAllowanceNames = targetDept.default_allowances.map(a => a.name);
                        const filteredOld = (latestContract.allowances || []).filter(
                            a => !newAllowanceNames.includes(a.name)
                        );
                        latestContract.allowances = [...filteredOld, ...targetDept.default_allowances];
                        await latestContract.save();
                    }
                }

                results.push({
                    employee_id: empId,
                    full_name: employee.full_name,
                    new_employee_code: employee.employee_code,
                    from_department: oldDept,
                    to_department: targetDept.department_name,
                });
            } catch (err) {
                errors.push({ employee_id: empId, error: err.message });
            }
        }

        res.status(200).json({
            success: true,
            message: `Transferred ${results.length} employee(s) to ${targetDept.department_name}`,
            data: { transferred: results, errors },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/departments/tree
 * Trả về cây phòng ban đệ quy để render tree view
 */
async function getDepartmentTree(req, res, next) {
    try {
        const all = await Department.find({})
            .populate('manager_id', 'full_name employee_code')
            .sort({ level: 1, department_name: 1 })
            .lean();

        // Build children count & employee count
        const Employee = require('../models').Employee;
        const deptNames = {};
        all.forEach(d => { deptNames[d._id.toString()] = d.department_name; });

        const empCounts = await Employee.aggregate([
            { $group: { _id: '$department', count: { $sum: 1 } } }
        ]);
        const empCountMap = {};
        empCounts.forEach(e => { empCountMap[e._id] = e.count; });

        // Build tree
        const map = {};
        all.forEach(d => {
            map[d._id.toString()] = { ...d, children: [], employee_count: empCountMap[d.department_name] || 0 };
        });

        const roots = [];
        all.forEach(d => {
            if (d.parent_id) {
                const parent = map[d.parent_id.toString()];
                if (parent) parent.children.push(map[d._id.toString()]);
                else roots.push(map[d._id.toString()]);
            } else {
                roots.push(map[d._id.toString()]);
            }
        });

        res.status(200).json({ success: true, data: roots });
    } catch (err) {
        next(err);
    }
}

module.exports = { transferEmployees, getDepartmentTree };
