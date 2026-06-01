const reportRouter = require('express').Router();
const reportCtrl = require('../controllers/report.controller');
reportRouter.get('/',    reportCtrl.getReport);
reportRouter.get('/pdf', reportCtrl.getReportPDF);
module.exports = reportRouter;
