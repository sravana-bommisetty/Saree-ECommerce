'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../src/services/catalog');
const settings = require('../src/services/settings');
const { testDb } = require('./helpers');

const newSaree = (overrides = {}) => ({
  sku: 'ab-new-1', name: 'Test Saree', category_id: 1, fabric: 'Pure Silk', color: 'Red', price: '5000', mrp: '6000',
  description: 'Lovely', stock_qty: '2', is_featured: '1', ...overrides,
});

test('seed data loads categories and products', () => {
  const db = testDb();
  assert.equal(catalog.listCategories(db).length, 5);
  assert.equal(catalog.listProducts(db).total, 6);
});

test('listCategories can hide empty categories', () => {
  const db = testDb();
  catalog.createCategory(db, { name: 'Empty One' });
  assert.equal(catalog.listCategories(db).length, 6);
  assert.equal(catalog.listCategories(db, { includeEmpty: false }).length, 5);
});

test('listProducts supports search, filters, sort and pagination', () => {
  const db = testDb();
  assert.equal(catalog.listProducts(db, { q: 'banarasi' }).total, 1);
  assert.equal(catalog.listProducts(db, { category: 'kanjivaram-silk' }).total, 2);
  assert.equal(catalog.listProducts(db, { fabric: 'Pure Silk', color: 'Green' }).total, 1);
  assert.equal(catalog.listProducts(db, { minPrice: 10000, maxPrice: 20000 }).total, 2);
  assert.equal(catalog.listProducts(db, { inStock: '1' }).total, 5);
  assert.equal(catalog.listProducts(db, { featured: '1' }).total, 3);
  const asc = catalog.listProducts(db, { sort: 'price_asc' }).items.map((p) => p.price);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  const page2 = catalog.listProducts(db, { limit: 4, page: 2 });
  assert.equal(page2.items.length, 2);
  assert.equal(page2.pages, 2);
  assert.ok(page2.items[0].image_url);
  assert.equal(typeof page2.items[0].in_stock, 'boolean');
});

test('filterOptions returns distinct fabrics, colours and price range', () => {
  const f = catalog.filterOptions(testDb());
  assert.ok(f.fabrics.includes('Pure Silk'));
  assert.ok(f.colors.includes('Maroon'));
  assert.deepEqual(f.price, { min: 2450, max: 24900 });
});

test('createProduct, updateProduct, updateStock and deleteProduct', () => {
  const db = testDb();
  const p = catalog.createProduct(db, newSaree(), ['/uploads/a.jpg', '/uploads/b.jpg']);
  assert.equal(p.sku, 'AB-NEW-1');
  assert.equal(p.slug, 'test-saree');
  assert.equal(p.images.length, 2);
  assert.equal(p.is_featured, true);

  const u = catalog.updateProduct(db, p.id, newSaree({ name: 'Renamed', price: '4500', is_active: '0' }), ['/uploads/c.jpg']);
  assert.equal(u.name, 'Renamed');
  assert.equal(u.price, 4500);
  assert.equal(u.is_active, false);
  assert.equal(u.images.length, 3);
  assert.throws(() => catalog.getProduct(db, { slug: 'renamed' }), /not found/);

  assert.equal(catalog.updateStock(db, p.id, 9).stock_qty, 9);
  assert.throws(() => catalog.updateStock(db, 999, 1), /not found/);

  assert.equal(catalog.deleteImage(db, u.images[0].id), '/uploads/a.jpg');
  assert.throws(() => catalog.deleteImage(db, 9999), /not found/);
  assert.deepEqual(catalog.deleteProduct(db, p.id).sort(), ['/uploads/b.jpg', '/uploads/c.jpg']);
  assert.throws(() => catalog.deleteProduct(db, p.id), /not found/);
});

test('stock changes are logged with user and note; listStock filters', () => {
  const db = testDb();
  const p = catalog.createProduct(db, newSaree());
  catalog.updateStock(db, p.id, 5, { note: 'New delivery', changedBy: 'Priya' });
  catalog.updateStock(db, p.id, 5);
  catalog.updateProduct(db, p.id, newSaree({ stock_qty: '1' }), [], { changedBy: 'Owner' });
  catalog.updateProduct(db, p.id, newSaree({ stock_qty: '1', name: 'Same stock' }), [], { changedBy: 'Owner' });
  const log = catalog.stockHistory(db, { productId: p.id });
  assert.deepEqual(
    log.map((l) => [l.old_qty, l.new_qty, l.note, l.changed_by]),
    [[5, 1, 'Edited in product form', 'Owner'], [2, 5, 'New delivery', 'Priya']]
  );
  assert.equal(catalog.stockHistory(db, { limit: 1 }).length, 1);
  assert.throws(() => catalog.updateStock(db, p.id, 3, { note: 'x'.repeat(201) }), /at most 200/);

  const low = catalog.listStock(db, { lowStock: 2 });
  assert.ok(low.length > 0 && low.every((r) => r.stock_qty <= 2));
  assert.deepEqual(low.map((r) => r.stock_qty), [...low.map((r) => r.stock_qty)].sort((a, b) => a - b));
  const found = catalog.listStock(db, { q: 'AB-NEW' });
  assert.equal(found.length, 1);
  assert.equal(found[0].price, undefined);
  assert.equal(typeof found[0].is_active, 'boolean');
  assert.equal(catalog.listStock(db).length, 7);
});

test('product validation rejects bad input', () => {
  const db = testDb();
  assert.throws(() => catalog.createProduct(db, newSaree({ name: '' })), /Name is required/);
  assert.throws(() => catalog.createProduct(db, newSaree({ price: '-5' })), /Price/);
  assert.throws(() => catalog.createProduct(db, newSaree({ mrp: '100' })), /MRP/);
  assert.throws(() => catalog.createProduct(db, newSaree({ sku: 'AB-KJ-001' })), /UNIQUE/);
  assert.throws(() => catalog.updateProduct(db, 999, newSaree()), /not found/);
});

test('category CRUD', () => {
  const db = testDb();
  const c = catalog.createCategory(db, { name: 'Organza Silk', description: 'Sheer', sort_order: '9' }, '/uploads/c.jpg');
  assert.equal(c.slug, 'organza-silk');
  const u = catalog.updateCategory(db, c.id, { name: 'Organza', sort_order: '1' });
  assert.equal(u.image_url, '/uploads/c.jpg');
  assert.equal(u.slug, 'organza');
  catalog.deleteCategory(db, c.id);
  assert.throws(() => catalog.deleteCategory(db, c.id), /not found/);
  assert.throws(() => catalog.updateCategory(db, c.id, { name: 'x' }), /not found/);
});

test('settings: defaults are seeded once and only editable keys update', () => {
  const db = testDb();
  settings.ensureSettings(db, { store_name: 'Abhinayam Silks', whatsapp_number: '911' });
  settings.updateSettings(db, { whatsapp_number: '922', not_allowed: 'x' });
  settings.ensureSettings(db, { store_name: 'Abhinayam Silks', whatsapp_number: '911' });
  const s = settings.getSettings(db);
  assert.equal(s.whatsapp_number, '922');
  assert.equal(s.not_allowed, undefined);
  assert.ok(s.return_policy.length > 10);
});
