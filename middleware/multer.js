// middleware/multer.js
const multer = require('multer');

// memory storage so we can upload buffer to Cloudinary
const storage = multer.memoryStorage();

// limits
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB per file
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only jpg, png and webp are allowed.'));
    }
};

const multipleUpload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: 5 },
    fileFilter
}).array('files', 5);

const singleUpload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter
}).single('file');

// New: fields upload for category (image + icon)
const fieldsUpload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: 2 },
    fileFilter
  }).fields([
    { name: 'image', maxCount: 1 },
    { name: 'icon', maxCount: 1 }
  ]);

module.exports = { singleUpload, multipleUpload, fieldsUpload };
