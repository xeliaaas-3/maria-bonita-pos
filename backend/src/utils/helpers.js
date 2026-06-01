// ============================================
// HELPERS
// ============================================

const generateSaleNumber = async (prisma, branchId) => {
  const today = new Date();
  const prefix = `V${today.getFullYear().toString().slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const lastSale = await prisma.sale.findFirst({
    where: { number: { startsWith: prefix }, branchId },
    orderBy: { number: 'desc' }
  });

  const seq = lastSale ? parseInt(lastSale.number.slice(-4)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

const generateSKU = (name, prefix = 'GEN') => {
  const clean = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${clean}-${rand}`;
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-PY');
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency', currency: 'PYG',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(Number(amount) || 0);
};

const slugify = (text) => {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

module.exports = { generateSaleNumber, generateSKU, formatDate, formatCurrency, slugify };
