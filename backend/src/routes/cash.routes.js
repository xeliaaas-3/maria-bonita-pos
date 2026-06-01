const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { isAdminOrCajero } = require('../middleware/auth.middleware');
const prisma = new PrismaClient();

// Sesión activa
router.get('/session/active', async (req, res) => {
  try {
    const branchId = req.user.branchId || req.query.branchId;
    const session = await prisma.cashSession.findFirst({
      where: { branchId, closedAt: null },
      include: {
        user: { select: { id: true, name: true } },
        movements: { orderBy: { createdAt: 'desc' }, take: 20 }
      },
      orderBy: { openedAt: 'desc' }
    });

    // Calcular totales de la sesión
    if (session) {
      const salesAggregate = await prisma.salePayment.aggregate({
        where: {
          method: 'EFECTIVO',
          sale: { cashSessionId: session.id, status: 'COMPLETADA' }
        },
        _sum: { amount: true }
      });

      const ingresos = session.movements
        .filter(m => m.type === 'INGRESO')
        .reduce((s, m) => s + Number(m.amount), 0);
      const egresos = session.movements
        .filter(m => m.type === 'EGRESO')
        .reduce((s, m) => s + Number(m.amount), 0);

      session.cashSales = Number(salesAggregate._sum.amount || 0);
      session.totalIngreso = ingresos;
      session.totalEgreso = egresos;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener sesión' });
  }
});

// Abrir caja
router.post('/open', isAdminOrCajero, async (req, res) => {
  try {
    const { openingAmount, branchId } = req.body;
    const branch = branchId || req.user.branchId;

    const existing = await prisma.cashSession.findFirst({
      where: { branchId: branch, closedAt: null }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Ya hay una caja abierta' });
    }

    const session = await prisma.cashSession.create({
      data: {
        branchId: branch,
        userId: req.user.id,
        openingAmount: Number(openingAmount)
      },
      include: { user: { select: { name: true } } }
    });

    await prisma.cashMovement.create({
      data: {
        cashSessionId: session.id,
        type: 'APERTURA',
        amount: Number(openingAmount),
        description: 'Apertura de caja'
      }
    });

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al abrir caja' });
  }
});

// Cerrar caja
router.post('/close', isAdminOrCajero, async (req, res) => {
  try {
    const { closingAmount, sessionId, notes } = req.body;
    const branchId = req.user.branchId;

    const session = await prisma.cashSession.findFirst({
      where: sessionId ? { id: sessionId } : { branchId, closedAt: null },
      include: { movements: true }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'No hay caja abierta' });
    }

    // Calcular monto esperado
    const salesAggregate = await prisma.salePayment.aggregate({
      where: {
        method: 'EFECTIVO',
        sale: { cashSessionId: session.id, status: 'COMPLETADA' }
      },
      _sum: { amount: true }
    });

    const cashSales = Number(salesAggregate._sum.amount || 0);
    const ingresos = session.movements
      .filter(m => m.type === 'INGRESO')
      .reduce((s, m) => s + Number(m.amount), 0);
    const egresos = session.movements
      .filter(m => m.type === 'EGRESO')
      .reduce((s, m) => s + Number(m.amount), 0);

    const expectedAmount = Number(session.openingAmount) + cashSales + ingresos - egresos;
    const difference = Number(closingAmount) - expectedAmount;

    const updated = await prisma.cashSession.update({
      where: { id: session.id },
      data: {
        closingAmount: Number(closingAmount),
        expectedAmount,
        difference,
        notes,
        closedAt: new Date()
      }
    });

    await prisma.cashMovement.create({
      data: {
        cashSessionId: session.id,
        type: 'CIERRE',
        amount: Number(closingAmount),
        description: `Cierre de caja. Diferencia: ${difference >= 0 ? '+' : ''}${difference}`
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al cerrar caja' });
  }
});

// Registrar movimiento
router.post('/sessions/:id/movement', isAdminOrCajero, async (req, res) => {
  try {
    const { type, amount, description } = req.body;

    const session = await prisma.cashSession.findFirst({
      where: { id: req.params.id, closedAt: null }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
    }

    const movement = await prisma.cashMovement.create({
      data: {
        cashSessionId: session.id,
        type,
        amount: Number(amount),
        description
      }
    });

    res.json({ success: true, data: movement });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al registrar movimiento' });
  }
});

// Historial de sesiones
router.get('/sessions', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const branchId = req.user.branchId;

    const sessions = await prisma.cashSession.findMany({
      where: branchId ? { branchId } : {},
      include: { user: { select: { id: true, name: true } } },
      orderBy: { openedAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener historial' });
  }
});

module.exports = router;
