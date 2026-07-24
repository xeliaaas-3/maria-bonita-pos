const router = require('express').Router();
const ctrl = require('../controllers/sale.controller');
const { isAdminOrCajero } = require('../middleware/auth.middleware');

router.get('/', ctrl.getSales);
router.get('/:id', ctrl.getSale);
router.get('/:id/ticket', ctrl.getSaleTicket);
router.get('/:id/ticket-html', ctrl.getSaleTicketHtml);
router.post('/', ctrl.createSale);
router.patch('/:id/cancel', isAdminOrCajero, ctrl.cancelSale);
router.patch('/:id', isAdminOrCajero, ctrl.updateSale);
router.post('/:id/return', isAdminOrCajero, ctrl.returnSale);

module.exports = router;
