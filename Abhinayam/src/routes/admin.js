'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const catalog = require('../services/catalog');
const orders = require('../services/orders');
const settings = require('../services/settings');
const users = require('../services/users');
const auth = require('../auth');
const { createUploader, fileUrls, removeUpload } = require('../uploads');
const { num, HttpError } = require('../lib/validate');

const idParam = (req) => num(req.params.id, 'id', { required: true, integer: true, min: 1 });

// Blocks cross-site form posts: browsers cannot add custom headers without CORS approval.
function requireFetchHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.get('X-Requested-With') === 'fetch') return next();
  res.status(403).json({ error: 'Missing X-Requested-With header' });
}

function adminRoutes(db, config) {
  const r = express.Router();
  const upload = createUploader(config.uploadDir);

  // Cleans up uploaded files if the DB operation fails.
  const withUploads = (handler) => (req, res) => {
    const urls = fileUrls(req);
    try {
      res.json(handler(req, urls));
    } catch (err) {
      urls.forEach((u) => removeUpload(config.uploadDir, u));
      throw err;
    }
  };

  r.use(requireFetchHeader);

  r.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }), (req, res, next) => {
    // Each portal only accepts its own role: /admin -> admin, /staff -> staff.
    const role = req.body?.portal === 'staff' ? 'staff' : 'admin';
    const admin = auth.authenticate(db, req.body?.username, req.body?.password, { role });
    if (!admin) return res.status(401).json({ error: 'Invalid username or password' });
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.admin = admin;
      res.json(admin);
    });
  });

  r.post('/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

  r.use(auth.requireAuth(db));
  r.get('/me', (req, res) => res.json(req.user));

  // Stock management: available to staff and admins.
  const byUser = (req) => ({ changedBy: req.user.display_name || req.user.username });
  r.get('/stock', (req, res) => res.json(catalog.listStock(db, req.query)));
  r.get('/stock/history', (req, res) => res.json(catalog.stockHistory(db, req.query)));
  r.patch('/products/:id/stock', (req, res) =>
    res.json(catalog.updateStock(db, idParam(req), req.body?.stock_qty, { note: req.body?.note, ...byUser(req) }))
  );

  // Everything below is admin-only.
  r.use(auth.requireRole('admin'));

  // Staff passwords are reset by an admin via Staff access.
  r.post('/password', (req, res) => {
    let ok;
    try {
      ok = auth.changePassword(db, req.user.id, req.body?.currentPassword, req.body?.newPassword);
    } catch (e) {
      throw new HttpError(400, e.message);
    }
    if (!ok) throw new HttpError(400, 'Current password is incorrect');
    res.json({ ok: true });
  });

  r.get('/users', (_req, res) => res.json(users.listUsers(db)));
  r.post('/users', (req, res) => res.status(201).json(users.createUser(db, req.body)));
  r.put('/users/:id', (req, res) => res.json(users.updateUser(db, idParam(req), req.body, req.user.id)));
  r.delete('/users/:id', (req, res) => {
    users.deleteUser(db, idParam(req), req.user.id);
    res.json({ ok: true });
  });

  r.get('/stats', (_req, res) => res.json(orders.dashboardStats(db)));

  r.get('/settings', (_req, res) => res.json(settings.getSettings(db)));
  r.put('/settings', (req, res) => res.json(settings.updateSettings(db, req.body || {})));

  r.get('/categories', (_req, res) => res.json(catalog.listCategories(db)));
  r.post('/categories', upload.single('image'), withUploads((req, urls) => catalog.createCategory(db, req.body, urls[0])));
  r.put('/categories/:id', upload.single('image'), withUploads((req, urls) => catalog.updateCategory(db, idParam(req), req.body, urls[0])));
  r.delete('/categories/:id', (req, res) => {
    catalog.deleteCategory(db, idParam(req));
    res.json({ ok: true });
  });

  r.get('/products', (req, res) => res.json(catalog.listProducts(db, { limit: 100, sort: 'newest', ...req.query }, { includeInactive: true })));
  r.get('/products/:id', (req, res) => res.json(catalog.getProduct(db, { id: idParam(req) }, { includeInactive: true })));
  r.post('/products', upload.array('images', 8), withUploads((req, urls) => catalog.createProduct(db, req.body, urls)));
  r.put('/products/:id', upload.array('images', 8), withUploads((req, urls) => catalog.updateProduct(db, idParam(req), req.body, urls, byUser(req))));
  r.delete('/products/:id', (req, res) => {
    catalog.deleteProduct(db, idParam(req)).forEach((u) => removeUpload(config.uploadDir, u));
    res.json({ ok: true });
  });
  r.delete('/images/:id', (req, res) => {
    removeUpload(config.uploadDir, catalog.deleteImage(db, idParam(req)));
    res.json({ ok: true });
  });

  r.get('/orders', (req, res) => res.json(orders.listOrders(db, req.query)));
  r.get('/orders/:id', (req, res) => res.json(orders.getOrder(db, idParam(req))));
  r.patch('/orders/:id', (req, res) => res.json(orders.updateOrder(db, idParam(req), req.body || {})));

  return r;
}

module.exports = { adminRoutes };
