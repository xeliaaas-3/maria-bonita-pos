// ============================================
// CONTROLADOR DE REPORTES
// ============================================

const { PrismaClient } = require('@prisma/client');
const { formatDate } = require('../utils/helpers');
const { generateReportPDF } = require('../services/pdf.service');

const prisma = new PrismaClient();

exports.getReport = async (req, res) => {
  try {
    const { type, startDate, endDate, branchId } = req.query;
    const branch = branchId || req.user.branchId;

    const dateFilter = {
      gte: startDate ? new Date(startDate) : new Date(new Date().setDate(1)),
      lte: endDate ? new Date(endDate + 'T23:59:59') : new Date()
    };

    let reportData = {};

    if (type === 'sales') {
      reportData = await buildSalesReport(dateFilter, branch);
    } else if (type === 'products') {
      reportData = await buildProductsReport(dateFilter, branch);
    } else if (type === 'customers') {
      reportData = await buildCustomersReport(dateFilter, branch);
    } else if (type === 'cash') {
      reportData = await buildCashReport(dateFilter, branch);
    } else {
      return res.status(400).json({ success: false, error: 'Tipo de reporte inválido' });
    }

    res.json({ success: true, data: reportData });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ success: false, error: 'Error al generar reporte' });
  }
};

async function buildSalesReport(dateFilter, branchId) {
  const saleWhere = { status: 'COMPLETADA', createdAt: dateFilter };
  if (branchId) saleWhere.branchId = branchId;

  const [totalSales, revenueAgg, avgOrderAgg, byDay] = await Promise.all([
    prisma.sale.count({ where: saleWhere }),
    prisma.sale.aggregate({ where: saleWhere, _sum: { total: true, discount: true } }),
    prisma.sale.aggregate({ where: saleWhere, _avg: { total: true } }),
    prisma.sale.groupBy({
      by: ['createdAt'],
      where: saleWhere,
      _sum: { total: true },
      _count: true,
      orderBy: { createdAt: 'asc' }
    })
  ]);

  // Group by day
  const dayMap = {};
  byDay.forEach(d => {
    const day = new Date(d.createdAt).toISOString().split('T')[0];
    if (!dayMap[day]) dayMap[day] = { revenue: 0, count: 0 };
    dayMap[day].revenue += Number(d._sum.total || 0);
    dayMap[day].count += d._count;
  });

  const sales = await prisma.sale.findMany({
    where: saleWhere,
    include: {
      customer: { select: { name: true } },
      user: { select: { name: true } },
      payments: true
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  return {
    summary: [
      { label: 'Total Ventas', value: totalSales.toString() },
      { label: 'Ingresos', value: `₲ ${Number(revenueAgg._sum.total || 0).toLocaleString('es-PY')}` },
      { label: 'Ticket Promedio', value: `₲ ${Math.round(Number(avgOrderAgg._avg.total || 0)).toLocaleString('es-PY')}` },
      { label: 'Descuentos', value: `₲ ${Number(revenueAgg._sum.discount || 0).toLocaleString('es-PY')}` }
    ],
    chartData: {
      labels: Object.keys(dayMap),
      values: Object.values(dayMap).map(d => d.revenue)
    },
    tableHeaders: ['Nro', 'Fecha', 'Cliente', 'Cajero', 'Total', 'Método'],
    tableData: sales.map(s => ({
      Nro: s.number,
      Fecha: new Date(s.createdAt).toLocaleString('es-PY'),
      Cliente: s.customer?.name || 'Consumidor Final',
      Cajero: s.user?.name,
      Total: Number(s.total).toLocaleString('es-PY'),
      Método: s.payments.map(p => p.method).join(', ')
    }))
  };
}

async function buildProductsReport(dateFilter, branchId) {
  const saleWhere = { sale: { status: 'COMPLETADA', createdAt: dateFilter } };
  if (branchId) saleWhere.sale.branchId = branchId;

  const topProducts = await prisma.saleItem.groupBy({
    by: ['productId', 'name'],
    where: saleWhere,
    _sum: { quantity: true, total: true },
    orderBy: { _sum: { total: 'desc' } },
    take: 50
  });

  return {
    summary: [
      { label: 'Productos vendidos', value: topProducts.length.toString() },
      { label: 'Unidades totales', value: topProducts.reduce((s, p) => s + (p._sum.quantity || 0), 0).toString() },
      { label: 'Ingresos', value: `₲ ${topProducts.reduce((s, p) => s + Number(p._sum.total || 0), 0).toLocaleString('es-PY')}` },
      { label: 'Más vendido', value: topProducts[0]?.name?.slice(0, 20) || '-' }
    ],
    chartData: {
      labels: topProducts.slice(0, 10).map(p => p.name.slice(0, 15)),
      values: topProducts.slice(0, 10).map(p => Number(p._sum.total || 0))
    },
    tableHeaders: ['Producto', 'Unidades', 'Ingresos'],
    tableData: topProducts.map(p => ({
      Producto: p.name,
      Unidades: p._sum.quantity,
      Ingresos: Number(p._sum.total || 0).toLocaleString('es-PY')
    }))
  };
}

async function buildCustomersReport(dateFilter, branchId) {
  const saleWhere = { status: 'COMPLETADA', createdAt: dateFilter, customerId: { not: null } };
  if (branchId) saleWhere.branchId = branchId;

  const topCustomers = await prisma.sale.groupBy({
    by: ['customerId'],
    where: saleWhere,
    _sum: { total: true },
    _count: true,
    orderBy: { _sum: { total: 'desc' } },
    take: 50
  });

  const customerIds = topCustomers.map(c => c.customerId).filter(Boolean);
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, phone: true, tier: true }
  });
  const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

  const newCustomers = await prisma.customer.count({ where: { createdAt: dateFilter } });

  return {
    summary: [
      { label: 'Clientes activos', value: topCustomers.length.toString() },
      { label: 'Clientes nuevos', value: newCustomers.toString() },
      { label: 'Total compras', value: `₲ ${topCustomers.reduce((s, c) => s + Number(c._sum.total || 0), 0).toLocaleString('es-PY')}` },
      { label: 'Top cliente', value: customerMap[topCustomers[0]?.customerId]?.name?.slice(0, 20) || '-' }
    ],
    chartData: {
      labels: topCustomers.slice(0, 10).map(c => customerMap[c.customerId]?.name?.slice(0, 12) || 'N/A'),
      values: topCustomers.slice(0, 10).map(c => Number(c._sum.total || 0))
    },
    tableHeaders: ['Cliente', 'Teléfono', 'Tier', 'Compras', 'Total'],
    tableData: topCustomers.map(c => ({
      Cliente: customerMap[c.customerId]?.name || 'N/A',
      Teléfono: customerMap[c.customerId]?.phone || '-',
      Tier: customerMap[c.customerId]?.tier || '-',
      Compras: c._count,
      Total: Number(c._sum.total || 0).toLocaleString('es-PY')
    }))
  };
}

