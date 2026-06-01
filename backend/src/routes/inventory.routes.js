// ============================================
// INVENTORY ROUTES
// ============================================
const inventoryRouter = require('express').Router();
const invCtrl = require('../controllers/inventory.controller');
const { isAdmin, isAdminOrCajero } = require('../middleware/auth.middleware');

inventoryRouter.get('/', invCtrl.getInventory);
inventoryRouter.get('/kardex', invCtrl.getKardex);
inventoryRouter.post('/adjust', isAdminOrCajero, invCtrl.adjustStock);
inventoryRouter.post('/transfer', isAdmin, invCtrl.createTransfer);

module.exports = inventoryRouter;
