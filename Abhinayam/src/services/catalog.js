'use strict';
const { str, num, bool, slugify, badRequest, notFound } = require('../lib/validate');
const { transaction } = require('../db');

const FIRST_IMAGE =
  '(SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1) AS image_url';

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  name: 'p.name ASC',
  featured: 'p.is_featured DESC, p.id DESC',
};

/* ---------- Categories ---------- */

function listCategories(db, { includeEmpty = true } = {}) {
  const rows = db
    .prepare(
      `SELECT c.*, COUNT(p.id) AS product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        GROUP BY c.id
        ORDER BY c.sort_order, c.name`
    )
    .all();
  return includeEmpty ? rows : rows.filter((r) => r.product_count > 0);
}

function parseCategory(body) {
  const name = str(body.name, 'Name', { required: true, max: 80 });
  return {
    name,
    slug: slugify(body.slug || name),
    description: str(body.description, 'Description', { max: 1000 }),
    sort_order: num(body.sort_order, 'Sort order', { integer: true }) ?? 0,
  };
}

function createCategory(db, body, imageUrl = null) {
  const c = parseCategory(body);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO categories (name, slug, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(c.name, c.slug, c.description, imageUrl, c.sort_order);
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(lastInsertRowid);
}

function updateCategory(db, id, body, imageUrl = null) {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) throw notFound('Category not found');
  const c = parseCategory(body);
  db.prepare('UPDATE categories SET name = ?, slug = ?, description = ?, image_url = ?, sort_order = ? WHERE id = ?').run(
    c.name, c.slug, c.description, imageUrl ?? existing.image_url, c.sort_order, id
  );
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function deleteCategory(db, id) {
  const { changes } = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (!changes) throw notFound('Category not found');
}

/* ---------- Products ---------- */

function decorate(p) {
  return { ...p, in_stock: p.stock_qty > 0, is_featured: !!p.is_featured, is_active: !!p.is_active };
}

function listProducts(db, query = {}, { includeInactive = false } = {}) {
  const where = [];
  const params = [];
  if (!includeInactive) where.push('p.is_active = 1');
  if (query.q) {
    const like = `%${String(query.q).trim()}%`;
    where.push('(p.name LIKE ? OR p.description LIKE ? OR p.fabric LIKE ? OR p.color LIKE ? OR p.sku LIKE ? OR c.name LIKE ?)');
    params.push(like, like, like, like, like, like);
  }
  if (query.category) { where.push('c.slug = ?'); params.push(String(query.category)); }
  if (query.fabric) { where.push('p.fabric = ?'); params.push(String(query.fabric)); }
  if (query.color) { where.push('p.color = ?'); params.push(String(query.color)); }
  const min = num(query.minPrice, 'minPrice');
  const max = num(query.maxPrice, 'maxPrice');
  if (min !== null) { where.push('p.price >= ?'); params.push(min); }
  if (max !== null) { where.push('p.price <= ?'); params.push(max); }
  if (bool(query.inStock)) where.push('p.stock_qty > 0');
  if (bool(query.featured)) where.push('p.is_featured = 1');

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const from = `FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`;
  const limit = Math.min(num(query.limit, 'limit', { integer: true, min: 1 }) ?? 24, 100);
  const page = num(query.page, 'page', { integer: true, min: 1 }) ?? 1;
  const order = SORTS[query.sort] || SORTS.featured;

  const total = db.prepare(`SELECT COUNT(*) AS n ${from}`).get(...params).n;
  const items = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug, ${FIRST_IMAGE}
       ${from} ORDER BY ${order} LIMIT ? OFFSET ?`
    )
    .all(...params, limit, (page - 1) * limit)
    .map(decorate);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

function filterOptions(db) {
  const distinct = (col) =>
    db.prepare(`SELECT DISTINCT ${col} AS v FROM products WHERE is_active = 1 AND ${col} <> '' ORDER BY ${col}`).all().map((r) => r.v);
  const range = db.prepare('SELECT MIN(price) AS min, MAX(price) AS max FROM products WHERE is_active = 1').get();
  return { fabrics: distinct('fabric'), colors: distinct('color'), price: { min: range.min ?? 0, max: range.max ?? 0 } };
}

function getProduct(db, { id, slug }, { includeInactive = false } = {}) {
  const p = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${id !== undefined ? 'p.id = ?' : 'p.slug = ?'}`
    )
    .get(id !== undefined ? id : String(slug));
  if (!p || (!includeInactive && !p.is_active)) throw notFound('Saree not found');
  const images = db.prepare('SELECT id, url, alt FROM product_images WHERE product_id = ? ORDER BY sort_order, id').all(p.id);
  return decorate({ ...p, images, image_url: images[0]?.url || null });
}

function parseProduct(body) {
  const name = str(body.name, 'Name', { required: true, max: 150 });
  const price = num(body.price, 'Price', { required: true });
  const mrp = num(body.mrp, 'MRP');
  if (mrp !== null && mrp < price) throw badRequest('MRP must be greater than or equal to price');
  return {
    sku: str(body.sku, 'SKU', { required: true, max: 40 }).toUpperCase(),
    name,
    slug: slugify(body.slug || name),
    category_id: num(body.category_id, 'Category', { integer: true, min: 1 }),
    fabric: str(body.fabric, 'Fabric', { max: 60 }),
    color: str(body.color, 'Color', { max: 40 }),
    price,
    mrp,
    description: str(body.description, 'Description', { max: 5000 }),
    stock_qty: num(body.stock_qty, 'Stock', { integer: true }) ?? 0,
    is_featured: bool(body.is_featured),
    is_active: body.is_active === undefined ? 1 : bool(body.is_active),
  };
}

