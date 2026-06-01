const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

const include = {
  customer: true,
  user: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  items: true,
};

exports.getOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const data = await prisma.order.findMany({ where, include, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: 'Error' }); }
};

exports.getOrder = async (req, res) => {
  try {
    const data = await prisma.order.findUnique({ where: { id: req.params.id }, include });
    if (!data) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: 'Error' }); }
};

exports.createOrder = async (req, res) => {
  try {
    const { customerId, items, notes, expectedAt } = req.body;
    const count = await prisma.order.count();
    const number = `ENC${String(count + 1).padStart(5, '0')}`;
    const data = await prisma.order.create({
      data: {
        number, customerId: customerId || null, notes,
        expectedAt: expectedAt ? new Date(expectedAt) : null,
        branchId: req.user.branchId, userId: req.user.id,
        items: { create: items }
      },
      include
    });
    res.status(201).json({ success: true, data });
  } catch (e) { logger.error(e); res.status(500).json({ success: false, error: 'Error al crear encargo' }); }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, arrivedAt } = req.body;
    const data = await prisma.order.update({
      where: { id: req.params.id },
      data: { status, arrivedAt: arrivedAt ? new Date(arrivedAt) : status === 'RECIBIDO' ? new Date() : undefined },
      include
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: 'Error' }); }
};
