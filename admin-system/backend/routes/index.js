const express = require('express');

// ── Feature routes (custom logic beyond simple CRUD) ─────────────────────────
const authRoutes = require('./auth.routes');
const employeeRoutes = require('./employee.routes');
const attendanceRoutes = require('./attendance.routes');
const auditRoutes = require('./audit.routes');
const departmentCustomRoutes = require('./department.routes');   // Tree + transfer (must be before generic CRUD)
const contractCustomRoutes = require('./contract.routes');       // Generate HTML, print-preview (must be before generic CRUD)
const leaveWorkflowRoutes = require('./leaveRequest.routes');    // Approve/reject workflow
const overtimeWorkflowRoutes = require('./overtime.routes');     // Approve/reject workflow
const payrollWorkflowRoutes = require('./payroll.routes');       // Generate payroll action
const settingRoutes = require('./setting.routes');
const dashboardRoutes = require('./dashboard.routes');
const deviceRoutes = require('./device.routes');
const biometricRoutes = require('./biometric.routes');
const chatbotRoutes = require('./chatbot.routes');

// ── Generic CRUD routes (factory-generated) ───────────────────────────────────
const {
    assetRoutes,
    contractRoutes,
    contractTemplateRoutes,
    departmentRoutes,
    employeePositionRoutes,
    faceLogRoutes,
    leaveRequestRoutes,
    overtimeRoutes,
    payrollRoutes,
    shiftAssignmentRoutes,
    shiftRoutes,
    trainingRoutes,
} = require('./adminResources.routes');

// ─────────────────────────────────────────────────────────────────────────────
const router = express.Router();

router.get('/ping', (req, res) => res.json({ message: 'pong', timestamp: new Date() }));

// Auth
router.use('/auth', authRoutes);

// Employees
router.use('/employees', employeeRoutes);

// Attendance
router.use('/attendance', attendanceRoutes);

// Audit
router.use('/audit-logs', auditRoutes);

// Departments — custom routes (tree, transfer) BEFORE generic CRUD
router.use('/departments', departmentCustomRoutes);
router.use('/departments', departmentRoutes);

// HR Resources
router.use('/employee-positions', employeePositionRoutes);
router.use('/shifts', shiftRoutes);
router.use('/shift-assignments', shiftAssignmentRoutes);

// Leave & Overtime — workflow routes BEFORE generic CRUD
router.use('/leave-requests', leaveWorkflowRoutes);
router.use('/leave-requests', leaveRequestRoutes);
router.use('/overtime', overtimeWorkflowRoutes);
router.use('/overtime', overtimeRoutes);

// Contracts — custom routes (HTML generate, print-preview) BEFORE generic CRUD
router.use('/contracts', contractCustomRoutes);
router.use('/contracts', contractRoutes);

// Contract Templates (generic CRUD)
router.use('/contract-templates', contractTemplateRoutes);

// Payroll — workflow (generate) BEFORE generic CRUD
router.use('/payroll', payrollWorkflowRoutes);
router.use('/payroll', payrollRoutes);

// Other resources
router.use('/assets', assetRoutes);
router.use('/training', trainingRoutes);
router.use('/face-logs', faceLogRoutes);
router.use('/settings', settingRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/devices', deviceRoutes);
router.use('/chatbot', chatbotRoutes);

// Biometric (mounted at root /api/v1/ for legacy device compatibility)
router.use('/', biometricRoutes);

module.exports = router;
