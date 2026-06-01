// ============================================
// CONTROLADOR DE VENTAS - POS
// ============================================

const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { getSocket } = require('../services/socket.service');
const { generateSalePDF } = require('../services/pdf.service');
const { generateSaleNumber } = require('../utils/helpers');

const prisma = new PrismaClient();

// CREAR VENTA
exports.createSale = async (req, res) => {
  try {
    const {
      customerId, items, payments, discount, discountType,
      cashSessionId, notes, pointsUsed
    } = req.body;

    const branchId = req.user.branchId || req.body.branchId;

    // Verificar caja abierta
    const cashSession = cashSessionId
      ? await prisma.cashSession.findFirst({
          where: { id: cashSessionId, closedAt: null }
        })
      : await prisma.cashSession.findFirst({
          where: { branchId, closedAt: null },
          orderBy: { openedAt: 'desc' }
        });

    if (!cashSession) {
      return res.status(400).json({
        success: false,
        error: 'No hay caja abierta. Debe abrir caja antes de vender.'
      });
    }

    // Calcular totales y verificar stock
    let subtotal = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          stocks: { where: { branchId, variantId: item.variantId || null } }
        }
      });

      if (!product) {
        return res.status(400).json({
          success: false,
          error: `Producto no encontrado: ${item.productId}`
        });
      }

      const stock = product.stocks[0];
      if (!stock || stock.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Stock insuficiente para: ${product.name}`
        });
      }

      const unitPrice = item.unitPrice || Number(product.salePrice);
      const itemDiscount = item.discount || 0;
      const itemTotal = (unitPrice * item.quantity) - itemDiscount;

      subtotal += itemTotal;
      saleItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice,
        discount: itemDiscount,
        tax: item.tax || 0,
        total: itemTotal
      });
    }

    // Aplicar descuento general
    let discountAmount = 0;
    if (discount) {
      discountAmount = discountType === 'PORCENTAJE'
        ? (subtotal * discount) / 100
        : discount;
    }

    const tax = 0; // Configurar según necesidad
    const total = subtotal - discountAmount + tax;

    // Calcular puntos
    let pointsEarned = 0;
    if (customerId) {
      pointsEarned = Math.floor(total / 10000); // 1 punto por cada 10,000
    }

    // Calcular vuelto
    const amountPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const change = amountPaid - total;

    if (change < 0) {
      return res.status(400).json({
        success: false,
        error: 'El monto pagado es insuficiente'
      });
    }

    // Transacción
    const sale = await prisma.$transaction(async (tx) => {
      const saleNumber = await generateSaleNumber(tx, branchId);

      // Crear venta
      const newSale = await tx.sale.create({
        data: {
          number: saleNumber,
          branchId,
          userId: req.user.id,
          customerId,
          cashSessionId: cashSession.id,
          subtotal,
          discount: discountAmount,
          discountType,
          tax,
          total,
          amountPaid,
          change,
          notes,
          pointsEarned,
          pointsUsed: pointsUsed || 0,
          status: 'COMPLETADA',
          items: { create: saleItems },
          payments: {
            create: payments.map(p => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference
            }))
          }
        },
        include: {
          items: { include: { product: true } },
          payments: true,
          customer: true,
          user: { select: { id: true, name: true } }
        }
      });

      // Reducir stock
      for (const item of saleItems) {
        await tx.productStock.updateMany({
          where: {
            productId: item.productId,
            variantId: item.variantId || null,
            branchId
          },
          data: { quantity: { decrement: item.quantity } }
        });

        // Registrar movimiento
        const stockRecord = await tx.productStock.findFirst({
          where: { productId: item.productId, branchId }
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            branchId,
            type: 'SALIDA',
            quantity: item.quantity,
            previousQty: (stockRecord?.quantity || 0) + item.quantity,
            currentQty: stockRecord?.quantity || 0,
            reason: `Venta #${saleNumber}`,
            reference: newSale.id,
            userId: req.user.id
          }
        });
      }

      // Actualizar puntos cliente
      if (customerId && pointsEarned > 0) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            points: { increment: pointsEarned - (pointsUsed || 0) },
            totalSpent: { increment: total }
          }
        });

        await tx.pointsHistory.create({
          data: {
            customerId,
            points: pointsEarned,
            type: 'GANADOS',
            description: `Venta #${saleNumber}`,
            saleId: newSale.id
          }
        });
      }

      return newSale;
    });

    // Emitir evento en tiempo real
    const io = getSocket();
    if (io) {
      io.to(branchId).emit('sale:created', {
        id: sale.id,
        number: sale.number,
        total: sale.total,
        cashSessionId: sale.cashSessionId
      });

      // Verificar stock bajo
      for (const item of saleItems) {
        const stock = await prisma.productStock.findFirst({
          where: { productId: item.productId, branchId }
        });
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });
        if (stock && product && stock.quantity <= product.minStock) {
          io.emit('stock:low', {
            productId: item.productId,
            productName: product.name,
            currentStock: stock.quantity,
            minStock: product.minStock
          });
        }
      }
    }

    logger.info(`Venta creada: #${sale.number} por ${req.user.name}`);

    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    logger.error('Create sale error:', error);
    res.status(500).json({ success: false, error: 'Error al crear la venta' });
  }
};

