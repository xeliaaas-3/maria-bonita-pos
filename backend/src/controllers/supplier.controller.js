const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

exports.getSuppliers = async (req, res) => {
  try {
    const data = await prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, include: { _count: { select: { purchases: true } } } });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: 'Error' }); }
};

exports.createSupplier = async (req, res) => {
  try {
    const data = await prisma.supplier.create({ data: req.body });
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: 'Error' }); }
};

exports.updateSupplier = async (req, res) => {
  try {
    const data = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: 'Error' }); }
};

exports.deleteSupplier = async (req, res) => {
  try {
    await prisma.supplier.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: 'Error' }); }
};

exports.getPurchases = async (req, res) => {
  try {
    const { supplierId } = req.query;
    const where = supplierId ? { supplierId } : {};
    const data = await prisma.purchase.findMany({ where, include: { supplier: true, items: true }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: 'Error' }); }
};

exports.createPurchase = async (req, res) => {
  try {
    const { supplierId, items, invoiceRef, notes } = req.body;
    const total = items.reduce((s, i) => s + i.unitCost * i.quantity, 0);
    const count = await prisma.purchase.count();
    const number = `COM${String(count + 1).padStart(5, '0')}`;
    const data = await prisma.purchase.create({
      data: {
        number, supplierId, total, invoiceRef, notes,
        branchId: req.user.branchId, userId: req.user.id,
        items: { create: items.map(i => ({ ...i, total: i.unitCost * i.quantity })) }
      },
      include: { supplier: true, items: true }
    });
    // Update product stock for each item
    for (const item of items) {
      if (item.productId) {
        const stock = await prisma.productStock.findFirst({ where: { productId: item.productId, variantId: item.variantId || null, branchId: req.user.branchId } });
        if (stock) {
          await prisma.productStock.update({ where: { id: stock.id }, data: { quantity: { increment: item.quantity } } });
        } else {
          await prisma.productStock.create({ data: { productId: item.productId, variantId: item.variantId || null, branchId: req.user.branchId, quantity: item.quantity } });
        }
      }
    }
    res.status(201).json({ success: true, data });
  } catch (e) { logger.error(e); res.status(500).json({ success: false, error: 'Error al registrar compra' }); }
};
