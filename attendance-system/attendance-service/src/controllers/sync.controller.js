const LocalEmployee = require('../models/LocalEmployee');

function normalizeEmbedding(value) {
    return Array.isArray(value) && value.every((item) => typeof item === 'number')
        ? value
        : null;
}

// @desc    Sync employee data from Admin System
// @route   POST /api/sync/employees
// @access  Internal (Admin System only)
exports.syncEmployees = async (req, res) => {
    try {
        const { employees } = req.body;

        if (!Array.isArray(employees)) {
            return res.status(400).json({ success: false, message: 'Invalid data format' });
        }

        const operations = employees.map(emp => {
            const setFields = {
                employee_code: emp.employee_code,
                full_name: emp.full_name,
                department: typeof emp.department === 'object' ? emp.department.department_name : emp.department,
                position: emp.position,
                status: emp.status || 'Active',
                last_sync: Date.now()
            };

            const embedding = normalizeEmbedding(emp.face_embedding);
            if (embedding && embedding.length > 0) {
                setFields.face_embedding = embedding;
            }

            return {
                updateOne: {
                    filter: { employee_id: emp.employee_id || emp._id },
                    update: { $set: setFields },
                    upsert: true
                }
            };
        });

        await LocalEmployee.bulkWrite(operations);

        res.status(200).json({
            success: true,
            message: `Synced ${employees.length} employees`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Update face embedding for an employee
// @route   PUT /api/sync/face/:id
exports.updateFaceEmbedding = async (req, res) => {
    try {
        const embedding = normalizeEmbedding(req.body.embedding);
        const { id } = req.params;

        if (!embedding || embedding.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid embedding' });
        }

        const employee = await LocalEmployee.findOneAndUpdate(
            { employee_id: id },
            { face_embedding: embedding },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.status(200).json({ success: true, data: employee });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
