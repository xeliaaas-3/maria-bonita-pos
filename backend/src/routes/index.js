// ============================================
// BOUTIQUE POS - Rutas Principales
// ============================================

const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');

// Rutas públicas
router.use('/auth', require('./auth.routes'));

// Rutas protegidas
router.use('/dashboard',      authenticate, require('./dashboard.routes'));
router.use('/products',       authenticate, require('./product.routes'));
router.use('/categories',     authenticate, require('./category.routes'));
router.use('/brands',         authenticate, require('./brand.routes'));
router.use('/inventory',      authenticate, require('./inventory.routes'));
router.use('/customers',      authenticate, require('./customer.routes'));
router.use('/sales',          authenticate, require('./sale.routes'));
router.use('/cash',           authenticate, require('./cash.routes'));
router.use('/reports',        authenticate, require('./report.routes'));
router.use('/users',          authenticate, require('./user.routes'));
router.use('/branches',       authenticate, require('./branch.routes'));
router.use('/settings',       authenticate, require('./setting.routes'));
router.use('/backups',        authenticate, require('./backup.routes'));
router.use('/notifications',  authenticate, require('./notification.routes'));
router.use('/uploads',        authenticate, require('./upload.routes'));
router.use('/upload',         authenticate, require('./upload.routes')); // alias sin 's'

router.use('/layaways',   require('./layaway.routes'));
router.use('/orders',     require('./order.routes'));
router.use('/suppliers',  require('./supplier.routes'));
router.use('/purchases',  authenticate, require('./purchase.routes'));
router.use('/transfers',  authenticate, require('./transfer.routes'));

module.exports = router;
