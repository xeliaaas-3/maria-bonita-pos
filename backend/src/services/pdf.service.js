// PDF SERVICE - Comprobante de Venta + Reporte
const PDFDocument = require('pdfkit');

const fmt = (n) => Number(n || 0).toLocaleString('es-PY');

function getSettings(settings = []) {
  const m = {};
  settings.forEach(s => { m[s.key] = s.value; });
  return m;
}

// COMPROBANTE DE VENTA (A4 portrait)
const generateSalePDF = async (sale, settings = []) => {
  return new Promise((resolve, reject) => {
    try {
      const cfg = getSettings(settings);

      const COMPANY  = String(cfg['company.name']      || 'MI BOUTIQUE');
      const ADDRESS  = String(cfg['company.address']   || '');
      const PHONE    = String(cfg['company.phone']     || '');
      const EMAIL    = String(cfg['company.email']     || '');
      const TAX_ID   = String(cfg['company.taxId']     || '');
      const FOOTER   = String(cfg['pos.receiptFooter'] || 'Gracias por su compra!');
      const TAX_RATE = Number(cfg['pos.taxRate']       || 0);

      // Transliterate accented chars — PDFKit Helvetica has no Unicode support
      const safe = (str) => String(str || '')
        .replace(/[áàäâãÁÀÄÂÃ]/g, 'a').replace(/[éèëêÉÈËÊ]/g, 'e')
        .replace(/[íìïîÍÌÏÎ]/g, 'i').replace(/[óòöôõÓÒÖÔÕ]/g, 'o')
        .replace(/[úùüûÚÙÜÛ]/g, 'u').replace(/[ñÑ]/g, 'n')
        .replace(/[çÇ]/g, 'c').replace(/[^\x00-\x7F]/g, '');

      const W = 595.28, H = 841.89;
      const ML = 40, MR = 40, INNER = W - ML - MR;

      const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
      const buf = [];
      doc.on('data', c => buf.push(c));
      doc.on('end',  () => resolve(Buffer.concat(buf)));
      doc.on('error', reject);

      const BLACK  = '#111827';
      const DGRAY  = '#374151';
      const MGRAY  = '#6b7280';
      const LGRAY  = '#d1d5db';
      const XLIGHT = '#f9fafb';
      const RED    = '#dc2626';
      const ACCENT = '#7c3aed';

      const dt     = new Date(sale.createdAt);
      const DATE_S = dt.toLocaleDateString('es-PY', { day:'2-digit', month:'2-digit', year:'numeric' });
      const TIME_S = dt.toLocaleTimeString('es-PY', { hour:'2-digit', minute:'2-digit' });

      const hline = (y, color, w) => {
        doc.moveTo(ML, y).lineTo(W - MR, y).lineWidth(w || 0.5).strokeColor(color || LGRAY).stroke();
      };

      // HEADER BAND
      doc.rect(0, 0, W, 85).fill(BLACK);
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#ffffff')
         .text(safe(COMPANY), ML, 20, { width: INNER, align: 'center' });

      const sub = [ADDRESS, PHONE ? 'Tel: ' + PHONE : '', EMAIL].filter(Boolean).map(safe).join('  |  ');
      if (sub) {
        doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
           .text(sub, ML, 52, { width: INNER, align: 'center' });
      }
      if (TAX_ID) {
        doc.fontSize(8).fillColor('#9ca3af')
           .text('RUC: ' + safe(TAX_ID), ML, 65, { width: INNER, align: 'center' });
      }

      // TITLE
      let Y = 100;
      doc.fontSize(14).font('Helvetica-Bold').fillColor(BLACK)
         .text('Comprobante de Venta', ML, Y, { width: INNER, align: 'center' });
      Y += 18;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(MGRAY)
         .text('N. ' + safe(sale.number), ML, Y, { width: INNER, align: 'center' });
      Y += 15;

      // SIN VALIDEZ pill
      const pW = 120, pH = 14, pX = (W - pW) / 2;
      doc.rect(pX, Y, pW, pH).fill(RED);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
         .text('SIN VALIDEZ LEGAL', pX, Y + 3.5, { width: pW, align: 'center' });
      Y += 22;

      hline(Y); Y += 10;

      // INFO BLOCK 2 columns
      const C2X = ML + INNER / 2 + 5;
      const C2W = INNER / 2 - 5;
      const C1W = INNER / 2 - 5;

      const payStr = (sale.payments || []).map(p => ({
        EFECTIVO:'Efectivo', TARJETA:'Tarjeta',
        TRANSFERENCIA:'Transferencia', QR:'QR / Billetera', MIXTO:'Mixto'
      }[p.method] || p.method)).join(', ') || '-';

      // Left column labels
      const LBL = (t, x, y) => doc.fontSize(7).font('Helvetica-Bold').fillColor(MGRAY).text(t, x, y);
      const VAL = (t, x, y, w, bold) => doc.fontSize(8.5).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(BLACK).text(safe(String(t || '-')), x, y, { width: w || C1W });

      LBL('FECHA DE EMISION', ML, Y);         VAL(DATE_S + ' ' + TIME_S, ML, Y + 9);       Y += 26;
      LBL('CONDICION', ML, Y);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(ACCENT).text('CONTADO', ML, Y + 9, { continued: true });
      doc.font('Helvetica').fillColor(LGRAY).text('  /  CREDITO'); Y += 26;
      LBL('MONEDA', ML, Y);                   VAL('Guarani (Gs.)', ML, Y + 9);              Y += 26;
      LBL('FORMA DE PAGO', ML, Y);            VAL(payStr, ML, Y + 9, C1W);

      // Right column
      const RY = Y - 78;
      LBL('NOMBRE / RAZON SOCIAL', C2X, RY);
      VAL(sale.customer?.name || 'CONSUMIDOR FINAL', C2X, RY + 9, C2W, true);
      LBL('RUC / C.I.', C2X, RY + 26);
      VAL(sale.customer?.taxId || sale.customer?.ci || '-', C2X, RY + 35, C2W);
      LBL('DIRECCION', C2X, RY + 52);
      VAL(sale.customer?.address || '-', C2X, RY + 61, C2W);
      LBL('TELEFONO', C2X, RY + 78);
      VAL(sale.customer?.phone || '-', C2X, RY + 87, C2W);

      Y += 14;
      hline(Y); Y += 10;

      // PRODUCTS TABLE
      const TC = [ML, ML+32, ML+192, ML+285, ML+348, ML+408];
      const TW = [32, 160,  93,  63,  60,  67];

      // Table header
      doc.rect(ML, Y, INNER, 16).fill(BLACK);
      const TH = (t, i, a) => doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
        .text(t, TC[i] + 3, Y + 4.5, { width: TW[i] - 6, align: a || 'left' });
      TH('CANT.', 0, 'center');
      TH('DESCRIPCION', 1);
      TH('P. UNIT.', 2, 'right');
      TH('EXENTAS', 3, 'right');
      TH('IVA 5%', 4, 'right');
      TH('IVA 10%', 5, 'right');
      Y += 16;

      let totEx = 0, totIva5 = 0, totIva10 = 0;

      (sale.items || []).forEach((item, idx) => {
        const rH = 15;
        if (idx % 2 === 1) doc.rect(ML, Y, INNER, rH).fill(XLIGHT);

        const lineTotal = Number(item.total || 0);
        let ex = 0, iv10 = 0;
        if (TAX_RATE > 0) { iv10 = Math.round(lineTotal * TAX_RATE / (100 + TAX_RATE)); }
        else { ex = lineTotal; }
        totEx += ex; totIva10 += iv10;

        doc.fontSize(8).font('Helvetica').fillColor(BLACK);
        doc.text(String(item.quantity), TC[0]+3, Y+3, { width: TW[0]-6, align: 'center' });
        doc.text(safe(item.name || '').slice(0, 28), TC[1]+3, Y+3, { width: TW[1]-6 });
        doc.text(fmt(item.unitPrice), TC[2]+3, Y+3, { width: TW[2]-6, align: 'right' });
        doc.text(ex ? fmt(ex) : '0', TC[3]+3, Y+3, { width: TW[3]-6, align: 'right' });
        doc.text('0', TC[4]+3, Y+3, { width: TW[4]-6, align: 'right' });
        doc.text(iv10 ? fmt(iv10) : '0', TC[5]+3, Y+3, { width: TW[5]-6, align: 'right' });

        Y += rH;
        doc.moveTo(ML, Y).lineTo(W-MR, Y).lineWidth(0.3).strokeColor(LGRAY).stroke();
      });

      Y += 4; hline(Y, BLACK, 1); Y += 10;

      // IVA BREAKDOWN + TOTALS
      const LX = ML, LW = 210;
      const TX2 = ML + 255, TW2 = INNER - 255;

      // Liquidacion header
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(BLACK).text('LIQUIDACION DEL IVA', LX, Y);
      Y += 12;

      const LH = 13;
      doc.rect(LX, Y, LW, LH).fill(DGRAY);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('5%',       LX + 3,   Y + 3, { width: 65, align: 'center' });
      doc.text('10%',      LX + 68,  Y + 3, { width: 65, align: 'center' });
      doc.text('TOTAL IVA',LX + 133, Y + 3, { width: 72, align: 'center' });
      Y += LH;

      doc.rect(LX, Y, LW, LH).fill(XLIGHT).lineWidth(0.5).strokeColor(LGRAY).stroke();
      doc.fontSize(8).font('Helvetica').fillColor(BLACK);
      doc.text(fmt(totIva5),            LX + 3,   Y + 2.5, { width: 65, align: 'center' });
      doc.text(fmt(totIva10),           LX + 68,  Y + 2.5, { width: 65, align: 'center' });
      doc.text(fmt(totIva5 + totIva10), LX + 133, Y + 2.5, { width: 72, align: 'center' });
      Y += LH + 5;

      // Sub-totals left
      const LRow = (label, val, y) => {
        doc.fontSize(8).font('Helvetica').fillColor(DGRAY).text(label, LX, y, { width: 100 });
        doc.font('Helvetica-Bold').fillColor(BLACK).text(fmt(val), LX + 100, y, { width: LW - 100, align: 'right' });
      };
      LRow('EXENTAS IVA', totEx,   Y); Y += 12;
      LRow('IVA 5%',      totIva5, Y); Y += 12;
      LRow('IVA 10%',     totIva10,Y); Y += 12;

      // Totals right column
      let TY2 = Y - 36 - LH * 2 - 17;

      const TRow = (lbl, val, big, color) => {
        doc.fontSize(big ? 12 : 8.5).font(big ? 'Helvetica-Bold' : 'Helvetica').fillColor(color || BLACK);
        doc.text(lbl, TX2, TY2, { width: TW2 * 0.52, continued: true });
        doc.text(fmt(val), { width: TW2 * 0.48, align: 'right' });
        TY2 += big ? 18 : 12;
      };

      TRow('EXENTAS IVA', totEx);
      TRow('IVA 5%',      totIva5);
      TRow('IVA 10%',     totIva10);
      if (Number(sale.discount) > 0) TRow('DESCUENTO', Number(sale.discount), false, RED);

      const sepY = Math.max(TY2, Y) + 3;
      doc.moveTo(TX2, sepY).lineTo(W - MR, sepY).lineWidth(1).strokeColor(BLACK).stroke();
      TY2 = sepY + 5;

      doc.fontSize(13).font('Helvetica-Bold').fillColor(BLACK)
         .text('TOTAL A PAGAR', TX2, TY2, { width: TW2 * 0.52, continued: true });
      doc.fillColor(ACCENT).text(fmt(sale.total), { width: TW2 * 0.48, align: 'right' });
      TY2 += 18;

      if (Number(sale.change) > 0) {
        doc.fontSize(8.5).font('Helvetica').fillColor('#059669')
           .text('Vuelto:', TX2, TY2, { width: TW2 * 0.52, continued: true })
           .text(fmt(sale.change), { width: TW2 * 0.48, align: 'right' });
      }

      // Notes
      if (sale.notes) {
        const noteY = Math.max(Y, TY2) + 16;
        hline(noteY, LGRAY);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(MGRAY).text('Notas:', ML, noteY + 6);
        doc.fontSize(8).font('Helvetica').fillColor(BLACK).text(safe(sale.notes), ML, noteY + 16, { width: INNER });
      }

      // FOOTER
      const FY = H - 85;
      doc.rect(0, FY, W, 85).fill('#f3f4f6');
      hline(FY, LGRAY, 1);

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BLACK)
         .text('DOCUMENTO SIN VALIDEZ LEGAL - SOLO USO INTERNO', ML, FY + 10, { align: 'center', width: INNER });
      doc.fontSize(7.5).font('Helvetica').fillColor(MGRAY)
         .text('Este comprobante es un documento interno y no reemplaza a una factura legal.', ML, FY + 24, { align: 'center', width: INNER });
      doc.text('Para factura oficial, solicite su KUDE (Factura Electronica) correspondiente.', ML, FY + 34, { align: 'center', width: INNER });
      doc.fontSize(7.5).fillColor(MGRAY)
         .text('Venta N. ' + safe(sale.number) + '  -  ' + DATE_S + ' ' + TIME_S + '  -  Atendido por: ' + safe(sale.user?.name || 'Sistema'), ML, FY + 50, { align: 'center', width: INNER });
      if (FOOTER) {
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(ACCENT)
           .text(safe(FOOTER), ML, FY + 64, { align: 'center', width: INNER });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// REPORTE PDF (A4 landscape)
const generateReportPDF = async (reportData, reportType, dateRange, settings = []) => {
  return new Promise((resolve, reject) => {
    try {
      const cfg = getSettings(settings);
      const COMPANY = String(cfg['company.name'] || 'MI BOUTIQUE').replace(/[^\x00-\x7F]/g, '?');

      const W = 841.89, H = 595.28;
      const ML = 35, INNER = W - ML * 2;

      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, autoFirstPage: true });
      const buf = [];
      doc.on('data', c => buf.push(c));
      doc.on('end',  () => resolve(Buffer.concat(buf)));
      doc.on('error', reject);

      const BLACK  = '#111827';
      const MGRAY  = '#6b7280';
      const LGRAY  = '#d1d5db';
      const XLIGHT = '#f9fafb';
      const ACCENT = '#7c3aed';
      const LABELS = { sales:'Ventas', products:'Productos', customers:'Clientes', cash:'Caja' };
      const now = new Date().toLocaleString('es-PY');

      doc.rect(0, 0, W, 52).fill(BLACK);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff')
         .text(COMPANY, ML, 12, { width: INNER - 200 });
      doc.fontSize(9).font('Helvetica').fillColor('#9ca3af')
         .text('Reporte de ' + (LABELS[reportType] || reportType) + '  |  ' + dateRange.start + ' al ' + dateRange.end, ML, 32, { width: INNER - 200 });
      doc.fontSize(7.5).fillColor('#6b7280')
         .text('Generado: ' + now, W - ML - 170, 14, { width: 170, align: 'right' })
         .text('DOCUMENTO SIN VALIDEZ LEGAL', W - ML - 170, 27, { width: 170, align: 'right' });

      let Y = 64;

      if (reportData.summary?.length) {
        const n = reportData.summary.length;
        const CW = (INNER - 10 * (n - 1)) / n;
        reportData.summary.forEach((s, i) => {
          const cx = ML + i * (CW + 10);
          doc.rect(cx, Y, CW, 46).fill(XLIGHT).lineWidth(0.5).strokeColor(LGRAY).stroke();
          doc.rect(cx, Y, 3, 46).fill(ACCENT);
          doc.fontSize(7.5).font('Helvetica').fillColor(MGRAY).text(String(s.label), cx + 10, Y + 8, { width: CW - 14 });
          doc.fontSize(13).font('Helvetica-Bold').fillColor(BLACK).text(String(s.value), cx + 10, Y + 20, { width: CW - 14 });
        });
        Y += 58;
      }

      if (reportData.tableHeaders?.length && reportData.tableData?.length) {
        const H2 = reportData.tableHeaders;
        const rows = reportData.tableData;
        const cw = INNER / H2.length;

        doc.rect(ML, Y, INNER, 16).fill(BLACK);
        H2.forEach((h, i) => {
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff')
             .text(String(h), ML + i * cw + 4, Y + 4, { width: cw - 8, align: i === 0 ? 'left' : 'right' });
        });
        Y += 16;

        rows.forEach((row, ri) => {
          if (Y > H - 40) { doc.addPage(); Y = ML; }
          if (ri % 2 === 0) doc.rect(ML, Y, INNER, 13).fill(XLIGHT);
          doc.fontSize(8).font('Helvetica').fillColor(BLACK);
          Object.values(row).forEach((v, ci) => {
            doc.text(String(v ?? '-'), ML + ci * cw + 4, Y + 2, { width: cw - 8, align: ci === 0 ? 'left' : 'right' });
          });
          Y += 13;
          doc.moveTo(ML, Y).lineTo(W - ML, Y).lineWidth(0.3).strokeColor(LGRAY).stroke();
        });
      }

      doc.fontSize(7).font('Helvetica').fillColor(MGRAY)
         .text(COMPANY + '  |  Documento sin validez legal  |  ' + now, ML, H - 20, { align: 'center', width: INNER });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// TICKET TÉRMICO HTML (58/80mm) - para imprimir desde navegador/celular
const generateSaleTicketHTML = (sale, settings = []) => {
  const cfg = getSettings(settings);
  const COMPANY  = String(cfg['company.name']      || 'MI BOUTIQUE');
  const ADDRESS  = String(cfg['company.address']   || '');
  const PHONE    = String(cfg['company.phone']     || '');
  const TAX_ID   = String(cfg['company.taxId']     || '');
  const FOOTER   = String(cfg['pos.receiptFooter'] || 'Gracias por su compra!');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const dt = new Date(sale.createdAt);
  const dateStr = dt.toLocaleDateString('es-PY', { day:'2-digit', month:'2-digit', year:'numeric' });
  const timeStr = dt.toLocaleTimeString('es-PY', { hour:'2-digit', minute:'2-digit' });

  const payStr = (sale.payments || []).map(p => ({
    EFECTIVO:'Efectivo', TARJETA:'Tarjeta',
    TRANSFERENCIA:'Transferencia', QR:'QR', MIXTO:'Mixto'
  }[p.method] || p.method)).join(', ') || '-';

  const itemsHTML = (sale.items || []).map(item => `
    <div class="item">
      <div class="item-name">${esc(item.name)}</div>
      <div class="item-row">
        <span>${item.quantity} x ${fmt(item.unitPrice)}</span>
        <span>${fmt(item.total)}</span>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Ticket ${esc(sale.number)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    width: 80mm;
    margin: 0;
    padding: 8px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #000;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; }
  .item { margin-bottom: 3px; }
  .item-name { font-weight: bold; }
  .item-row { display: flex; justify-content: space-between; }
  .totals .row { font-size: 13px; }
  .totals .grand { font-size: 16px; font-weight: bold; }
  .footer { margin-top: 8px; font-size: 11px; }
  @media print {
    body { width: 80mm; }
  }
</style>
</head>
<body onload="window.print()">
  <div class="center bold" style="font-size:14px;">${esc(COMPANY)}</div>
  ${ADDRESS ? `<div class="center">${esc(ADDRESS)}</div>` : ''}
  ${PHONE ? `<div class="center">Tel: ${esc(PHONE)}</div>` : ''}
  ${TAX_ID ? `<div class="center">RUC: ${esc(TAX_ID)}</div>` : ''}
  <div class="line"></div>
  <div class="center bold">COMPROBANTE DE VENTA</div>
  <div class="center">N. ${esc(sale.number)}</div>
  <div class="center">${dateStr} ${timeStr}</div>
  <div class="line"></div>
  <div>Cliente: ${esc(sale.customer?.name || 'CONSUMIDOR FINAL')}</div>
  <div>Atendido: ${esc(sale.user?.name || '-')}</div>
  <div class="line"></div>
  ${itemsHTML}
  <div class="line"></div>
  <div class="totals">
    ${Number(sale.discount) > 0 ? `<div class="row"><span>Descuento</span><span>-${fmt(sale.discount)}</span></div>` : ''}
    <div class="row grand"><span>TOTAL</span><span>${fmt(sale.total)}</span></div>
    ${Number(sale.change) > 0 ? `<div class="row"><span>Vuelto</span><span>${fmt(sale.change)}</span></div>` : ''}
    <div class="row"><span>Pago</span><span>${esc(payStr)}</span></div>
  </div>
  <div class="line"></div>
  <div class="footer center">
    ${esc(FOOTER)}<br/>
    DOCUMENTO SIN VALIDEZ LEGAL
  </div>
</body>
</html>`;
};

module.exports = { generateSalePDF, generateReportPDF, generateSaleTicketHTML };
