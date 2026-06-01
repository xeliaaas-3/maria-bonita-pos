// branch.routes.js
const branchRouter = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { isAdmin } = require('../middleware/auth.middleware');
const prisma = new PrismaClient();

branchRouter.get('/', async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({ where: { isActive: true }, orderBy: { isMain: 'desc' } });
    res.json({ success: true, data: branches });
  } catch { res.status(500).json({ success: false, error: 'Error' }); }
});

branchRouter.post('/', isAdmin, async (req, res) => {
  try {
    const branch = await prisma.branch.create({ data: req.body });
    res.status(201).json({ success: true, data: branch });
  } catch { res.status(500).json({ success: false, error: 'Error al crear sucursal' }); }
});

branchRouter.put('/:id', isAdmin, async (req, res) => {
  try {
    const branch = await prisma.branch.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: branch });
  } catch { res.status(500).json({ success: false, error: 'Error al actualizar' }); }
});

module.exports = branchRouter;
