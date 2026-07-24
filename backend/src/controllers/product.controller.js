// ============================================
// CONTROLADOR DE PRODUCTOS
// ============================================

const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { generateSKU } = require('../utils/helpers');
const { emitToBranch } = require('../services/socket.service');

const prisma = new PrismaClient();

// LISTAR
exports.getProducts = async (req, res) => {
  try {
    const { search, categoryId, brandId, status, page = 1, limit = 20 } = req.query;
    const branchId = req.user.branchId;

    const where = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          stocks: branchId ? { where: { branchId } } : true,
          _count: { select: { variants: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener productos' });
  }
};

// BUSCAR (para POS)
exports.searchProducts = async (req, res) => {
  try {
    const { q, limit = 12 } = req.query;
    const branchId = req.user.branchId;

    if (!q || q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVO',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { barcode: { equals: q } }
        ]
      },
      include: {
        category: { select: { name: true } },
        stocks: branchId ? { where: { branchId } } : { take: 1 },
        variants: { where: { isActive: true }, take: 10 }
      },
      take: Number(limit)
    });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error en búsqueda' });
  }
};

// OBTENER UNO
exports.getProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        brand: true,
        variants: true,
        stocks: { include: { branch: { select: { id: true, name: true } } } },
        movements: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener producto' });
  }
};

// CREAR
exports.createProduct = async (req, res) => {
  try {
    const {
      name, description, sku, categoryId, brandId,
      costPrice, salePrice, minStock, taxRate, images, tags,
      isFeatured, status, variants
    } = req.body;

    // Convertir barcode vacío a null para evitar violación UNIQUE
    const barcode = req.body.barcode && req.body.barcode.trim() !== '' ? req.body.barcode.trim() : null;

    // Convertir categoryId / brandId vacíos a null para evitar violación FK
    const cleanCategoryId = categoryId && categoryId !== '' ? categoryId : null;
    const cleanBrandId = brandId && brandId !== '' ? brandId : null;

    // Verificar SKU único
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'El SKU ya existe' });
    }

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name, description, sku, barcode, categoryId: cleanCategoryId, brandId: cleanBrandId,
          costPrice, salePrice, minStock: minStock || 5,
          taxRate: taxRate || 0, images: images || [],
          tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
          isFeatured: isFeatured || false,
          status: status || 'ACTIVO'
        }
      });

      // Crear variantes
      if (variants && variants.length > 0) {
        await tx.productVariant.createMany({
          data: variants.map(v => ({
            productId: newProduct.id,
            size: v.size,
            color: v.color,
            sku: v.sku || `${sku}-${v.size || ''}-${v.color || ''}`.toUpperCase(),
            price: v.price || null,
            isActive: true
          }))
        });
      }

      // Stock inicial en sucursal principal
      const mainBranch = await tx.branch.findFirst({ where: { isMain: true } });
      if (mainBranch) {
        await tx.productStock.create({
          data: { productId: newProduct.id, branchId: mainBranch.id, quantity: 0 }
        });
      }

      return newProduct;
    });

    await prisma.activityLog.create({
      data: { userId: req.user.id, action: 'CREATE_PRODUCT', entity: 'Product', entityId: product.id }
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({ success: false, error: 'Error al crear producto' });
  }
};

// ACTUALIZAR
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Eliminar campos no actualizables
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.stocks;
    delete updateData.variants;
    delete updateData.category;
    delete updateData.brand;
    delete updateData.movements;

    // Convertir barcode vacío a null para evitar violación UNIQUE
    if ('barcode' in updateData) {
      updateData.barcode = updateData.barcode && updateData.barcode.trim() !== ''
        ? updateData.barcode.trim()
        : null;
    }

    // Convertir categoryId / brandId vacíos a null para evitar violación FK
    if ('categoryId' in updateData) {
      updateData.categoryId = updateData.categoryId && updateData.categoryId !== '' ? updateData.categoryId : null;
    }
    if ('brandId' in updateData) {
      updateData.brandId = updateData.brandId && updateData.brandId !== '' ? updateData.brandId : null;
    }

    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Convertir campos numéricos
    if (updateData.costPrice !== undefined) updateData.costPrice = Number(updateData.costPrice);
    if (updateData.salePrice !== undefined) updateData.salePrice = Number(updateData.salePrice);
    if (updateData.minStock !== undefined) updateData.minStock = Number(updateData.minStock);
    if (updateData.taxRate !== undefined) updateData.taxRate = Number(updateData.taxRate);

    const product = await prisma.product.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, data: product });
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar producto' });
  }
};

