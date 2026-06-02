const router   = require('express').Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');

// ─── R2 / S3 setup (solo si hay credenciales configuradas) ───────────────────
let useR2 = false;
let s3Client, multerS3;

if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ACCOUNT_ID) {
  try {
    const { S3Client } = require('@aws-sdk/client-s3');
    multerS3 = require('multer-s3');
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    useR2 = true;
    console.log('✅ Cloudflare R2 configurado para uploads');
  } catch (e) {
    console.warn('⚠️  R2 no disponible, usando disco local:', e.message);
  }
}

// ─── Storage: R2 o disco local ───────────────────────────────────────────────
const getStorage = () => {
  if (useR2) {
    return multerS3({
      s3:          s3Client,
      bucket:      process.env.R2_BUCKET || 'maria-bonita-uploads',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `uploads/${uuidv4()}${ext}`);
      },
    });
  }
  // Fallback: disco local
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${uuidv4()}${ext}`);
    },
  });
};

const upload = multer({
  storage: getStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── Helpers para obtener la URL pública ─────────────────────────────────────
const getFileUrl = (file) => {
  if (useR2) {
    // URL pública del bucket R2
    const publicBase = process.env.R2_PUBLIC_URL || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET || 'maria-bonita-uploads'}`;
    return `${publicBase}/${file.key}`;
  }
  return `${process.env.BASE_URL || process.env.API_URL || 'http://localhost:4000'}/uploads/${file.filename}`;
};

// ─── Rutas ────────────────────────────────────────────────────────────────────
router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No se subio imagen' });
  const url = getFileUrl(req.file);
  res.json({ success: true, data: { url, filename: req.file.key || req.file.filename } });
});

router.post('/images', upload.array('images', 10), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ success: false, error: 'No se subieron imagenes' });
  const urls = req.files.map(f => getFileUrl(f));
  res.json({ success: true, data: { urls } });
});

module.exports = router;
