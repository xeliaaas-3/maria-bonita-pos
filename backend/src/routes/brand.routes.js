const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { isAdmin } = require('../middleware/auth.middleware');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: brands });
  } catch { res.status(500).json({ success: false, error: 'Error' }); }
});

router.post('/', isAdmin, async (req, res) => {
  try {
    const brand = await prisma.brand.create({ data: req.body });
    res.status(201).json({ success: true, data: brand });
  } catch { res.status(500).json({ success: false, error: 'Error al crear marca' }); }
});

router.put('/:id', isAdmin, async (req, res) => {
  try {
    const brand = await prisma.brand.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: brand });
  } catch { res.status(500).json({ success: false, error: 'Error al actualizar' }); }
});

router.delete('/:id', isAdmin, async (req, res) => {
  try {
    await prisma.brand.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Marca eliminada' });
  } catch { res.status(500).json({ success: false, error: 'Error al eliminar' }); }
});

module.exports = router;
