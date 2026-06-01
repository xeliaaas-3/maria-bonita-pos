// notification.routes.js
const notifRouter = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

notifRouter.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { OR: [{ userId: req.user.id }, { userId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    res.json({ success: true, data: notifications });
  } catch { res.status(500).json({ success: false, error: 'Error' }); }
});

notifRouter.patch('/:id/read', async (req, res) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, error: 'Error' }); }
});

notifRouter.patch('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, error: 'Error' }); }
});

module.exports = notifRouter;
