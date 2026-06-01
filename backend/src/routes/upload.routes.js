const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Guardar directamente en disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  }
});

router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No se subió imagen' });
  const url = `${process.env.API_URL || 'http://localhost:4000'}/uploads/${req.file.filename}`;
  res.json({ success: true, data: { url, filename: req.file.filename } });
});

router.post('/images', upload.array('images', 10), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ success: false, error: 'No se subieron imágenes' });
  const urls = req.files.map(f => `${process.env.API_URL || 'http://localhost:4000'}/uploads/${f.filename}`);
  res.json({ success: true, data: { urls } });
});

module.exports = router;
