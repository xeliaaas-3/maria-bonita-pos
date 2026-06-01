// ============================================
// CONTROLADOR DE DASHBOARD
// ============================================

const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

exports.getDashboard = async (req, res) => {
  try {
    const branchId = req.user.branchId || req.query.branchId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const saleWhere = { status: 'COMPLETADA' };
    if (branchId) saleWhere.branchId = branchId;

    // Estadísticas del día
    const [todaySales, todayRevenue] = await Promise.all([
      prisma.sale.count({
        where: { ...saleWhere, createdAt: { gte: today, lt: tomorrow } }
      }),
      prisma.sale.aggregate({
        where: { ...saleWhere, createdAt: { gte: today, lt: tomorrow } },
        _sum: { total: true }
      })
    ]);

    // Estadísticas del mes
    const [monthSales, monthRevenue] = await Promise.all([
      prisma.sale.count({
        where: { ...saleWhere, createdAt: { gte: thisMonth } }
      }),
      prisma.sale.aggregate({
        where: { ...saleWhere, createdAt: { gte: thisMonth } },
        _sum: { total: true }
      })
    ]);

    // Mes anterior para comparación
    const lastMonthRevenue = await prisma.sale.aggregate({
      where: { ...saleWhere, createdAt: { gte: lastMonth, lte: lastMonthEnd } },
      _sum: { total: true }
    });

    // Crecimiento
    const currentRevenue = Number(monthRevenue._sum.total || 0);
    const prevRevenue = Number(lastMonthRevenue._sum.total || 0);
    const revenueGrowth = prevRevenue > 0
      ? ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
      : 0;

    // Clientes nuevos del mes
    const newCustomers = await prisma.customer.count({
      where: { createdAt: { gte: thisMonth } }
    });

    // Stock bajo
    const lowStockWhere = branchId ? { branchId } : {};
    const lowStock = await prisma.productStock.findMany({
      where: {
        ...lowStockWhere,
        product: { status: 'ACTIVO' },
        quantity: { gt: 0 }
      },
      include: {
        product: { select: { id: true, name: true, minStock: true, images: true } },
        variant: { select: { id: true, size: true, color: true, sku: true } }
      },
      orderBy: { quantity: 'asc' },
      take: 10
    });

    const lowStockFiltered = lowStock.filter(s => s.quantity <= s.product.minStock);

    // Productos sin stock
    const outOfStock = await prisma.productStock.count({
      where: { ...lowStockWhere, quantity: 0, product: { status: 'ACTIVO' } }
    });

    // Top productos del mes
    const topProducts = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { ...saleWhere, createdAt: { gte: thisMonth } }
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    const topProductsWithNames = await Promise.all(
      topProducts.map(async (tp) => {
        const product = await prisma.product.findUnique({
          where: { id: tp.productId },
          select: { id: true, name: true, images: true }
        });
        return {
          product,
          quantity: tp._sum.quantity,
          revenue: tp._sum.total
        };
      })
    );

    // Ventas por día (últimos 7 días)
    const salesByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySales = await prisma.sale.aggregate({
        where: {
          ...saleWhere,
          createdAt: { gte: date, lt: nextDate }
        },
        _sum: { total: true },
        _count: true
      });

      salesByDay.push({
        date: date.toISOString().split('T')[0],
        revenue: Number(daySales._sum.total || 0),
        count: daySales._count
      });
    }

    // Ventas por método de pago (hoy)
    const paymentMethods = await prisma.salePayment.groupBy({
      by: ['method'],
      where: {
        sale: { ...saleWhere, createdAt: { gte: today, lt: tomorrow } }
      },
      _sum: { amount: true },
      _count: true
    });

    // Caja actual
    const currentCash = branchId
      ? await prisma.cashSession.findFirst({
          where: { branchId, closedAt: null },
          include: { user: { select: { name: true } } },
          orderBy: { openedAt: 'desc' }
        })
      : null;

    res.json({
      success: true,
      data: {
        today: {
          sales: todaySales,
          revenue: Number(todayRevenue._sum.total || 0)
        },
        month: {
          sales: monthSales,
          revenue: currentRevenue,
          growth: Number(revenueGrowth)
        },
        customers: { new: newCustomers },
        stock: {
          low: lowStockFiltered,
          outOfStock
        },
        topProducts: topProductsWithNames,
        salesByDay,
        paymentMethods,
        currentCash
      }
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener datos del dashboard' });
  }
};
