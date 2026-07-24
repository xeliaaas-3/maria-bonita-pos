const reportRouter = require('express').Router();
const reportCtrl = require('../controllers/report.controller');
reportRouter.get('/commissions', reportCtrl.getCommissions);
reportRouter.get('/',    reportCtrl.getReport);
reportRouter.get('/pdf', reportCtrl.getReportPDF);
module.exports = reportRouter;
