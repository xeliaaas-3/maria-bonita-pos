// ============================================
// CONTROLADOR DE COMPRAS
// ============================================

const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

// Generar número de compra
async function generatePurchaseNumber(tx) {
  const year = new Date().getFullYear();
  const count = await tx.purchase.count({
    where: { number: { startsWith: `C-${year}-` } }
  });
  return `C-${year}-${String(count + 1).padStart(5, '0')}`;
}

// LISTAR COMPRAS
exports.getPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 20, supplierId, startDate, endDate, branchId } = req.query;

    const where = {};
    if (supplierId) where.supplierId = supplierId;
    if (branchId) where.branchId = branchId;
    else if (req.user.branchId) where.branchId = req.user.branchId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          _count: { select: { items: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.purchase.count({ where })
    ]);

    res.json({
      success: true,
      data: purchases,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Get purchases error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener compras' });
  }
};

// OBTENER COMPRA
exports.getPurchase = async (req, res) => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: true
          }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({ success: false, error: 'Compra no encontrada' });
    }

    res.json({ success: true, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener la compra' });
  }
};

// CREAR COMPRA
exports.createPurchase = async (req, res) => {
  try {
    const { supplierId, items, notes, branchId: bodyBranchId } = req.body;
    const branchId = req.user.branchId || bodyBranchId;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Debe agregar al menos un ítem' });
    }

    const total = items.reduce((sum, i) => sum + (Number(i.unitCost) * Number(i.quantity)), 0);

    const purchase = await prisma.$transaction(async (tx) => {
      const number = await generatePurchaseNumber(tx);

      const newPurchase = await tx.purchase.create({
        data: {
          number,
          supplierId,
          branchId,
          userId: req.user.id,
          total,
          notes,
          status: 'RECIBIDA',
          items: {
            create: items.map(i => ({
              productId: i.productId,
              variantId: i.variantId || null,
              quantity: Number(i.quantity),
              unitCost: Number(i.unitCost),
              total: Number(i.unitCost) * Number(i.quantity)
            }))
          }
        },
        include: {
          items: { include: { product: true } },
          supplier: true
        }
      });

      // Actualizar stock e inventario
      for (const item of items) {
        // Buscar o crear registro de stock
        const existingStock = await tx.productStock.findFirst({
          where: {
            productId: item.productId,
            variantId: item.variantId || null,
            branchId
          }
        });

        if (existingStock) {
          await tx.productStock.update({
            where: { id: existingStock.id },
            data: { quantity: { increment: Number(item.quantity) } }
          });
        } else {
          await tx.productStock.create({
            data: {
              productId: item.productId,
              variantId: item.variantId || null,
              branchId,
              quantity: Number(item.quantity)
            }
          });
        }

        // Movimiento de inventario
        const stockAfter = await tx.productStock.findFirst({
          where: { productId: item.productId, variantId: item.variantId || null, branchId }
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId || null,
            branchId,
            type: 'ENTRADA',
            quantity: Number(item.quantity),
            previousQty: (stockAfter?.quantity || 0) - Number(item.quantity),
            currentQty: stockAfter?.quantity || Number(item.quantity),
            reason: `Compra #${number}`,
            reference: newPurchase.id,
            userId: req.user.id
          }
        });
      }

      return newPurchase;
    });

    logger.info(`Compra creada: #${purchase.number} por ${req.user.name}`);
    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    logger.error('Create purchase error:', error);
    res.status(500).json({ success: false, error: 'Error al crear la compra' });
  }
};

// ACTUALIZAR ESTADO
exports.updatePurchaseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const purchase = await prisma.purchase.update({
      where: { id },
      data: { status }
    });

    res.json({ success: true, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar estado' });
  }
};
