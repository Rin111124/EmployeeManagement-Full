const xss = require('xss');

function sanitizeValue(value) {
    if (typeof value === 'string') {
        return xss(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item));
    }

    if (value && typeof value === 'object') {
        Object.keys(value).forEach((key) => {
            const sanitizedKey = key.replace(/^\$+/, '').replace(/\./g, '_');
            
            // Skip XSS for binary/image fields
            const shouldSkipXSS = ['avatar', 'captured_image', 'face_data', 'embedding'].includes(key);
            const sanitizedValue = shouldSkipXSS ? value[key] : sanitizeValue(value[key]);

            if (sanitizedKey !== key) {
                delete value[key];
            }
            value[sanitizedKey] = sanitizedValue;
        });
    }

    return value;
}

const requestSanitizer = (req, res, next) => {
    sanitizeValue(req.body);
    sanitizeValue(req.query);
    sanitizeValue(req.params);
    next();
};

module.exports = {
    requestSanitizer,
};
