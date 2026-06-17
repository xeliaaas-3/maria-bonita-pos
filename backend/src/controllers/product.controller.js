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

    const W_PAGE = 595.28, H_PAGE = 841.89;
    const COLS = 3, ROWS = 8;
    const PAD = 10, GAP = 4;
    const LW = (W_PAGE - PAD * 2 - GAP * (COLS - 1)) / COLS;
    const LH = (H_PAGE - PAD * 2 - GAP * (ROWS - 1)) / ROWS;

    let col = 0, row = 0;

    const drawLabel = async (product, variant, idx) => {
      if (idx > 0 && col === 0 && row === 0) doc.addPage();
      const x = PAD + col * (LW + GAP);
      const y = PAD + row * (LH + GAP);

      // border
      doc.rect(x, y, LW, LH).lineWidth(0.5).strokeColor('#d1d5db').stroke();
      // company mini
      doc.fontSize(6).font('Helvetica').fillColor('#9ca3af').text(company, x + 3, y + 3, { width: LW - 6, align: 'center' });
      // name
      const name = product.name.slice(0, 28);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#111827').text(name, x + 3, y + 12, { width: LW - 6, align: 'center' });
      // variant info
      const vInfo = [variant?.size, variant?.color].filter(Boolean).join(' / ');
      if (vInfo) doc.fontSize(7).font('Helvetica').fillColor('#374151').text(vInfo, x + 3, y + 22, { width: LW - 6, align: 'center' });
      // SKU
      const sku = variant?.sku || product.sku;
      doc.fontSize(6).fillColor('#6b7280').text(sku, x + 3, vInfo ? y + 31 : y + 22, { width: LW - 6, align: 'center' });
      // price
      const price = Number(variant?.price || product.salePrice);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#7c3aed')
         .text(`Gs. ${price.toLocaleString('es-PY')}`, x + 3, y + LH - 14, { width: LW - 6, align: 'center' });

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

    const COLS    = 3;
    const GAP     = 8;
    const CARD_W  = (INNER - GAP * (COLS - 1)) / COLS;  // ~176
    const IMG_H   = Math.round(CARD_W * 0.75);           // 4:3 ratio
    const INFO_H  = showPrice ? 58 : 44;
    const CARD_H  = IMG_H + INFO_H;

    // colours — editorial fashion palette
    const C_BG     = '#ffffff';
    const C_BLACK  = '#0d0d0d';
    const C_DGRAY  = '#1f1f1f';
    const C_MGRAY  = '#6b7280';
    const C_LGRAY  = '#e5e7eb';
    const C_XLGRAY = '#f5f5f5';
    const C_ACCENT = '#c9a84c'; // gold fashion accent
    const C_COVER  = '#0f0f1a';

    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true, bufferPages: true });
    const buffers = [];
    doc.on('data', c => buffers.push(c));
    doc.on('end', () => {
      res.setHeader('Content-Type', 'application/pdf');
      const fname = (layout === 'poster' ? 'catalogo-fichas-' : 'catalogo-') + (showPrice ? 'con-precios.pdf' : 'sin-precios.pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
      res.send(Buffer.concat(buffers));
    });

    // ══════════════════════════════════════════════════════════
    // PORTADA
    // ══════════════════════════════════════════════════════════
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C_COVER);

    // accent bar top
    doc.rect(0, 0, PAGE_W, 6).fill(C_ACCENT);

    // large company name
    doc.fontSize(42).font('Helvetica-Bold').fillColor('#ffffff')
       .text(COMPANY.toUpperCase(), ML, 200, { width: INNER, align: 'center', characterSpacing: 4 });

    // divider line
    const divY = 270;
    doc.moveTo(ML + 40, divY).lineTo(PAGE_W - MR - 40, divY)
       .lineWidth(1).strokeColor(C_ACCENT).stroke();

    // subtitle
    const subtitle = showPrice ? 'CATALOGO DE PRODUCTOS Y PRECIOS' : 'CATALOGO DE COLECCION';
    doc.fontSize(11).font('Helvetica').fillColor('#9ca3af')
       .text(subtitle, ML, divY + 14, { width: INNER, align: 'center', characterSpacing: 2 });

    // date
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' });
    doc.fontSize(9).fillColor('#6b7280')
       .text(dateStr.toUpperCase(), ML, divY + 36, { width: INNER, align: 'center', characterSpacing: 1 });

    // contact info block
    const contactLines = [ADDRESS, PHONE && `Tel: ${PHONE}`, EMAIL].filter(Boolean);
    const contactY = PAGE_H - 120;
    doc.moveTo(ML + 40, contactY - 10).lineTo(PAGE_W - MR - 40, contactY - 10)
       .lineWidth(0.5).strokeColor('#374151').stroke();
    contactLines.forEach((line, i) => {
      doc.fontSize(8.5).font('Helvetica').fillColor('#9ca3af')
         .text(line, ML, contactY + i * 14, { width: INNER, align: 'center' });
    });

    // products count
    doc.fontSize(8).fillColor('#4b5563')
       .text(products.length + ' productos disponibles', ML, PAGE_H - 40, { width: INNER, align: 'center' });

    // accent bar bottom
    doc.rect(0, PAGE_H - 6, PAGE_W, 6).fill(C_ACCENT);

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
        doc.rect(GAP, baseY, innerW, innerH).fill('#eef0fa');
        doc.rect(GAP, baseY, innerW, 5).fill(C_ACCENT);

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
        doc.rect(0, 0, PAGE_W, PAGE_H).fill(C_BG);
        await drawCard(products[pi], GAP);
        if (products[pi + 1]) {
          await drawCard(products[pi + 1], GAP + HALF_H + 2 * GAP);
        }
      }

      doc.end();
      return;
    }

    // ══════════════════════════════════════════════════════════
    // INDEX PAGE (categories)
    // ══════════════════════════════════════════════════════════
    doc.addPage();

    // page header
    doc.rect(0, 0, PAGE_W, 52).fill(C_BLACK);
    doc.rect(0, 0, 4, 52).fill(C_ACCENT);
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff')
       .text(COMPANY, ML + 8, 14, { width: INNER });
    doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
       .text(subtitle, ML + 8, 34, { width: INNER });

    let pageY = 72;

    // grouped by category
    const grouped = {};
    for (const p of products) {
      const cat = p.category?.name || 'Sin categoría';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }

    const categories = Object.keys(grouped).sort();

    // ── Category index ──
    doc.fontSize(11).font('Helvetica-Bold').fillColor(C_BLACK)
       .text('INDICE DE CATEGORIAS', ML, pageY);
    doc.moveTo(ML, pageY + 16).lineTo(PAGE_W - MR, pageY + 16)
       .lineWidth(0.5).strokeColor(C_LGRAY).stroke();
    pageY += 24;

    categories.forEach((cat, i) => {
      const count = grouped[cat].length;
      const rowH = 22;
      if (i % 2 === 0) {
        doc.rect(ML, pageY - 2, INNER, rowH).fill(C_XLGRAY);
      }
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C_BLACK)
         .text(tr(cat), ML + 6, pageY + 4, { width: INNER * 0.7 });
      doc.fontSize(9).font('Helvetica').fillColor(C_MGRAY)
         .text(count + ' producto' + (count !== 1 ? 's' : ''), ML + 6, pageY + 4, { width: INNER - 12, align: 'right' });
      pageY += rowH;
    });

    // ══════════════════════════════════════════════════════════
    // PRODUCT PAGES — one section per category
    // ══════════════════════════════════════════════════════════

    for (const cat of categories) {
      const catProducts = grouped[cat];

      // category section header page
      doc.addPage();
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(C_XLGRAY);
      doc.rect(0, 0, PAGE_W, 6).fill(C_ACCENT);
      doc.rect(0, PAGE_H - 6, PAGE_W, 6).fill(C_ACCENT);

      // Big category label centred vertically
      doc.fontSize(32).font('Helvetica-Bold').fillColor(C_BLACK)
         .text(tr(cat).toUpperCase(), ML, PAGE_H / 2 - 50, { width: INNER, align: 'center' });
      doc.moveTo(ML + 60, PAGE_H / 2 - 6).lineTo(PAGE_W - MR - 60, PAGE_H / 2 - 6)
         .lineWidth(1.5).strokeColor(C_ACCENT).stroke();
      doc.fontSize(10).font('Helvetica').fillColor(C_MGRAY)
         .text(catProducts.length + ' producto' + (catProducts.length !== 1 ? 's' : ''), ML, PAGE_H / 2 + 10, { width: INNER, align: 'center' });

      // ── product grid pages ──
      let col = 0;
      let rowStartY = 0;
      let firstOnPage = true;

      const drawPageHeader = () => {
        doc.rect(0, 0, PAGE_W, 44).fill(C_BLACK);
        doc.rect(0, 0, 4, 44).fill(C_ACCENT);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
           .text(COMPANY, ML + 8, 10, { width: INNER * 0.5 });
        doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
           .text(tr(cat), ML + 8, 28, { width: INNER * 0.5 });
        doc.fontSize(8).fillColor('#6b7280')
           .text(subtitle, ML, 28, { width: INNER - 8, align: 'right' });
        return 56; // return starting Y
      };

      const drawPageFooter = (pageNum) => {
        doc.moveTo(ML, PAGE_H - 26).lineTo(PAGE_W - MR, PAGE_H - 26)
           .lineWidth(0.5).strokeColor(C_LGRAY).stroke();
        doc.fontSize(7).font('Helvetica').fillColor(C_MGRAY)
           .text(COMPANY + '  -  ' + subtitle + '  -  ' + dateStr, ML, PAGE_H - 18, { width: INNER - 40 });
        doc.fontSize(7).fillColor(C_MGRAY)
           .text(`${pageNum}`, ML, PAGE_H - 18, { width: INNER, align: 'right' });
      };

      let pageNum = 1;
      doc.addPage();
      pageY = drawPageHeader();
      firstOnPage = true;
      col = 0;

      for (let pi = 0; pi < catProducts.length; pi++) {
        const product = catProducts[pi];

        // start new row?
        if (col === 0) {
          rowStartY = pageY;
          // check if row fits
          if (!firstOnPage && rowStartY + CARD_H > PAGE_H - 35) {
            drawPageFooter(pageNum++);
            doc.addPage();
            pageY = drawPageHeader();
            rowStartY = pageY;
          }
          firstOnPage = false;
        }

        const cardX = ML + col * (CARD_W + GAP);
        const cardY = rowStartY;

        // ── CARD (diseño editorial moda) ────────────────────────

        // fondo blanco limpio
        doc.rect(cardX, cardY, CARD_W, CARD_H).fill(C_BG);

        // ── IMAGEN 4:3 (solo imagen principal) ──
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
          doc.fontSize(7).font('Helvetica').fillColor('#9ca3af')
             .text('Sin imagen', imgX, imgY + IMG_H / 2 - 4, { width: CARD_W, align: 'center' });
        }

        // franja negra semitransparente abajo de la imagen (categoria)
        if (product.category?.name) {
          doc.rect(imgX, imgY + IMG_H - 14, CARD_W, 14).fill('#00000088');
          doc.fontSize(6).font('Helvetica').fillColor('#ffffff')
             .text(tr(product.category.name).toUpperCase(), imgX + 4, imgY + IMG_H - 10, { width: CARD_W - 8, align: 'left', characterSpacing: 0.8 });
        }

        // linea dorada inferior de imagen
        doc.rect(imgX, imgY + IMG_H - 2, CARD_W, 2).fill(C_ACCENT);

        // ── INFO AREA ──
        const infoX = cardX + 6;
        const infoW = CARD_W - 12;
        let   infoY = cardY + IMG_H + 7;

        // nombre producto
        const safeName = tr(product.name).slice(0, 34);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C_BLACK)
           .text(safeName, infoX, infoY, { width: infoW, lineBreak: false, ellipsis: true });
        infoY += 11;

        // talles
        const sizes  = [...new Set(product.variants.map(v => v.size).filter(Boolean))];
        if (sizes.length) {
          doc.fontSize(6).font('Helvetica').fillColor(C_MGRAY)
             .text(sizes.map(v => tr(String(v))).slice(0, 6).join('  '), infoX, infoY, { width: infoW, lineBreak: false, ellipsis: true });
          infoY += 9;
        }

        // precio — dentro de la tarjeta, fondo dorado
        if (showPrice) {
          const priceY = cardY + CARD_H - 20;
          doc.rect(cardX, priceY, CARD_W, 20).fill(C_ACCENT);
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
             .text('Gs. ' + fmt(product.salePrice), infoX - 2, priceY + 5, { width: CARD_W - 4, align: 'center' });
        }

        // borde fino lateral izquierdo dorado
        doc.rect(cardX, cardY, 2, CARD_H).fill(C_ACCENT);

        col++;
        if (col >= COLS) {
          col = 0;
          pageY = rowStartY + CARD_H + GAP;
        }
      }

      // fill remaining cols in last row if needed
      if (col > 0) {
        pageY = rowStartY + CARD_H + GAP;
      }

      drawPageFooter(pageNum);
    }

    doc.end();
  } catch (err) {
    logger.error('Catalog error:', err);
    res.status(500).json({ success: false, error: 'Error al generar catálogo' });
  }
};

