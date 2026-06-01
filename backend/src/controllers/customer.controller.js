// ============================================
// CONTROLADOR DE CLIENTES
// ============================================

const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

exports.getCustomers = async (req, res) => {
  try {
    const { search, tier, page = 1, limit = 20 } = req.query;
    const where = { isActive: true };
    if (tier) where.tier = tier;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { document: { contains: search } }
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { totalSpent: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    logger.error('Get customers error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener clientes' });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        sales: {
          where: { status: 'COMPLETADA' },
          include: { items: { include: { product: { select: { name: true } } } }, payments: true },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        pointsHistory: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });

    if (!customer) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener cliente' });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone, whatsapp, document, address, city, birthdate, notes } = req.body;

    // Check duplicates
    if (email) {
      const exists = await prisma.customer.findUnique({ where: { email } });
      if (exists) return res.status(400).json({ success: false, error: 'Email ya registrado' });
    }

    const customer = await prisma.customer.create({
      data: { name, email, phone, whatsapp, document, address, city, birthdate: birthdate ? new Date(birthdate) : null, notes }
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    logger.error('Create customer error:', error);
    res.status(500).json({ success: false, error: 'Error al crear cliente' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.birthdate) data.birthdate = new Date(data.birthdate);
    delete data.id; delete data.createdAt; delete data.totalSpent; delete data.points;

    const customer = await prisma.customer.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar cliente' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    await prisma.customer.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Cliente desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar cliente' });
  }
};

exports.searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { document: { contains: q } }
        ]
      },
      take: 8,
      orderBy: { totalSpent: 'desc' }
    });

    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error en búsqueda' });
  }
};

// PAGO DE CUENTA CORRIENTE
exports.debtPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method } = req.body;
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    const newDebt = Math.max(0, Number(customer.debt) - Number(amount));
    const updated = await prisma.customer.update({
      where: { id },
      data: { debt: newDebt }
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al registrar pago' });
  }
};
