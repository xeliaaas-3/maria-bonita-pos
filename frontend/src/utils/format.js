// ============================================
// UTILIDADES DE FORMATO
// ============================================

export const formatCurrency = (amount, compact = false) => {
  const num = Number(amount) || 0;
  if (compact && num >= 1000000) {
    return `₲ ${(num / 1000000).toFixed(1)}M`;
  }
  if (compact && num >= 1000) {
    return `₲ ${(num / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

export const formatDate = (date, fmt = 'dd/MM/yyyy') => {
  if (!date) return '-';
  const d = new Date(date);
  const map = {
    dd: String(d.getDate()).padStart(2, '0'),
    MM: String(d.getMonth() + 1).padStart(2, '0'),
    yyyy: d.getFullYear(),
    HH: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0')
  };
  return fmt.replace(/dd|MM|yyyy|HH|mm/g, m => map[m]);
};

export const formatDateTime = (date) => formatDate(date, 'dd/MM/yyyy HH:mm');

export const formatPhone = (phone) => {
  if (!phone) return '-';
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2-$3');
};

export const truncate = (str, len = 30) => {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
};

export const generateSKU = (name, categoryCode = 'GEN') => {
  const namePart = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${categoryCode}-${namePart}-${rand}`;
};

export const getInitials = (name = '') => {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

export const classNames = (...classes) => classes.filter(Boolean).join(' ');
