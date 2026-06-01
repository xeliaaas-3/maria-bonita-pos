const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

const include = {
  customer: true,
  user: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  items: true,
  payments: true,
};

exports.getLayaways = async (req, res) => {
  try {
    const { status, customerId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    const [data, total] = await Promise.all([
      prisma.layaway.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page-1)*Number(limit), take: Number(limit) }),
      prisma.layaway.count({ where })
    ]);
    res.json({ success: true, data, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (e) { logger.error(e); res.status(500).json({ success: false, error: 'Error' }); }
};

exports.getLayaway = async (req, res) => {
  try {
    const data = await prisma.layaway.findUnique({ where: { id: req.params.id }, include });
    if (!data) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: 'Error' }); }
};

exports.createLayaway = async (req, res) => {
  try {
    const { customerId, items, deposit, depositMethod, dueDate, notes } = req.body;
    const total = items.reduce((s, i) => s + Number(i.unitPrice) * Number(i.quantity), 0);
    const balance = total - Number(deposit || 0);
    const count = await prisma.layaway.count();
    const number = `AP${String(count + 1).padStart(6, '0')}`;

    const data = await prisma.layaway.create({
      data: {
        number,
        customerId,
        deposit: Number(deposit) || 0,
        totalAmount: total,
        balance: Math.max(0, balance),
        status: balance <= 0 ? 'COMPLETADO' : 'ACTIVO',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        branchId: req.user.branchId,
        userId: req.user.id,
        items: {
          create: items.map(i => ({
            productName: i.productName,
            size: i.size || null,
            color: i.color || null,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            total: Number(i.unitPrice) * Number(i.quantity),
          }))
        },
        payments: Number(deposit) > 0 ? {
          create: [{ amount: Number(deposit), method: depositMethod || 'EFECTIVO' }]
        } : undefined,
      },
      include,
    });
    res.status(201).json({ success: true, data });
  } catch (e) { logger.error(e); res.status(500).json({ success: false, error: 'Error al crear apartado' }); }
};

exports.addPayment = async (req, res) => {
  try {
    const { amount, method, reference, notes } = req.body;
    const layaway = await prisma.layaway.findUnique({ where: { id: req.params.id } });
    if (!layaway) return res.status(404).json({ success: false, error: 'No encontrado' });
    const newBalance = Math.max(0, Number(layaway.balance) - Number(amount));
    const status = newBalance <= 0 ? 'COMPLETADO' : 'ACTIVO';
    await prisma.$transaction([
      prisma.layawayPayment.create({ data: { layawayId: req.params.id, amount: Number(amount), method, reference: reference || null, notes: notes || null } }),
      prisma.layaway.update({ where: { id: req.params.id }, data: { balance: newBalance, status } })
    ]);
    const data = await prisma.layaway.findUnique({ where: { id: req.params.id }, include });
    res.json({ success: true, data });
  } catch (e) { logger.error(e); res.status(500).json({ success: false, error: 'Error al registrar pago' }); }
};

exports.cancelLayaway = async (req, res) => {
  try {
    const data = await prisma.layaway.update({ where: { id: req.params.id }, data: { status: 'CANCELADO' }, include });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: 'Error' }); }
};
