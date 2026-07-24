// ============================================
// CONTROLADOR DE TRANSFERENCIAS
// ============================================

const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

// LISTAR TRANSFERENCIAS
exports.getTransfers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = {};
    if (status) where.status = status;

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where,
        include: {
          fromBranch: { select: { id: true, name: true } },
          toBranch: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          _count: { select: { items: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.transfer.count({ where })
    ]);

    res.json({
      success: true,
      data: transfers,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    logger.error('Get transfers error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener transferencias' });
  }
};

// OBTENER TRANSFERENCIA
exports.getTransfer = async (req, res) => {
  try {
    const transfer = await prisma.transfer.findUnique({
      where: { id: req.params.id },
      include: {
        fromBranch: true,
        toBranch: true,
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: true
          }
        }
      }
    });

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transferencia no encontrada' });
    }

    res.json({ success: true, data: transfer });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener la transferencia' });
  }
};

// CREAR TRANSFERENCIA
exports.createTransfer = async (req, res) => {
  try {
    const { fromBranchId, toBranchId, items, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Debe agregar al menos un ítem' });
    }

    if (fromBranchId === toBranchId) {
      return res.status(400).json({ success: false, error: 'Las sucursales deben ser distintas' });
    }

    const transfer = await prisma.transfer.create({
      data: {
        fromBranchId,
        toBranchId,
        userId: req.user.id,
        notes,
        status: 'PENDIENTE',
        items: {
          create: items.map(i => ({
            productId: i.productId,
            variantId: i.variantId || null,
            quantity: Number(i.quantity)
          }))
        }
      },
      include: {
        fromBranch: true,
        toBranch: true,
        items: { include: { product: true } }
      }
    });

    logger.info(`Transferencia creada: ${transfer.id} por ${req.user.name}`);
    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    logger.error('Create transfer error:', error);
    res.status(500).json({ success: false, error: 'Error al crear la transferencia' });
  }
};

// RECIBIR TRANSFERENCIA
exports.receiveTransfer = async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transferencia no encontrada' });
    }

    if (transfer.status !== 'PENDIENTE') {
      return res.status(400).json({ success: false, error: 'La transferencia ya fue procesada' });
    }

    await prisma.$transaction(async (tx) => {
      // Actualizar estado
      await tx.transfer.update({ where: { id }, data: { status: 'RECIBIDO' } });

      for (const item of transfer.items) {
        const { productId, variantId, quantity } = item;

        // Decrementar stock en sucursal origen
        await tx.productStock.updateMany({
          where: { productId, variantId: variantId || null, branchId: transfer.fromBranchId },
          data: { quantity: { decrement: quantity } }
        });

        // Incrementar stock en sucursal destino
        const destStock = await tx.productStock.findFirst({
          where: { productId, variantId: variantId || null, branchId: transfer.toBranchId }
        });

        if (destStock) {
          await tx.productStock.update({
            where: { id: destStock.id },
            data: { quantity: { increment: quantity } }
          });
        } else {
          await tx.productStock.create({
            data: { productId, variantId: variantId || null, branchId: transfer.toBranchId, quantity }
          });
        }

        // Movimiento salida
        await tx.inventoryMovement.create({
          data: {
            productId,
            variantId: variantId || null,
            branchId: transfer.fromBranchId,
            type: 'TRANSFERENCIA',
            quantity: -quantity,
            previousQty: 0,
            currentQty: 0,
            reason: `Transferencia enviada #${transfer.id.slice(-8)}`,
            reference: transfer.id,
            userId: req.user.id
          }
        });

        // Movimiento entrada
        await tx.inventoryMovement.create({
          data: {
            productId,
            variantId: variantId || null,
            branchId: transfer.toBranchId,
            type: 'TRANSFERENCIA',
            quantity,
            previousQty: destStock?.quantity || 0,
            currentQty: (destStock?.quantity || 0) + quantity,
            reason: `Transferencia recibida #${transfer.id.slice(-8)}`,
            reference: transfer.id,
            userId: req.user.id
          }
        });
      }
    });

    res.json({ success: true, message: 'Transferencia recibida exitosamente' });
  } catch (error) {
    logger.error('Receive transfer error:', error);
    res.status(500).json({ success: false, error: 'Error al recibir la transferencia' });
  }
};
