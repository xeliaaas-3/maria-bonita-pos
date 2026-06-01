const router = require('express').Router();
const ctrl = require('../controllers/customer.controller');

router.get('/', ctrl.getCustomers);
router.get('/search', ctrl.searchCustomers);
router.get('/:id', ctrl.getCustomer);
router.post('/', ctrl.createCustomer);
router.put('/:id', ctrl.updateCustomer);
router.delete('/:id', ctrl.deleteCustomer);

router.patch('/:id/debt-payment', ctrl.debtPayment);
module.exports = router;
