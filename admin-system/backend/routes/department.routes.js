const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { MANAGEMENT_ROLES } = require('../constants/roles');
const { transferEmployees, getDepartmentTree } = require('../controllers/department.controller');

const router = express.Router();

router.use(authenticate);

// Cây phòng ban (mọi user đã đăng nhập đều xem được)
router.get('/tree', getDepartmentTree);

// Điều chuyển nhân sự — chỉ Admin/HR
router.post('/:id/transfer', authorize(...MANAGEMENT_ROLES), transferEmployees);

module.exports = router;
