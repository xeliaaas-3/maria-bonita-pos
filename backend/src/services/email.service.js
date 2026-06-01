const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.SMTP_HOST) {
      logger.warn('SMTP no configurado, email no enviado');
      return false;
    }
    const t = getTransporter();
    await t.sendMail({ from: process.env.SMTP_FROM, to, subject, html, text });
    logger.info(`Email enviado a: ${to}`);
    return true;
  } catch (error) {
    logger.error('Error al enviar email:', error);
    return false;
  }
};

module.exports = { sendEmail };
