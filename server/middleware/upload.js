const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const UPLOADS_DIR = isVercel
    ? path.join(os.tmpdir(), 'uploads/avatars')
    : path.join(__dirname, '../../public/uploads/avatars');

const fileFilter = (req, file, cb) => {
    if (!file || !file.originalname) {
        return cb(new Error('Archivo inválido'), false);
    }
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    const ext = path.extname(file.originalname);
    if (!allowed.test(ext)) {
        return cb(new Error('Solo se permiten imágenes (jpg, jpeg, png, gif, webp)'), false);
    }
    cb(null, true);
};

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 4.5 * 1024 * 1024 } // 4.5 MB max for Vercel payload limit
});

module.exports = { upload, UPLOADS_DIR, isVercel };