async function buildCashReport(dateFilter, branchId) {
  const where = { openedAt: dateFilter };
  if (branchId) where.branchId = branchId;

  const sessions = await prisma.cashSession.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { openedAt: 'desc' }
  });

  const totalOpened = sessions.reduce((s, ses) => s + Number(ses.openingAmount || 0), 0);
  const totalClosed = sessions.filter(s => s.closedAt).reduce((s, ses) => s + Number(ses.closingAmount || 0), 0);
  const totalDiff = sessions.filter(s => s.closedAt).reduce((s, ses) => s + Number(ses.difference || 0), 0);

  return {
    summary: [
      { label: 'Sesiones', value: sessions.length.toString() },
      { label: 'Fondos iniciales', value: `₲ ${totalOpened.toLocaleString('es-PY')}` },
      { label: 'Montos cierre', value: `₲ ${totalClosed.toLocaleString('es-PY')}` },
      { label: 'Diferencia total', value: `₲ ${totalDiff.toLocaleString('es-PY')}`, sub: totalDiff >= 0 ? 'Positivo' : 'Negativo' }
    ],
    chartData: {
      labels: sessions.map(s => new Date(s.openedAt).toLocaleDateString('es-PY')),
      values: sessions.map(s => Number(s.closingAmount || s.openingAmount || 0))
    },
    tableHeaders: ['Cajero', 'Apertura', 'Cierre', 'Fondo', 'Cierre $', 'Diferencia'],
    tableData: sessions.map(s => ({
      Cajero: s.user?.name || '-',
      Apertura: new Date(s.openedAt).toLocaleString('es-PY'),
      Cierre: s.closedAt ? new Date(s.closedAt).toLocaleString('es-PY') : 'Abierta',
      'Fondo': Number(s.openingAmount).toLocaleString('es-PY'),
      'Cierre $': s.closingAmount ? Number(s.closingAmount).toLocaleString('es-PY') : '-',
      Diferencia: s.difference != null ? Number(s.difference).toLocaleString('es-PY') : '-'
    }))
  };
}

// EXPORTAR REPORTE PDF
exports.getReportPDF = async (req, res) => {
  try {
    const { type, startDate, endDate, branchId } = req.query;
    const branch = branchId || req.user.branchId;

    const dateFilter = {
      gte: startDate ? new Date(startDate) : new Date(new Date().setDate(1)),
      lte: endDate ? new Date(endDate + 'T23:59:59') : new Date()
    };

    let reportData = {};
    if (type === 'sales')     reportData = await buildSalesReport(dateFilter, branch);
    else if (type === 'products')  reportData = await buildProductsReport(dateFilter, branch);
    else if (type === 'customers') reportData = await buildCustomersReport(dateFilter, branch);
    else if (type === 'cash') reportData = await buildCashReport(dateFilter, branch);
    else return res.status(400).json({ success: false, error: 'Tipo de reporte inválido' });

    const settings = await prisma.setting.findMany({ where: { group: 'company' } });

    const pdfBuffer = await generateReportPDF(reportData, type, {
      start: startDate || new Date(new Date().setDate(1)).toISOString().split('T')[0],
      end:   endDate   || new Date().toISOString().split('T')[0]
    }, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="reporte-${type}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Report PDF error:', error);
    res.status(500).json({ success: false, error: 'Error al generar PDF del reporte' });
  }
};
