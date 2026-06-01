const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { isAdmin } = require('../middleware/auth.middleware');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const settings = await prisma.setting.findMany({ orderBy: { group: 'asc' } });
    // Group by section
    const grouped = settings.reduce((acc, s) => {
      if (!acc[s.group]) acc[s.group] = {};
      const keyParts = s.key.split('.');
      acc[s.group][keyParts[keyParts.length - 1]] = s.value;
      return acc;
    }, {});
    res.json({ success: true, data: grouped, raw: settings });
  } catch { res.status(500).json({ success: false, error: 'Error al obtener configuraciones' }); }
});

router.put('/:key', isAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      update: { value },
      create: { key: req.params.key, value, group: req.params.key.split('.')[0] }
    });
    res.json({ success: true, data: setting });
  } catch { res.status(500).json({ success: false, error: 'Error al actualizar configuración' }); }
});

router.post('/bulk', isAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    const results = await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value, group: key.split('.')[0] }
        })
      )
    );
    res.json({ success: true, data: results });
  } catch { res.status(500).json({ success: false, error: 'Error al guardar configuraciones' }); }
});

module.exports = router;
