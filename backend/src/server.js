// ============================================
// BOUTIQUE POS - Servidor Principal
// ============================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { initSocket } = require('./services/socket.service');
const { initBackupSchedule } = require('./services/backup.service');
const { logger } = require('./utils/logger');
const { connectRedis } = require('./utils/redis');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();
const server = http.createServer(app);

// Trust proxy (necesario detrás de nginx/docker)
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARES GLOBALES
// ============================================

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS: soporte para multiples origenes
const allowedOrigins = [
  process.env.CORS_ORIGINS,
  process.env.SOCKET_CORS_ORIGIN,
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean).flatMap(o => o.split(',')).map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, curl, Railway healthcheck)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // En desarrollo permitir todo
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: msg => logger.http(msg.trim()) }
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intente más tarde' }
});

app.use('/api', limiter);

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// RUTAS
// ============================================
app.use('/api/v1', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use(errorHandler);

// ============================================
// SOCKET.IO
// ============================================
initSocket(server);

// ============================================
// INICIO DEL SERVIDOR
// ============================================
const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await connectRedis();
    logger.info('Redis conectado');

    server.listen(PORT, () => {
      logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
      logger.info(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API: http://localhost:${PORT}/api/v1`);
      initBackupSchedule();
    });
  } catch (error) {
    logger.error('Error al iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server };
