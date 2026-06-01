// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`${err.message}`, { stack: err.stack, url: req.url, method: req.method });

  if (err.code === 'P2002') {
    return res.status(400).json({ success: false, error: 'Ya existe un registro con esos datos' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, error: 'Registro no encontrado' });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Error interno del servidor'
    : err.message;

  res.status(status).json({ success: false, error: message });
};

module.exports = { errorHandler };
