'use strict';
const express = require('express');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const catalog = require('../services/catalog');
const orders = require('../services/orders');
const { getSettings } = require('../services/settings');
const { whatsappUrl, upiUrl, orderMessage } = require('../lib/whatsapp');

function publicRoutes(db) {
  const r = express.Router();

  r.get('/settings', (_req, res) => res.json(getSettings(db)));
  r.get('/categories', (_req, res) => res.json(catalog.listCategories(db)));
  r.get('/products/filters', (_req, res) => res.json(catalog.filterOptions(db)));
  r.get('/products', (req, res) => res.json(catalog.listProducts(db, req.query)));
  r.get('/products/:slug', (req, res) => res.json(catalog.getProduct(db, { slug: req.params.slug })));

  r.post(
    '/orders',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }),
    async (req, res) => {
      const order = orders.createOrder(db, req.body || {});
      const s = getSettings(db);
      const upi = upiUrl({ upiId: s.upi_id, payeeName: s.upi_payee_name, amount: order.total, note: `Order ${order.order_no}` });
      res.status(201).json({
        order: { order_no: order.order_no, total: order.total, items: order.items },
        whatsappUrl: whatsappUrl(s.whatsapp_number, orderMessage(order, order.items, s.upi_id)),
        upiUrl: upi,
        upiQr: await QRCode.toDataURL(upi, { margin: 1, width: 240 }),
      });
    }
  );

  return r;
}

module.exports = { publicRoutes };
