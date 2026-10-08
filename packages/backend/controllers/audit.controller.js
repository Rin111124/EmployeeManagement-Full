const { AuditLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const listAuditLogs = asyncHandler(async (req, res) => {
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);
    const filter = {};

    if (req.query.user_id) filter.user_id = req.query.user_id;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.target_type) filter['target.type'] = req.query.target_type;

    if (req.query.from || req.query.to) {
        filter.timestamp = {};
        if (req.query.from) filter.timestamp.$gte = req.query.from;
        if (req.query.to) filter.timestamp.$lte = req.query.to;
    }

    const [items, total] = await Promise.all([
        AuditLog.find(filter)
            .populate('user_id')
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        AuditLog.countDocuments(filter),
    ]);

    res.json({
        success: true,
        data: {
            items,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        },
    });
});

module.exports = {
    listAuditLogs,
};
