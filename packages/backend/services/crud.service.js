const AppError = require('../utils/AppError');

function buildFilter(query, options = {}) {
    const filter = {};

    (options.allowedFilters || []).forEach((field) => {
        if (query[field] !== undefined && query[field] !== null && query[field] !== '') {
            filter[field] = query[field];
        }
    });

    if (query.search && options.searchFields?.length) {
        filter.$or = options.searchFields.map((field) => ({
            [field]: new RegExp(query.search, 'i'),
        }));
    }

    if ((query.from || query.to) && options.dateField) {
        filter[options.dateField] = {};
        if (query.from) filter[options.dateField].$gte = query.from;
        if (query.to) filter[options.dateField].$lte = query.to;
    }

    return filter;
}

function applyPopulate(queryBuilder, populate) {
    if (!populate) return queryBuilder;
    return queryBuilder.populate(populate);
}

function createCrudService(Model, options = {}) {
    async function create(payload) {
        const document = await Model.create(payload);
        if (!options.populate) return document;
        return Model.findById(document._id).populate(options.populate);
    }

    async function update(id, payload) {
        let query = Model.findByIdAndUpdate(id, payload, {
            returnDocument: 'after',
            runValidators: true,
        });
        query = applyPopulate(query, options.populate);

        const document = await query;
        if (!document) {
            throw new AppError(`${options.resourceName || 'Resource'} not found`, 404);
        }

        return document;
    }

    async function remove(id) {
        const document = await Model.findByIdAndDelete(id);
        if (!document) {
            throw new AppError(`${options.resourceName || 'Resource'} not found`, 404);
        }
        return document;
    }

    async function get(id) {
        let query = Model.findById(id);
        query = applyPopulate(query, options.populate);

        const document = await query;
        if (!document) {
            throw new AppError(`${options.resourceName || 'Resource'} not found`, 404);
        }

        return document;
    }

    async function list(queryParams) {
        const page = Math.max(1, Number(queryParams.page) || 1);
        const limit = Math.max(1, Number(queryParams.limit) || 20);
        const filter = buildFilter(queryParams, options);
        const sort = options.sort || { createdAt: -1 };

        let itemsQuery = Model.find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit);
        itemsQuery = applyPopulate(itemsQuery, options.populate);

        const [items, total] = await Promise.all([
            itemsQuery,
            Model.countDocuments(filter),
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

    return {
        create,
        update,
        remove,
        get,
        list,
    };
}

module.exports = createCrudService;
