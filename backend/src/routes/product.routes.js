const router = require('express').Router();
const ctrl = require('../controllers/product.controller');
const { isAdmin, isAdminOrCajero } = require('../middleware/auth.middleware');

router.get('/', ctrl.getProducts);
router.post('/labels', ctrl.getLabels);
router.get('/catalog', ctrl.getCatalog);
router.get('/search', ctrl.searchProducts);
router.get('/:id', ctrl.getProduct);
router.post('/', isAdminOrCajero, ctrl.createProduct);
router.put('/:id', isAdminOrCajero, ctrl.updateProduct);
router.delete('/:id', isAdminOrCajero, ctrl.deleteProduct);

module.exports = router;