// ELIMINAR
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Si tiene ventas, solo desactivar
    const hasSales = await prisma.saleItem.findFirst({ where: { productId: id } });
    if (hasSales) {
      await prisma.product.update({ where: { id }, data: { status: 'INACTIVO' } });
      return res.json({ success: true, message: 'Producto desactivado (tiene historial de ventas)' });
    }

    // Eliminar registros relacionados en orden para evitar FK violations
    await prisma.inventoryMovement.deleteMany({ where: { productId: id } });
    await prisma.stock.deleteMany({ where: { productId: id } });
    await prisma.labelItem.deleteMany({ where: { productId: id } }).catch(() => {});
    await prisma.layawayItem.deleteMany({ where: { productId: id } }).catch(() => {});
    await prisma.orderItem.deleteMany({ where: { productId: id } }).catch(() => {});
    await prisma.purchaseItem.deleteMany({ where: { productId: id } }).catch(() => {});

    // Eliminar variantes
    await prisma.productVariant.deleteMany({ where: { productId: id } });

    // Eliminar producto
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: 'Producto eliminado' });
  } catch (error) {
    logger.error('Delete product error:', error);
    // Si aun hay FK error, desactivar en vez de eliminar
    try {
      await prisma.product.update({ where: { id: req.params.id }, data: { status: 'INACTIVO' } });
      res.json({ success: true, message: 'Producto desactivado' });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Error al eliminar producto' });
    }
  }
};

// ETIQUETAS PDF (A4, 3x8 = 24 etiquetas por hoja)
exports.getLabels = async (req, res) => {
  try {
    const { items } = req.body; // [{productId, variantId, qty}]
    const PDFDocument = require('pdfkit');
    const bwipjs = require('bwip-js');
    const settings = await prisma.setting.findMany({ where: { group: 'company' } });
    const cfg = {};
    settings.forEach(s => { cfg[s.key] = s.value; });
    const company = cfg['company.name'] || 'MI BOUTIQUE';

    const doc = new PDFDocument({ size: 'A4', margin: 10, autoFirstPage: true });
    const buffers = [];
    doc.on('data', c => buffers.push(c));
    doc.on('end', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="etiquetas.pdf"');
      res.send(Buffer.concat(buffers));
    });

    const tr = (str) => String(str || '')
      .replace(/[áàäâãÁÀÄÂÃ]/g, 'a').replace(/[éèëêÉÈËÊ]/g, 'e')
      .replace(/[íìïîÍÌÏÎ]/g, 'i').replace(/[óòöôõÓÒÖÔÕ]/g, 'o')
      .replace(/[úùüûÚÙÜÛ]/g, 'u').replace(/[ñÑ]/g, 'n')
      .replace(/[^\x00-\x7F]/g, '');

    const W_PAGE = 595.28, H_PAGE = 841.89;
    // Etiquetas horizontales tipo moda: 2 cols x 5 rows
    const COLS = 2, ROWS = 5;
    const PAD = 18, GAP_X = 12, GAP_Y = 10;
    const LW = (W_PAGE - PAD * 2 - GAP_X * (COLS - 1)) / COLS;  // ~277pt
    const LH = (H_PAGE - PAD * 2 - GAP_Y * (ROWS - 1)) / ROWS;  // ~155pt

    const L_BLACK = '#0d0d0d';
    const L_GOLD  = '#c9a84c';
    const L_GRAY  = '#6b7280';

    let col = 0, row = 0;

    const drawLabel = async (product, variant, idx) => {
      if (idx > 0 && col === 0 && row === 0) doc.addPage();
      const x = PAD + col * (LW + GAP_X);
      const y = PAD + row * (LH + GAP_Y);

      // fondo blanco con borde fino
      doc.rect(x, y, LW, LH).fill('#ffffff');
      doc.rect(x, y, LW, LH).lineWidth(0.5).strokeColor('#d1d5db').stroke();

      // ── Columna izquierda (info) — 55% del ancho ──────────────────────────
      const LEFT_W = Math.round(LW * 0.55);

      // Franja superior negra (cabecera empresa)
      const HEAD_H = 20;
      doc.rect(x, y, LEFT_W, HEAD_H).fill(L_BLACK);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#ffffff')
         .text(tr(company).toUpperCase(), x + 8, y + 6, { width: LEFT_W - 12, align: 'left', characterSpacing: 1.2 });

      // Nombre del producto
      const name = tr(product.name).slice(0, 32);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(L_BLACK)
         .text(name, x + 8, y + HEAD_H + 8, { width: LEFT_W - 14, lineBreak: true, height: 24, ellipsis: true });

      // Categoría/Marca en dorado
      const brand = tr(product.brand?.name || product.category?.name || '').toUpperCase();
      if (brand) {
        doc.fontSize(6).font('Helvetica').fillColor(L_GOLD)
           .text(brand, x + 8, y + HEAD_H + 34, { width: LEFT_W - 14 });
      }

      // Separador
      const sep1 = y + HEAD_H + 46;
      doc.moveTo(x + 8, sep1).lineTo(x + LEFT_W - 8, sep1).lineWidth(0.3).strokeColor('#e5e7eb').stroke();

      // SKU
      const sku = tr(String(variant?.sku || product.sku || ''));
      doc.fontSize(6).font('Helvetica').fillColor(L_GRAY)
         .text('SKU: ' + sku, x + 8, sep1 + 5, { width: LEFT_W - 14 });

      // Variante (talle / color) — grande y destacado
      const vInfo = [variant?.size, variant?.color].filter(Boolean).map(v => tr(String(v))).join(' / ');
      if (vInfo) {
        doc.fontSize(22).font('Helvetica-Bold').fillColor(L_BLACK)
           .text(vInfo, x + 8, sep1 + 16, { width: LEFT_W - 14, lineBreak: false });
      }

      // Franja dorada con precio en la parte inferior izquierda
      const priceH = 24;
      doc.rect(x, y + LH - priceH, LEFT_W, priceH).fill(L_GOLD);
      const price = Number(variant?.price || product.salePrice || 0);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff')
         .text('Gs. ' + price.toLocaleString('es-PY'), x + 4, y + LH - priceH + 6, { width: LEFT_W - 8, align: 'center' });

      // ── Columna derecha (código de barras real) ───────────────────────────
      const RX = x + LEFT_W;
      const RW = LW - LEFT_W;

      // separador vertical dorado
      doc.rect(RX, y, 2.5, LH).fill(L_GOLD);

      // Generar barcode real con bwip-js (Code128)
      const barcodeValue = product.barcode || variant?.sku || product.sku || '0000000000';
      const barPngPad = 8;
      const barW = RW - barPngPad * 2;
      const barH = LH - 40;
      try {
        const barPng = await bwipjs.toBuffer({
          bcid:        'code128',
          text:        String(barcodeValue).replace(/[^\x20-\x7E]/g, ''),
          scale:       2,
          height:      Math.round(barH * 0.35),  // en mm (bwip usa mm)
          includetext: true,
          textxalign:  'center',
          textsize:    8,
          padding:     2,
          backgroundcolor: 'ffffff',
        });
        const barImgW = barW;
        const barImgH = barH * 0.72;
        doc.image(barPng, RX + barPngPad, y + 14, { width: barImgW, height: barImgH, fit: [barImgW, barImgH] });
      } catch {
        // fallback texto si falla barcode
        doc.fontSize(6).font('Helvetica').fillColor(L_GRAY)
           .text(tr(String(barcodeValue)), RX + 4, y + 30, { width: RW - 8, align: 'center' });
      }

      col++;
      if (col >= COLS) { col = 0; row++; }
      if (row >= ROWS) { col = 0; row = 0; }
    };

    let labelIdx = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId }, include: { variants: true } });
      if (!product) continue;
      const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : null;
      for (let q = 0; q < (item.qty || 1); q++) {
        await drawLabel(product, variant, labelIdx++);
      }
    }

    doc.end();
  } catch (err) {
    logger.error('Labels error:', err);
    res.status(500).json({ success: false, error: 'Error al generar etiquetas' });
  }
};

