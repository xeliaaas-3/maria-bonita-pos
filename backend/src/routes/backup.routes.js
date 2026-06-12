const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { isAdmin } = require('../middleware/auth.middleware');
const { runBackup } = require('../services/backup.service');

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';

// Listar backups disponibles
router.get('/', isAdmin, (req, res) => {
  if (!fs.existsSync(BACKUP_DIR)) return res.json({ success: true, data: [] });
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql.gz'))
    .map(f => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size: stats.size, createdAt: stats.mtime };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json({ success: true, data: files });
});

// Generar backup manual
router.post('/', isAdmin, (req, res) => {
  runBackup();
  res.json({ success: true, message: 'Backup iniciado' });
});

// Descargar un backup
router.get('/:name', isAdmin, (req, res) => {
  const name = path.basename(req.params.name);
  const filePath = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Backup no encontrado' });
  }
  res.download(filePath);
});

module.exports = router;
