const router = require('express').Router();
const c = require('../controllers/purchase.controller');
router.get('/', c.getPurchases);
router.get('/:id', c.getPurchase);
router.post('/', c.createPurchase);
router.patch('/:id/status', c.updatePurchaseStatus);
module.exports = router;
