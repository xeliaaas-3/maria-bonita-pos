const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { isAdmin } = require('../middleware/auth.middleware');
const prisma = new PrismaClient();

// List users
router.get('/', isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, avatar: true, phone: true, branchId: true, isActive: true, lastLogin: true, createdAt: true, branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: users });
  } catch { res.status(500).json({ success: false, error: 'Error al obtener usuarios' }); }
});

// Create user
router.post('/', isAdmin, async (req, res) => {
  try {
    const { name, email, password, role, branchId, phone } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ success: false, error: 'Email ya registrado' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, branchId, phone },
      select: { id: true, name: true, email: true, role: true, branchId: true }
    });
    res.status(201).json({ success: true, data: user });
  } catch { res.status(500).json({ success: false, error: 'Error al crear usuario' }); }
});

// Update user
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { name, role, branchId, phone, isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, role, branchId, phone, isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });
    res.json({ success: true, data: user });
  } catch { res.status(500).json({ success: false, error: 'Error al actualizar usuario' }); }
});

// Reset password
router.patch('/:id/reset-password', isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } });
    await prisma.userSession.deleteMany({ where: { userId: req.params.id } });
    res.json({ success: true, message: 'Contraseña restablecida' });
  } catch { res.status(500).json({ success: false, error: 'Error al restablecer contraseña' }); }
});

module.exports = router;
