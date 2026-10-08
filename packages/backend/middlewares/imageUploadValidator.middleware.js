/**
 * middlewares/imageUploadValidator.middleware.js
 * Middleware xác thực magic bytes của file ảnh trước khi đưa vào controller xử lý.
 */

const { validateImageMagicBytes } = require('../utils/imageValidation');
const AppError = require('../utils/AppError');

function requireValidImage(fieldName = 'file') {
    return (req, res, next) => {
        const file = req.file || (req.files && req.files[fieldName]);
        if (!file) {
            return next(); // Nếu không có file (optional), để controller hoặc schema kiểm tra tiếp
        }

        const buffer = file.buffer;
        if (!buffer) {
            return next(new AppError('Uploaded file stream is empty', 400));
        }

        const result = validateImageMagicBytes(buffer);
        if (!result.valid) {
            return next(
                new AppError(
                    'Invalid file format: File signature does not match a valid image (JPEG, PNG, WEBP, GIF)',
                    400
                )
            );
        }

        // Đồng bộ mime type thực tế từ magic bytes
        file.mimetype = result.mime;
        next();
    };
}

module.exports = {
    requireValidImage,
};
