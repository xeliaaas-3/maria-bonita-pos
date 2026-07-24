const router = require('express').Router();
const c = require('../controllers/transfer.controller');
router.get('/', c.getTransfers);
router.get('/:id', c.getTransfer);
router.post('/', c.createTransfer);
router.patch('/:id/receive', c.receiveTransfer);
module.exports = router;
