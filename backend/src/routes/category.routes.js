// ============================================
// CATEGORY ROUTES
// ============================================
const catRouter = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { isAdmin } = require('../middleware/auth.middleware');
const prisma = new PrismaClient();

catRouter.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch { res.status(500).json({ success: false, error: 'Error' }); }
});

catRouter.post('/', isAdmin, async (req, res) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    res.status(201).json({ success: true, data: category });
  } catch { res.status(500).json({ success: false, error: 'Error al crear categoría' }); }
});

catRouter.put('/:id', isAdmin, async (req, res) => {
  try {
    const category = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: category });
  } catch { res.status(500).json({ success: false, error: 'Error al actualizar' }); }
});

catRouter.delete('/:id', isAdmin, async (req, res) => {
  try {
    await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Categoría eliminada' });
  } catch { res.status(500).json({ success: false, error: 'Error al eliminar' }); }
});

module.exports = catRouter;

// ============================================
// BRAND ROUTES (separate file stub)
// ============================================
