/**
 * utils/imageValidation.js
 * Xác thực Magic Bytes (file signature) thực tế của buffer ảnh để ngăn chặn
 * việc upload các tệp thực thi / script độc hại giả mạo phần mở rộng file ảnh.
 */

const ALLOWED_IMAGE_TYPES = {
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    WEBP: 'image/webp',
    GIF: 'image/gif',
};

/**
 * Kiểm tra xem buffer có phải là định dạng ảnh hợp lệ dựa trên magic bytes hay không.
 * @param {Buffer} buffer - Buffer của tệp upload
 * @returns {{ valid: boolean, mime: string|null }}
 */
function validateImageMagicBytes(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
        return { valid: false, mime: null };
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { valid: true, mime: ALLOWED_IMAGE_TYPES.JPEG };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return { valid: true, mime: ALLOWED_IMAGE_TYPES.PNG };
    }

    // WEBP: RIFF....WEBP (0..3 is "RIFF", 8..11 is "WEBP")
    if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) {
        return { valid: true, mime: ALLOWED_IMAGE_TYPES.WEBP };
    }

    // GIF: "GIF87a" hoặc "GIF89a"
    if (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38 &&
        (buffer[4] === 0x37 || buffer[4] === 0x39) &&
        buffer[5] === 0x61
    ) {
        return { valid: true, mime: ALLOWED_IMAGE_TYPES.GIF };
    }

    return { valid: false, mime: null };
}

module.exports = {
    validateImageMagicBytes,
    ALLOWED_IMAGE_TYPES,
};
