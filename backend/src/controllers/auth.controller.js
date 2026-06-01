// ============================================
// CONTROLADOR DE AUTENTICACIÓN
// ============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { sendEmail } = require('../services/email.service');
const { getRedis } = require('../utils/redis');

const prisma = new PrismaClient();

// Generar tokens
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, tokenId: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { branch: { select: { id: true, name: true } } }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales incorrectas'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales incorrectas'
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    // Guardar sesión
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        device: req.headers['user-agent'],
        ip: req.ip,
        expiresAt
      }
    });

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Log de actividad
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Error al iniciar sesión' });
  }
};

// REFRESH TOKEN
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token requerido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Refresh token inválido' });
    }

    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ success: false, error: 'Sesión expirada' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      session.user.id,
      session.user.role
    );

    // Rotar refresh token
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt
      }
    });

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({ success: false, error: 'Error al renovar sesión' });
  }
};

// LOGOUT
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.userSession.deleteMany({
        where: { refreshToken }
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'LOGOUT',
        ip: req.ip
      }
    });

    res.json({ success: true, message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Error al cerrar sesión' });
  }
};

// PERFIL ACTUAL
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, phone: true, branchId: true,
        lastLogin: true, createdAt: true,
        branch: { select: { id: true, name: true } }
      }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener perfil' });
  }
};

// CAMBIAR CONTRASEÑA
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Contraseña actual incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    // Invalidar todas las sesiones
    await prisma.userSession.deleteMany({ where: { userId: req.user.id } });

    await prisma.activityLog.create({
      data: { userId: req.user.id, action: 'CHANGE_PASSWORD', ip: req.ip }
    });

    res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al cambiar contraseña' });
  }
};

// SOLICITAR RESET DE CONTRASEÑA
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Siempre responder igual por seguridad
    const response = { 
      success: true, 
      message: 'Si el email existe, recibirás instrucciones' 
    };

    if (!user) return res.json(response);

    const resetToken = uuidv4();
    const redis = getRedis();
    
    await redis.setex(`reset:${resetToken}`, 3600, user.id);

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: email,
      subject: 'Recuperar contraseña - Boutique POS',
      html: `
        <h2>Recuperar Contraseña</h2>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>Este enlace expira en 1 hora.</p>
      `
    });

    res.json(response);
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Error al procesar solicitud' });
  }
};

// RESETEAR CONTRASEÑA
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const redis = getRedis();

    const userId = await redis.get(`reset:${token}`);

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Token inválido o expirado' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    await redis.del(`reset:${token}`);
    await prisma.userSession.deleteMany({ where: { userId } });

    res.json({ success: true, message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al restablecer contraseña' });
  }
};
