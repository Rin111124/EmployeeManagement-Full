const express = require('express');
const { authenticate, authorize, authorizeSelfOrRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { idParamSchema } = require('../validators/common.validator');

function createCrudRouter(controller, schemas, options = {}) {
    const router = express.Router();
    const roles = options.roles || ['Admin'];
    const enforceOwnListFilter = (req, _res, next) => {
        if (!options.allowEmployeeListOwn || !options.selfFilter) {
            return next();
        }

        const userRoles = req.user?.roles || [];
        const isManagement = roles.some((role) => userRoles.includes(role));
        if (!isManagement) {
            const employeeId = req.user?.employee_id?._id || req.user?.employee_id;
            if (employeeId) {
                req.query[options.selfFilter] = employeeId.toString();
            }
        }

        return next();
    };

    router.use(authenticate);

    const listMiddlewares = options.allowEmployeeListOwn
        ? [enforceOwnListFilter, validate(schemas.listQuery, 'query')]
        : [authorize(...roles), validate(schemas.listQuery, 'query')];

    router
        .route('/')
        .get(...listMiddlewares, controller.list)
        .post(authorize(...roles), validate(schemas.create), controller.create);

    router
        .route('/bulk')
        .post(authorize(...roles), validate(schemas.bulk || schemas.create), controller.bulkCreate);

    router
        .route('/:id')
        .get(
            validate(idParamSchema, 'params'),
            options.ownerResolver
                ? authorizeSelfOrRoles(options.ownerResolver, ...roles)
                : authorize(...roles),
            controller.get,
        )
        .patch(authorize(...roles), validate(idParamSchema, 'params'), validate(schemas.update), controller.update)
        .delete(authorize(...roles), validate(idParamSchema, 'params'), controller.remove);

    return router;
}

module.exports = createCrudRouter;
