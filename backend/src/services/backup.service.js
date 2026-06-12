// ============================================
// SERVICIO DE BACKUPS AUTOMÁTICOS (pg_dump)
// ============================================

const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 30);
const SCHEDULE = process.env.BACKUP_SCHEDULE || '0 2 * * *';

const runBackup = () => {
  if (!process.env.DATABASE_URL) {
    logger.warn('Backup omitido: DATABASE_URL no definido');
    return;
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(BACKUP_DIR, `backup-${timestamp}.sql.gz`);

  const cmd = `pg_dump "${process.env.DATABASE_URL}" | gzip > "${filePath}"`;

  exec(cmd, { shell: '/bin/sh' }, (error) => {
    if (error) {
      logger.error('Error al generar backup:', error.message);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }
    logger.info(`Backup generado: ${filePath}`);
    cleanOldBackups();
  });
};

const cleanOldBackups = () => {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const now = Date.now();
  const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;

  for (const file of fs.readdirSync(BACKUP_DIR)) {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
      logger.info(`Backup antiguo eliminado: ${file}`);
    }
  }
};

const initBackupSchedule = () => {
  if (!cron.validate(SCHEDULE)) {
    logger.warn(`BACKUP_SCHEDULE invalido (${SCHEDULE}), backups automaticos deshabilitados`);
    return;
  }
  cron.schedule(SCHEDULE, runBackup);
  logger.info(`Backups automáticos programados: "${SCHEDULE}" (retención ${RETENTION_DAYS} días)`);
};

module.exports = { initBackupSchedule, runBackup, cleanOldBackups };