// LISTAR VENTAS
exports.getSales = async (req, res) => {
  try {
    const {
      page = 1, limit = 20, startDate, endDate,
      customerId, status, search, branchId
    } = req.query;

    const where = {};

    if (branchId) where.branchId = branchId;
    else if (req.user.branchId) where.branchId = req.user.branchId;

    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
    }

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          payments: true,
          _count: { select: { items: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.sale.count({ where })
    ]);

    res.json({
      success: true,
      data: sales,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Get sales error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener ventas' });
  }
};

// OBTENER VENTA
exports.getSale = async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
            variant: true
          }
        },
        payments: true,
        customer: true,
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    if (!sale) {
      return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    }

    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener la venta' });
  }
};

// CANCELAR VENTA
exports.cancelSale = async (req, res) => {
  try {
    const { reason } = req.body;
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!sale) {
      return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    }

    if (sale.status !== 'COMPLETADA') {
      return res.status(400).json({ success: false, error: 'Solo se pueden cancelar ventas completadas' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: { status: 'CANCELADA', cancelReason: reason }
      });

      // Restaurar stock
      for (const item of sale.items) {
        await tx.productStock.updateMany({
          where: {
            productId: item.productId,
            variantId: item.variantId || null,
            branchId: sale.branchId
          },
          data: { quantity: { increment: item.quantity } }
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            branchId: sale.branchId,
            type: 'DEVOLUCION',
            quantity: item.quantity,
            previousQty: 0,
            currentQty: item.quantity,
            reason: `Cancelación venta #${sale.number}`,
            userId: req.user.id
          }
        });
      }
    });

    res.json({ success: true, message: 'Venta cancelada exitosamente' });
  } catch (error) {
    logger.error('Cancel sale error:', error);
    res.status(500).json({ success: false, error: 'Error al cancelar la venta' });
  }
};

// GENERAR PDF TICKET
exports.getSaleTicket = async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        payments: true,
        customer: true,
        user: { select: { name: true } },
        branch: true
      }
    });

    if (!sale) {
      return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    }

    const settings = await prisma.setting.findMany({
      where: { group: 'company' }
    });

    const pdfBuffer = await generateSalePDF(sale, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ticket-${sale.number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Generate ticket error:', error);
    res.status(500).json({ success: false, error: 'Error al generar ticket' });
  }
};

// ACTUALIZAR VENTA (notas, descuento, cliente)
exports.updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, discount, discountType, customerId } = req.body;

    const sale = await prisma.sale.findUnique({ where: { id } });
    if (!sale) {
      return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    }
    if (sale.status === 'CANCELADA') {
      return res.status(400).json({ success: false, error: 'No se puede editar una venta cancelada' });
    }

    // Recalcular total si cambia el descuento
    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (customerId !== undefined) updateData.customerId = customerId || null;

    if (discount !== undefined) {
      const discountNum = Number(discount) || 0;
      const dtype = discountType || sale.discountType || 'MONTO';
      const discountAmount = dtype === 'PORCENTAJE'
        ? (Number(sale.subtotal) * discountNum) / 100
        : discountNum;
      updateData.discount = discountAmount;
      updateData.discountType = dtype;
      updateData.total = Number(sale.subtotal) - discountAmount;
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: { select: { id: true, name: true, images: true } }, variant: true } },
        payments: true,
        customer: true,
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Update sale error:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar la venta' });
  }
};
