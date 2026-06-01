// ============================================
// RUTAS - AUTH
// ============================================
const authRouter = require('express').Router();
const authCtrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

authRouter.post('/login', authCtrl.login);
authRouter.post('/refresh', authCtrl.refreshToken);
authRouter.post('/forgot-password', authCtrl.forgotPassword);
authRouter.post('/reset-password', authCtrl.resetPassword);
authRouter.post('/logout', authenticate, authCtrl.logout);
authRouter.get('/me', authenticate, authCtrl.getMe);
authRouter.patch('/change-password', authenticate, authCtrl.changePassword);

module.exports = authRouter;
