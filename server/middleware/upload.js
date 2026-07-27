const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// On Vercel serverless, filesystem is read-only except /tmp
const UPLOADS_DIR = isVercel
    ? path.join(os.tmpdir(), 'uploads/avatars')
    : path.join(__dirname, '../../public/uploads/avatars');

const ensureUploadDir = () => {
    try {
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
    } catch (err) {
        console.error('[Upload Dir Error]', err);
    }
};

ensureUploadDir();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadDir();
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const rawExt = path.extname(file.originalname || '').toLowerCase();
        const ext = rawExt || '.jpg';
        const userId = req.userId || 'user';
        const uniqueName = `avatar_${userId}_${Date.now()}${ext}`;
        cb(null, uniqueName);
    }
});

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

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max
});

module.exports = { upload, UPLOADS_DIR, isVercel };
