const r = require('express').Router();
const c = require('../controllers/order.controller');
r.get('/', c.getOrders);
r.get('/:id', c.getOrder);
r.post('/', c.createOrder);
r.patch('/:id/status', c.updateOrderStatus);
module.exports = r;
