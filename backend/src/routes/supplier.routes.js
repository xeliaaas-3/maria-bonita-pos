const r = require('express').Router();
const c = require('../controllers/supplier.controller');
r.get('/', c.getSuppliers);
r.post('/', c.createSupplier);
r.put('/:id', c.updateSupplier);
r.delete('/:id', c.deleteSupplier);
r.get('/purchases/all', c.getPurchases);
r.post('/purchases', c.createPurchase);
module.exports = r;
