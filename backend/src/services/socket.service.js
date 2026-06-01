// ============================================
// SERVICIO SOCKET.IO - Tiempo Real
// ============================================

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000
  });

  // Middleware de autenticación
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Token requerido'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.role = decoded.role;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket conectado: ${socket.id} - User: ${socket.userId}`);

    // Unirse a sala de sucursal
    socket.on('join:branch', (branchId) => {
      socket.join(branchId);
      logger.info(`Socket ${socket.id} unido a sucursal: ${branchId}`);
    });

    // Unirse a sala personal
    socket.join(`user:${socket.userId}`);

    // Desconexión
    socket.on('disconnect', (reason) => {
      logger.info(`Socket desconectado: ${socket.id} - Razón: ${reason}`);
    });

    // Ping/Pong
    socket.on('ping', () => socket.emit('pong'));
  });

  logger.info('Socket.io inicializado');
  return io;
};

const getSocket = () => io;

// Emitir a todos los usuarios
const emitToAll = (event, data) => {
  if (io) io.emit(event, data);
};

// Emitir a una sucursal
const emitToBranch = (branchId, event, data) => {
  if (io) io.to(branchId).emit(event, data);
};

// Emitir a un usuario específico
const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

module.exports = { initSocket, getSocket, emitToAll, emitToBranch, emitToUser };
