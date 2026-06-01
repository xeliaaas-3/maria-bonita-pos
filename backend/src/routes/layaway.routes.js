const r = require('express').Router();
const c = require('../controllers/layaway.controller');
r.get('/', c.getLayaways);
r.get('/:id', c.getLayaway);
r.post('/', c.createLayaway);
r.post('/:id/payments', c.addPayment);
r.patch('/:id/cancel', c.cancelLayaway);
module.exports = r;
