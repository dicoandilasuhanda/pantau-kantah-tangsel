const multer = require('multer');
const path = require('path');
const fs = require('fs');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function createUploadErrorHandler(uploader, fieldName, limitErrorMsg, genericErrorMsg) {
  return (req, res, next) => {
    uploader.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: limitErrorMsg });
        }
        return res.status(400).json({ error: err.message || genericErrorMsg });
      }
      next();
    });
  };
}

/**
 * Factory middleware unggahan Multer untuk Surat PDF, Avatar Profil, dan DWG AutoCAD.
 * Directory paths wajib dipassing dari root backend (server.js) agar konsisten dengan volume Docker.
 */
function createUploadMiddlewares({ uploadDir, avatarDir, dwgDir }) {
  ensureDir(uploadDir);
  ensureDir(avatarDir);
  ensureDir(dwgDir);

  // 1. Upload PDF Surat (Max 15 MB)
  const pdfStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });
  const pdfUpload = multer({
    storage: pdfStorage,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== '.pdf' || file.mimetype !== 'application/pdf') {
        return cb(new Error('Hanya file dokumen PDF yang diperbolehkan!'));
      }
      cb(null, true);
    },
  });
  const handlePdfUpload = createUploadErrorHandler(
    pdfUpload,
    'pdf_file',
    'Ukuran file PDF melebihi batas maksimal 15 MB.',
    'Gagal memproses file unggahan.'
  );

  // 2. Upload Foto Profil Avatar (Max 5 MB)
  const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, 'avatar-' + req.user.id + '-' + Date.now() + ext);
    },
  });
  const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowed.includes(ext)) {
        return cb(new Error('Hanya file gambar (JPG, JPEG, PNG, WEBP) yang diperbolehkan!'));
      }
      cb(null, true);
    },
  });
  const handleAvatarUpload = createUploadErrorHandler(
    avatarUpload,
    'avatar',
    'Ukuran foto melebihi batas maksimal 5 MB.',
    'Gagal memproses unggahan foto.'
  );

  // 3. Upload File DWG AutoCAD (Max 100 MB)
  const dwgStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dwgDir),
    filename: (req, file, cb) => {
      const uniqueSuffix =
        'dwg-' + req.user.id + '-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + '.dwg';
      cb(null, uniqueSuffix);
    },
  });
  const dwgUpload = multer({
    storage: dwgStorage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== '.dwg') {
        return cb(new Error('Hanya file dokumen AutoCAD (.dwg) yang diperbolehkan!'));
      }
      cb(null, true);
    },
  });
  const handleDwgUpload = createUploadErrorHandler(
    dwgUpload,
    'dwg_file',
    'Ukuran file DWG melebihi batas maksimal 100 MB.',
    'Gagal memproses unggahan file DWG.'
  );

  return {
    handlePdfUpload,
    handleAvatarUpload,
    handleDwgUpload,
  };
}

module.exports = {
  createUploadMiddlewares,
};