// CATÁLOGO PDF para WhatsApp
// CATÁLOGO PDF profesional con imagenes — dos versiones (con/sin precio)
exports.getCatalog = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const https = require('https');
    const http  = require('http');
    const { URL }  = require('url');

    const showPrice = req.query.showPrice !== 'false'; // default true
    const layout = req.query.layout === 'poster' ? 'poster' : 'grid'; // 'grid' = catalogo en cuadricula, 'poster' = una pagina por producto

    // Transliterate for PDFKit Helvetica (no Unicode support)
    const tr = (str) => String(str || '')
      .replace(/[áàäâãÁÀÄÂÃ]/g, 'a').replace(/[éèëêÉÈËÊ]/g, 'e')
      .replace(/[íìïîÍÌÏÎ]/g, 'i').replace(/[óòöôõÓÒÖÔÕ]/g, 'o')
      .replace(/[úùüûÚÙÜÛ]/g, 'u').replace(/[ñÑ]/g, 'n')
      .replace(/[çÇ]/g, 'c').replace(/[^\x00-\x7F]/g, '');

    const settings = await prisma.setting.findMany({ where: { group: 'company' } });
    const cfg = {};
    settings.forEach(s => { cfg[s.key] = s.value; });

    const COMPANY  = cfg['company.name']          || 'MI BOUTIQUE';
    const ADDRESS  = cfg['company.address']       || '';
    const PHONE    = cfg['company.phone']         || '';
    const EMAIL    = cfg['company.email']         || '';
    // cfg values from Prisma Json field — strip surrounding quotes if string
    const rawSymbol = cfg['company.currencySymbol'];
    const SYMBOL = 'Gs.'; // PDFKit Helvetica doesn't support Gs. (multi-byte) — use Gs. instead

    const categoryIds = req.query.categories
      ? req.query.categories.split(',').filter(Boolean)
      : null;

    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVO',
        ...(categoryIds?.length ? { categoryId: { in: categoryIds } } : {})
      },
      include: { variants: true, category: true, brand: true },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }]
    });

    // ── helpers ────────────────────────────────────────────────
    const BASE_URL = process.env.BASE_URL || ('http://localhost:' + (process.env.PORT || 3000));
    const fetchImageBuffer = async (url) => {
      if (!url) return null;
      try {
        const fetch = require('node-fetch');
        const absUrl = url.startsWith('http') ? url : BASE_URL + url;
        console.log('Fetching image:', absUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(absUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Maria-Bonita-POS/1.0' }
        });
        clearTimeout(timeout);
        if (!res.ok) {
          console.warn('Image fetch failed:', absUrl, res.status);
          return null;
        }
        const buf = await res.buffer();
        console.log('Image fetched OK:', absUrl, buf.length, 'bytes');
        return buf;
      } catch (e) {
        console.warn('Image fetch error:', url, e.message);
        return null;
      }
    };

    const fmt = (n) => Number(n || 0).toLocaleString('es-PY');

    // ── layout constants ───────────────────────────────────────
    const PAGE_W  = 595.28;
    const PAGE_H  = 841.89;
    const ML      = 28;
    const MR      = 28;
    const MT      = 28;
    const INNER   = PAGE_W - ML - MR;

    // ── Grey & White Modern Fashion — 2 columnas amplias ──────
    const COLS    = 2;
    const GAP     = 20;
    const PAD_PAGE = 36;
    const INNER_W  = PAGE_W - PAD_PAGE * 2;
    const CARD_W  = (INNER_W - GAP) / 2;          // ~238pt
    const IMG_H   = Math.round(CARD_W * (4 / 3)); // 3:4 portrait ~317pt
    const INFO_H  = showPrice ? 80 : 64;
    const CARD_H  = IMG_H + INFO_H;

    // colours — Grey & White Modern palette
    const C_BG     = '#ffffff';
    const C_PAGE   = '#f4f4f4';  // fondo gris claro de pagina
    const C_BLACK  = '#1a1a1a';
    const C_DGRAY  = '#333333';
    const C_MGRAY  = '#888888';
    const C_LGRAY  = '#cccccc';
    const C_XLGRAY = '#eeeeee';
    const C_ACCENT = '#c9a84c'; // dorado marca Maria Bonita
    const C_COVER  = '#1a1a1a'; // casi negro para portada

    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true, bufferPages: true });
    const buffers = [];
    doc.on('data', c => buffers.push(c));
    doc.on('end', () => {
      res.setHeader('Content-Type', 'application/pdf');
      const fname = (layout === 'poster' ? 'catalogo-fichas-' : 'catalogo-') + (showPrice ? 'con-precios.pdf' : 'sin-precios.pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
      res.send(Buffer.concat(buffers));
    });

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' });
    const subtitle = showPrice ? 'CATALOGO DE PRODUCTOS Y PRECIOS' : 'CATALOGO DE COLECCION';

    // QR de WhatsApp (generado una sola vez, reutilizado en portada y pagina de contacto)
    let qrBuf = null;
    try {
      const QRCode = require('qrcode');
      const waPhone = (PHONE || '').replace(/\D/g, '');
      if (waPhone) qrBuf = await QRCode.toBuffer(`https://wa.me/${waPhone}`, { width: 180, margin: 1, color: { dark: '#0d0d0d', light: '#fafaf8' } });
    } catch { /* qr opcional */ }

    // Logo desde assets (si existe)
    let logoBuf = null;
    try {
      const fs = require('fs'), path = require('path');
      const lp = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(lp)) logoBuf = fs.readFileSync(lp);
    } catch { /* opcional */ }

    // ══════════════════════════════════════════════════════════
    // PORTADA — editorial premium
    // ══════════════════════════════════════════════════════════
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C_COVER);

    // barras doradas top y bottom
    doc.rect(0, 0, PAGE_W, 8).fill(C_ACCENT);
    doc.rect(0, PAGE_H - 8, PAGE_W, 8).fill(C_ACCENT);

    // franja lateral izquierda dorada
    doc.rect(0, 8, 5, PAGE_H - 16).fill(C_ACCENT);

    // logo o nombre empresa — zona superior centrada
    if (logoBuf) {
      try {
        doc.image(logoBuf, PAGE_W / 2 - 55, 110, { width: 110, height: 110, fit: [110, 110], align: 'center' });
      } catch { logoBuf = null; }
    }
    const nameY = logoBuf ? 238 : 200;
    doc.fontSize(44).font('Helvetica-Bold').fillColor('#ffffff')
       .text(tr(COMPANY).toUpperCase(), ML + 8, nameY, { width: INNER, align: 'center', characterSpacing: 5 });

    // linea dorada decorativa
    const divY = nameY + 60;
    doc.moveTo(ML + 60, divY).lineTo(PAGE_W - MR - 60, divY).lineWidth(1.5).strokeColor(C_ACCENT).stroke();

    // subtitle + date
    doc.fontSize(10).font('Helvetica').fillColor(C_ACCENT)
       .text(subtitle, ML, divY + 14, { width: INNER, align: 'center', characterSpacing: 3 });
    doc.fontSize(9).fillColor('#9ca3af')
       .text(tr(dateStr).toUpperCase(), ML, divY + 32, { width: INNER, align: 'center', characterSpacing: 2 });

    // contador de productos
    doc.fontSize(8).fillColor('#4b5563')
       .text(products.length + ' productos en este catalogo', ML, divY + 50, { width: INNER, align: 'center' });

    // ── bloque inferior: QR + contacto ──
    const footBlockY = PAGE_H - 180;
    doc.moveTo(ML + 40, footBlockY).lineTo(PAGE_W - MR - 40, footBlockY).lineWidth(0.5).strokeColor('#374151').stroke();

    // QR en portada (pequeño, esquina derecha)
    if (qrBuf) {
      try {
        doc.image(qrBuf, PAGE_W - MR - 80, footBlockY + 12, { width: 72, height: 72 });
        doc.fontSize(6).fillColor('#9ca3af')
           .text('Escanea para\nWhatsApp', PAGE_W - MR - 80, footBlockY + 86, { width: 72, align: 'center' });
      } catch { /* opcional */ }
    }

    // datos de contacto
    const contactLines = [tr(ADDRESS), PHONE && ('WhatsApp: ' + PHONE), EMAIL].filter(Boolean);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C_ACCENT)
       .text('CONTACTO', ML + 8, footBlockY + 14, { width: INNER * 0.55 });
    contactLines.forEach((line, i) => {
      doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
         .text(tr(line), ML + 8, footBlockY + 28 + i * 14, { width: INNER * 0.55 });
    });
    doc.fontSize(7.5).font('Helvetica').fillColor('#6b7280')
       .text('Envios a todo Paraguay  •  Cambios en 7 dias', ML + 8, footBlockY + 28 + contactLines.length * 14 + 6, { width: INNER * 0.55 });

    // ══════════════════════════════════════════════════════════
    // POSTER LAYOUT — dos fichas por hoja (media pagina cada una)
    // ══════════════════════════════════════════════════════════
    if (layout === 'poster') {
      const HALF_H = (PAGE_H - 2 * GAP) / 2;
      const safeArr = (arr) => arr.map(v => tr(String(v)));

      const drawCard = async (product, baseY) => {
        const PAD = 14;
        const innerW = PAGE_W - 2 * GAP;
        const innerH = HALF_H;

        // card background + accent border
        doc.rect(GAP, baseY, innerW, innerH).fill('#ffffff');
        doc.rect(GAP, baseY, innerW, 5).fill(C_ACCENT);
        doc.rect(GAP, baseY, 3, innerH).fill(C_ACCENT);

        // ── header: marca/empresa + categoria ──
        doc.fontSize(9).font('Helvetica-Bold').fillColor(C_BLACK)
           .text(COMPANY.toUpperCase(), GAP + PAD, baseY + 12, { width: innerW - 2 * PAD, characterSpacing: 2 });
        doc.fontSize(7).font('Helvetica').fillColor(C_MGRAY)
           .text(tr(product.category?.name || '').toUpperCase(), GAP + PAD, baseY + 12, { width: innerW - 2 * PAD, align: 'right', characterSpacing: 1 });

        // ── titulo del producto ──
        const safeName = tr(product.name) || tr(product.name.replace(/./g, '?'));
        doc.fontSize(20).font('Helvetica-Bold').fillColor(C_BLACK)
           .text(safeName.toUpperCase(), GAP + PAD, baseY + 24, { width: innerW - 2 * PAD, lineBreak: false, ellipsis: true });

        // ── imagenes ──
        const imgTop = baseY + 50;
        const imgH   = innerH - 50 - 30; // dejar espacio para footer
        const productImages = (product.images || []).filter(Boolean);
        const mainImg  = productImages[0];
        const sideImgs = productImages.slice(1, 3);

        const LEFT_W  = innerW * 0.30 - PAD;
        const RIGHT_W = innerW - LEFT_W - PAD * 2 - 6;
        const leftX  = GAP + PAD;
        const rightX = leftX + LEFT_W + 6;

        // columna izquierda: hasta 2 imagenes apiladas
        const thumbCount = Math.max(sideImgs.length, 1);
        const thumbGap = 5;
        const thumbH = (imgH - thumbGap * (thumbCount - 1)) / thumbCount;
        for (let i = 0; i < thumbCount; i++) {
          const ty = imgTop + i * (thumbH + thumbGap);
          doc.rect(leftX, ty, LEFT_W, thumbH).fill('#ffffff');
          const url = sideImgs[i];
          if (url) {
            const buf = await fetchImageBuffer(url);
            if (buf) {
              try {
                doc.save();
                doc.rect(leftX, ty, LEFT_W, thumbH).clip();
                doc.image(buf, leftX, ty, { width: LEFT_W, height: thumbH, cover: [LEFT_W, thumbH], align: 'center', valign: 'center' });
                doc.restore();
              } catch { /* keep placeholder */ }
            }
          }
        }

        // columna derecha: imagen principal grande
        doc.rect(rightX, imgTop, RIGHT_W, imgH).fill('#ffffff');
        if (mainImg) {
          const buf = await fetchImageBuffer(mainImg);
          if (buf) {
            try {
              doc.save();
              doc.rect(rightX, imgTop, RIGHT_W, imgH).clip();
              doc.image(buf, rightX, imgTop, { width: RIGHT_W, height: imgH, cover: [RIGHT_W, imgH], align: 'center', valign: 'center' });
              doc.restore();
            } catch { /* keep placeholder */ }
          }
        } else {
          doc.fontSize(10).font('Helvetica').fillColor('#9ca3af')
             .text('Sin imagen', rightX, imgTop + imgH / 2 - 5, { width: RIGHT_W, align: 'center' });
        }

        // ── footer: detalles + precio ──
        const footY = imgTop + imgH + 6;
        const sizes  = [...new Set(product.variants.map(v => v.size).filter(Boolean))];
        const colors = [...new Set(product.variants.map(v => v.color).filter(Boolean))];
        const detailParts = [
          product.brand?.name ? tr(product.brand.name) : null,
          sizes.length  ? 'Talles: ' + safeArr(sizes).join(' ')   : null,
          colors.length ? 'Colores: ' + safeArr(colors).join(', ') : null,
        ].filter(Boolean).join('   -   ');

        doc.fontSize(8).font('Helvetica').fillColor(C_DGRAY)
           .text(detailParts, GAP + PAD, footY, { width: showPrice ? innerW * 0.6 - PAD : innerW - 2 * PAD, lineBreak: false, ellipsis: true });

        if (showPrice) {
          doc.fontSize(15).font('Helvetica-Bold').fillColor(C_ACCENT)
             .text('Gs. ' + fmt(product.salePrice), GAP + PAD, footY - 2, { width: innerW - 2 * PAD, align: 'right' });
        }
      };

      for (let pi = 0; pi < products.length; pi += 2) {
        doc.addPage();
        doc.rect(0, 0, PAGE_W, PAGE_H).fill('#fafaf8');
        // header compacto en cada hoja
        doc.rect(0, 0, PAGE_W, 6).fill(C_ACCENT);
        doc.rect(0, PAGE_H - 22, PAGE_W, 22).fill(C_BLACK);
        doc.fontSize(7).font('Helvetica').fillColor('#6b7280')
           .text(tr(COMPANY) + '  •  ' + (PHONE ? 'WhatsApp: ' + PHONE : '') + '  •  ' + tr(ADDRESS), ML, PAGE_H - 14, { width: INNER * 0.78, lineBreak: false, ellipsis: true });
        doc.fontSize(7).fillColor(C_ACCENT)
           .text(String(Math.floor(pi / 2) + 1), ML, PAGE_H - 14, { width: INNER - 6, align: 'right' });

        await drawCard(products[pi], 6 + GAP);
        if (products[pi + 1]) {
          await drawCard(products[pi + 1], 6 + GAP + HALF_H + GAP);
        }
      }

      // pagina de contacto final (poster tambien)
      doc.addPage();
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(C_COVER);
      doc.rect(0, 0, PAGE_W, 8).fill(C_ACCENT);
      doc.rect(0, PAGE_H - 8, PAGE_W, 8).fill(C_ACCENT);
      doc.rect(0, 8, 5, PAGE_H - 16).fill(C_ACCENT);
      if (logoBuf) { try { doc.image(logoBuf, PAGE_W / 2 - 45, 80, { width: 90, height: 90, fit: [90, 90] }); } catch {} }
      const pctY = logoBuf ? 190 : 170;
      doc.fontSize(30).font('Helvetica-Bold').fillColor('#ffffff')
         .text(tr(COMPANY).toUpperCase(), ML, pctY, { width: INNER, align: 'center', characterSpacing: 4 });
      doc.moveTo(ML + 80, pctY + 44).lineTo(PAGE_W - MR - 80, pctY + 44).lineWidth(1).strokeColor(C_ACCENT).stroke();
      doc.fontSize(9).font('Helvetica').fillColor(C_ACCENT)
         .text('PARA HACER TU PEDIDO', ML, pctY + 58, { width: INNER, align: 'center', characterSpacing: 2 });
      if (qrBuf) {
        try {
          const qs = 130;
          doc.image(qrBuf, PAGE_W / 2 - qs / 2, pctY + 80, { width: qs, height: qs });
          doc.rect(PAGE_W / 2 - qs / 2 - 4, pctY + 76, qs + 8, qs + 8).lineWidth(1.5).strokeColor(C_ACCENT).stroke();
        } catch {}
      }
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#ffffff').text(PHONE || '', ML, pctY + 234, { width: INNER, align: 'center' });
      [tr(ADDRESS), EMAIL, 'Envios a todo Paraguay', 'Cambios en 7 dias'].filter(Boolean).forEach((line, i) => {
        doc.fontSize(8).font('Helvetica').fillColor('#9ca3af').text(tr(line), ML, pctY + 256 + i * 14, { width: INNER, align: 'center' });
      });

      doc.end();
      return;
    }

    // grouped by category (sin index ni separador — directo a productos)
    const grouped = {};
    for (const p of products) {
      const cat = p.category?.name || 'Sin categoria';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }
    const categories = Object.keys(grouped).sort();

    const drawPageHeader = (catLabel) => {
      // fondo gris claro de pagina
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(C_PAGE);
      // header minimalista blanco
      doc.rect(0, 0, PAGE_W, 52).fill(C_BG);
      // linea dorada inferior del header
      doc.rect(0, 50, PAGE_W, 2).fill(C_ACCENT);
      // empresa — izquierda, pequeño, uppercase
      doc.fontSize(8).font('Helvetica-Bold').fillColor(C_MGRAY)
         .text(tr(COMPANY).toUpperCase(), PAD_PAGE, 16, { width: INNER_W * 0.5, characterSpacing: 2 });
      // nombre catalogo — grande, negro
      doc.fontSize(11).font('Helvetica-Bold').fillColor(C_BLACK)
         .text(tr(COMPANY).toUpperCase(), PAD_PAGE, 28, { width: INNER_W * 0.5, characterSpacing: 1 });
      // categoria derecha
      doc.fontSize(7).font('Helvetica').fillColor(C_MGRAY)
         .text(tr(catLabel).toUpperCase(), PAD_PAGE, 21, { width: INNER_W, align: 'right', characterSpacing: 1.5 });
      return 64;
    };

    const drawPageFooter = (pageNum) => {
      // footer minimalista blanco
      doc.rect(0, PAGE_H - 30, PAGE_W, 30).fill(C_BG);
      doc.rect(0, PAGE_H - 30, PAGE_W, 1).fill(C_LGRAY);
      doc.fontSize(7).font('Helvetica').fillColor(C_MGRAY)
         .text(tr(COMPANY) + '  ·  ' + (PHONE || '') + '  ·  ' + tr(ADDRESS), PAD_PAGE, PAGE_H - 18, { width: INNER_W * 0.75, lineBreak: false, ellipsis: true });
      doc.fontSize(7).fillColor(C_ACCENT)
         .text(String(pageNum), PAD_PAGE, PAGE_H - 18, { width: INNER_W, align: 'right' });
    };

    let globalPageNum = 1;
    let pageY = 0;
    let col = 0;
    let rowStartY = 0;
    let firstOnPage = true;
    let currentCat = '';

    // primera pagina de productos
    doc.addPage();
    pageY = drawPageHeader(categories[0] || '');
    currentCat = categories[0] || '';
    firstOnPage = true;
    col = 0;

    for (const cat of categories) {
      const catProducts = grouped[cat];

      // si cambia de categoria y ya hay contenido, nueva pagina con header de nueva cat
      if (cat !== currentCat) {
        if (!firstOnPage) {
          drawPageFooter(globalPageNum++);
          doc.addPage();
          pageY = drawPageHeader(cat);
          firstOnPage = true;
          col = 0;
        }
        currentCat = cat;
      }

      for (let pi = 0; pi < catProducts.length; pi++) {
        const product = catProducts[pi];

        // start new row?
        if (col === 0) {
          rowStartY = pageY;
          if (!firstOnPage && rowStartY + CARD_H > PAGE_H - 32) {
            drawPageFooter(globalPageNum++);
            doc.addPage();
            pageY = drawPageHeader(cat);
            rowStartY = pageY;
          }
          firstOnPage = false;
        }

        const cardX = PAD_PAGE + col * (CARD_W + GAP);
        const cardY = rowStartY;

        // ── CARD (editorial moda premium) ──────────────────────

        // sombra sutil
        doc.rect(cardX + 2, cardY + 2, CARD_W, CARD_H).fill('#00000018');
        // fondo blanco calido
        doc.rect(cardX, cardY, CARD_W, CARD_H).fill('#fafaf8');

        // ── IMAGEN vertical 3:4 ──
        const imgX = cardX;
        const imgY = cardY;
        doc.rect(imgX, imgY, CARD_W, IMG_H).fill(C_XLGRAY);

        const mainImgUrl = (product.images || []).filter(Boolean)[0];
        if (mainImgUrl) {
          const imgBuf = await fetchImageBuffer(mainImgUrl);
          if (imgBuf) {
            try {
              doc.save();
              doc.rect(imgX, imgY, CARD_W, IMG_H).clip();
              doc.image(imgBuf, imgX, imgY, { width: CARD_W, height: IMG_H, cover: [CARD_W, IMG_H], align: 'center', valign: 'center' });
              doc.restore();
            } catch { /* keep placeholder */ }
          }
        } else {
          doc.fontSize(7).font('Helvetica').fillColor('#aaaaaa')
             .text('Sin imagen', imgX, imgY + IMG_H / 2 - 4, { width: CARD_W, align: 'center' });
        }

        // badge LIQUIDACION
        if (product.tags?.includes?.('liquidacion')) {
          doc.rect(imgX + 4, imgY + 6, 38, 12).fill('#dc2626');
          doc.fontSize(5.5).font('Helvetica-Bold').fillColor('#ffffff')
             .text('LIQUI', imgX + 4, imgY + 9, { width: 38, align: 'center' });
        }

        // badge NUEVO (si fue creado en los ultimos 30 dias)
        const isNew = product.createdAt && (Date.now() - new Date(product.createdAt).getTime()) < 30 * 24 * 3600000;
        if (isNew && !product.tags?.includes?.('liquidacion')) {
          doc.rect(imgX + 4, imgY + 6, 32, 12).fill(C_ACCENT);
          doc.fontSize(5.5).font('Helvetica-Bold').fillColor('#ffffff')
             .text('NUEVO', imgX + 4, imgY + 9, { width: 32, align: 'center' });
        }

        // gradiente negro inferior sobre imagen (para legibilidad de categoria)
        doc.rect(imgX, imgY + IMG_H - 22, CARD_W, 22).fill('#000000cc');
        if (product.category?.name) {
          doc.fontSize(5.5).font('Helvetica').fillColor('#cccccc')
             .text(tr(product.category.name).toUpperCase(), imgX + 5, imgY + IMG_H - 18, { width: CARD_W - 10, lineBreak: false, characterSpacing: 1 });
        }

        // linea dorada inferior de imagen
        doc.rect(imgX, imgY + IMG_H, CARD_W, 2).fill(C_ACCENT);

        // ── INFO AREA ──
        const infoX = cardX + 6;
        const infoW = CARD_W - 12;
        let   infoY = cardY + IMG_H + 8;

        // nombre producto
        const safeName = tr(product.name).slice(0, 32);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_BLACK)
           .text(safeName, infoX, infoY, { width: infoW, lineBreak: false, ellipsis: true });
        infoY += 11;

        // talles + colores en misma linea
        const sizes  = [...new Set(product.variants.map(v => v.size).filter(Boolean))];
        const colors = [...new Set(product.variants.map(v => v.color).filter(Boolean))];
        const detailLine = [
          sizes.length  ? sizes.map(v => tr(String(v))).slice(0, 5).join(' ') : null,
          colors.length ? colors.map(v => tr(String(v))).slice(0, 3).join(' / ') : null,
        ].filter(Boolean).join('  •  ');
        if (detailLine) {
          doc.fontSize(5.5).font('Helvetica').fillColor(C_MGRAY)
             .text(detailLine, infoX, infoY, { width: infoW, lineBreak: false, ellipsis: true });
        }

        // precio — barra dorada al fondo de la tarjeta
        if (showPrice) {
          const priceH = 20;
          const priceY = cardY + CARD_H - priceH;
          doc.rect(cardX, priceY, CARD_W, priceH).fill(C_ACCENT);
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
             .text('Gs. ' + fmt(product.salePrice), infoX - 2, priceY + 5, { width: CARD_W - 4, align: 'center' });
        } else {
          // sin precio: linea dorada inferior
          doc.rect(cardX, cardY + CARD_H - 3, CARD_W, 3).fill(C_ACCENT);
        }

        // borde lateral izquierdo dorado
        doc.rect(cardX, cardY, 2.5, CARD_H).fill(C_ACCENT);

        col++;
        if (col >= COLS) {
          col = 0;
          pageY = rowStartY + CARD_H + GAP;
        }
      }
      if (col > 0) pageY = rowStartY + CARD_H + GAP;
    }

    drawPageFooter(globalPageNum);

    // ══════════════════════════════════════════════════════════
    // PAGINA DE CONTACTO FINAL
    // ══════════════════════════════════════════════════════════
    doc.addPage();
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C_COVER);
    doc.rect(0, 0, PAGE_W, 8).fill(C_ACCENT);
    doc.rect(0, PAGE_H - 8, PAGE_W, 8).fill(C_ACCENT);
    doc.rect(0, 8, 5, PAGE_H - 16).fill(C_ACCENT);

    // logo o nombre empresa centrado
    if (logoBuf) {
      try { doc.image(logoBuf, PAGE_W / 2 - 45, 80, { width: 90, height: 90, fit: [90, 90] }); } catch {}
    }
    const ctY = logoBuf ? 190 : 170;
    doc.fontSize(32).font('Helvetica-Bold').fillColor('#ffffff')
       .text(tr(COMPANY).toUpperCase(), ML, ctY, { width: INNER, align: 'center', characterSpacing: 4 });
    doc.moveTo(ML + 80, ctY + 48).lineTo(PAGE_W - MR - 80, ctY + 48).lineWidth(1).strokeColor(C_ACCENT).stroke();

    doc.fontSize(10).font('Helvetica').fillColor(C_ACCENT)
       .text('PARA HACER TU PEDIDO', ML, ctY + 62, { width: INNER, align: 'center', characterSpacing: 2 });

    // QR grande centrado
    if (qrBuf) {
      try {
        const qrSize = 130;
        doc.image(qrBuf, PAGE_W / 2 - qrSize / 2, ctY + 86, { width: qrSize, height: qrSize });
        // marco dorado al QR
        doc.rect(PAGE_W / 2 - qrSize / 2 - 4, ctY + 82, qrSize + 8, qrSize + 8)
           .lineWidth(1.5).strokeColor(C_ACCENT).stroke();
      } catch {}
    }

    const infoY2 = ctY + 240;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C_ACCENT)
       .text('WhatsApp', ML, infoY2, { width: INNER, align: 'center' });
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#ffffff')
       .text(PHONE || '', ML, infoY2 + 14, { width: INNER, align: 'center' });

    doc.moveTo(ML + 100, infoY2 + 38).lineTo(PAGE_W - MR - 100, infoY2 + 38).lineWidth(0.4).strokeColor('#374151').stroke();

    const extraLines = [tr(ADDRESS), EMAIL, 'Envios a todo Paraguay', 'Cambios en 7 dias'].filter(Boolean);
    extraLines.forEach((line, i) => {
      doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
         .text(tr(line), ML, infoY2 + 48 + i * 14, { width: INNER, align: 'center' });
    });

    doc.end();
  } catch (err) {
    logger.error('Catalog error:', err);
    res.status(500).json({ success: false, error: 'Error al generar catálogo' });
  }
};

