// ============================================
// CONTROLADOR DE INVENTARIO
// ============================================

const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { emitToBranch } = require('../services/socket.service');

const prisma = new PrismaClient();

// Listar stocks actuales
exports.getInventory = async (req, res) => {
  try {
    const { branchId, search, lowStock, page = 1, limit = 30 } = req.query;
    const branch = branchId || req.user.branchId;

    const where = {};
    if (branch) where.branchId = branch;
    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const stocks = await prisma.productStock.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, sku: true, images: true, minStock: true, salePrice: true, costPrice: true, status: true, category: { select: { name: true } } }
        },
        variant: { select: { id: true, size: true, color: true, sku: true } },
        branch: { select: { id: true, name: true } }
      },
      orderBy: { quantity: 'asc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    // Filtrar bajo stock
    const result = lowStock === 'true'
      ? stocks.filter(s => s.quantity <= s.product.minStock)
      : stocks;

    const total = await prisma.productStock.count({ where });

    res.json({
      success: true,
      data: result,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    logger.error('Get inventory error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener inventario' });
  }
};

// Ajuste manual de stock
exports.adjustStock = async (req, res) => {
  try {
    const { productId, variantId, branchId, quantity, reason, type } = req.body;
    const branch = branchId || req.user.branchId;

    const stock = await prisma.productStock.findFirst({
      where: { productId, variantId: variantId || null, branchId: branch }
    });

    if (!stock) {
      // Crear registro de stock si no existe
      await prisma.productStock.create({
        data: { productId, variantId, branchId: branch, quantity: 0 }
      });
    }

    const currentQty = stock?.quantity || 0;
    let newQty;

    if (type === 'AJUSTE') {
      newQty = Number(quantity); // Establecer cantidad exacta
    } else if (type === 'ENTRADA') {
      newQty = currentQty + Number(quantity);
    } else if (type === 'SALIDA') {
      newQty = Math.max(0, currentQty - Number(quantity));
    } else {
      return res.status(400).json({ success: false, error: 'Tipo de movimiento inválido' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.productStock.updateMany({
        where: { productId, variantId: variantId || null, branchId: branch },
        data: { quantity: newQty }
      });

      await tx.inventoryMovement.create({
        data: {
          productId,
          variantId,
          branchId: branch,
          type,
          quantity: Math.abs(newQty - currentQty),
          previousQty: currentQty,
          currentQty: newQty,
          reason,
          userId: req.user.id
        }
      });
    });

    // Alertar si stock bajo
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product && newQty <= product.minStock) {
      emitToBranch(branch, 'stock:low', {
        productId, productName: product.name, currentStock: newQty, minStock: product.minStock
      });
    }

    res.json({ success: true, message: 'Stock ajustado', data: { newQuantity: newQty } });
  } catch (error) {
    logger.error('Adjust stock error:', error);
    res.status(500).json({ success: false, error: 'Error al ajustar stock' });
  }
};

// Kardex (historial de movimientos)
exports.getKardex = async (req, res) => {
  try {
    const { productId, branchId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const branch = branchId || req.user.branchId;

    const where = {};
    if (productId) where.productId = productId;
    if (branch) where.branchId = branch;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
    }

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          branch: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.inventoryMovement.count({ where })
    ]);

    res.json({
      success: true,
      data: movements,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener kardex' });
  }
};

// Transferencia entre sucursales
exports.createTransfer = async (req, res) => {
  try {
    const { fromBranchId, toBranchId, items, notes } = req.body;

    const transfer = await prisma.$transaction(async (tx) => {
      const t = await tx.transfer.create({
        data: {
          fromBranchId,
          toBranchId,
          userId: req.user.id,
          notes,
          status: 'COMPLETADA',
          items: {
            create: items.map(i => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity
            }))
          }
        },
        include: { items: true }
      });

      for (const item of items) {
        // Reducir en origen
        await tx.productStock.updateMany({
          where: { productId: item.productId, branchId: fromBranchId },
          data: { quantity: { decrement: item.quantity } }
        });

        // Aumentar en destino (crear si no existe)
        const destStock = await tx.productStock.findFirst({
          where: { productId: item.productId, branchId: toBranchId }
        });

        if (destStock) {
          await tx.productStock.updateMany({
            where: { productId: item.productId, branchId: toBranchId },
            data: { quantity: { increment: item.quantity } }
          });
        } else {
          await tx.productStock.create({
            data: { productId: item.productId, branchId: toBranchId, quantity: item.quantity }
          });
        }

        // Registrar movimientos
        await tx.inventoryMovement.createMany({
          data: [
            {
              productId: item.productId, branchId: fromBranchId, type: 'TRANSFERENCIA',
              quantity: item.quantity, previousQty: 0, currentQty: 0,
              reason: `Transferencia a sucursal`, reference: t.id, userId: req.user.id
            },
            {
              productId: item.productId, branchId: toBranchId, type: 'ENTRADA',
              quantity: item.quantity, previousQty: 0, currentQty: item.quantity,
              reason: `Transferencia desde sucursal`, reference: t.id, userId: req.user.id
            }
          ]
        });
      }

      return t;
    });

    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    logger.error('Transfer error:', error);
    res.status(500).json({ success: false, error: 'Error al crear transferencia' });
  }
};