function addImages(db, productId, urls, alt) {
  const start = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM product_images WHERE product_id = ?').get(productId).n;
  const insert = db.prepare('INSERT INTO product_images (product_id, url, alt, sort_order) VALUES (?, ?, ?, ?)');
  urls.forEach((url, i) => insert.run(productId, url, alt, start + i));
}

const PRODUCT_COLUMNS = ['sku', 'name', 'slug', 'category_id', 'fabric', 'color', 'price', 'mrp', 'description', 'stock_qty', 'is_featured', 'is_active'];

function createProduct(db, body, imageUrls = []) {
  const p = parseProduct(body);
  const { lastInsertRowid } = db
    .prepare(`INSERT INTO products (${PRODUCT_COLUMNS.join(', ')}) VALUES (${PRODUCT_COLUMNS.map(() => '?').join(', ')})`)
    .run(...PRODUCT_COLUMNS.map((k) => p[k]));
  addImages(db, lastInsertRowid, imageUrls, p.name);
  return getProduct(db, { id: Number(lastInsertRowid) }, { includeInactive: true });
}

function logStockChange(db, product, newQty, { note = '', changedBy = 'system' } = {}) {
  if (product.stock_qty === newQty && !note) return;
  db.prepare(
    'INSERT INTO stock_log (product_id, sku, product_name, old_qty, new_qty, note, changed_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(product.id, product.sku, product.name, product.stock_qty, newQty, note, changedBy);
}

function updateProduct(db, id, body, imageUrls = [], { changedBy } = {}) {
  const before = getProduct(db, { id }, { includeInactive: true });
  const p = parseProduct(body);
  transaction(db, () => {
    db.prepare(`UPDATE products SET ${PRODUCT_COLUMNS.map((k) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
      ...PRODUCT_COLUMNS.map((k) => p[k]), id
    );
    if (before.stock_qty !== p.stock_qty) logStockChange(db, before, p.stock_qty, { changedBy, note: 'Edited in product form' });
    addImages(db, id, imageUrls, p.name);
  });
  return getProduct(db, { id }, { includeInactive: true });
}

function updateStock(db, id, stockQty, { note = '', changedBy } = {}) {
  const qty = num(stockQty, 'Stock', { required: true, integer: true });
  const cleanNote = str(note, 'Note', { max: 200 });
  transaction(db, () => {
    const before = db.prepare('SELECT id, sku, name, stock_qty FROM products WHERE id = ?').get(id);
    if (!before) throw notFound('Saree not found');
    db.prepare('UPDATE products SET stock_qty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(qty, id);
    logStockChange(db, before, qty, { note: cleanNote, changedBy });
  });
  return getProduct(db, { id }, { includeInactive: true });
}

// Lightweight stock view for staff: no pricing or descriptions.
function listStock(db, query = {}) {
  const where = [];
  const params = [];
  if (query.q) {
    const like = `%${String(query.q).trim()}%`;
    where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.fabric LIKE ? OR p.color LIKE ? OR c.name LIKE ?)');
    params.push(like, like, like, like, like);
  }
  const low = num(query.lowStock, 'lowStock', { integer: true });
  if (low !== null) { where.push('p.stock_qty <= ?'); params.push(low); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db
    .prepare(
      `SELECT p.id, p.sku, p.name, p.fabric, p.color, p.stock_qty, p.is_active, p.updated_at,
              c.name AS category_name, ${FIRST_IMAGE}
       FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}
       ORDER BY p.stock_qty ASC, p.name ASC`
    )
    .all(...params)
    .map((p) => ({ ...p, is_active: Boolean(p.is_active) }));
}

function stockHistory(db, { productId, limit } = {}) {
  const max = Math.min(num(limit, 'limit', { integer: true, min: 1 }) ?? 50, 200);
  const pid = num(productId, 'productId', { integer: true, min: 1 });
  return db
    .prepare(
      `SELECT * FROM stock_log ${pid ? 'WHERE product_id = ?' : ''} ORDER BY created_at DESC, id DESC LIMIT ?`
    )
    .all(...(pid ? [pid] : []), max);
}

function deleteProduct(db, id) {
  const urls = db.prepare('SELECT url FROM product_images WHERE product_id = ?').all(id).map((r) => r.url);
  const { changes } = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  if (!changes) throw notFound('Saree not found');
  return urls;
}

function deleteImage(db, imageId) {
  const img = db.prepare('SELECT url FROM product_images WHERE id = ?').get(imageId);
  if (!img) throw notFound('Image not found');
  db.prepare('DELETE FROM product_images WHERE id = ?').run(imageId);
  return img.url;
}

module.exports = {
  listCategories, createCategory, updateCategory, deleteCategory,
  listProducts, filterOptions, getProduct, createProduct, updateProduct, updateStock, listStock, stockHistory,
  deleteProduct, deleteImage,
};
