'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const orders = require('../src/services/orders');
const catalog = require('../src/services/catalog');
const { testDb } = require('./helpers');

const customer = { name: 'Lakshmi', phone: '98765 43210', address: '12 Temple St', city: 'Chennai', pincode: '600001' };
const stockOf = (db, id) => catalog.getProduct(db, { id }, { includeInactive: true }).stock_qty;

test('newOrderNo has date prefix and random suffix', () => {
  assert.match(orders.newOrderNo(new Date('2026-10-27T00:00:00Z')), /^AS261027-[0-9A-F]{6}$/);
});

test('createOrder totals items, merges duplicates and decrements stock', () => {
  const db = testDb();
  const before = stockOf(db, 1);
  const o = orders.createOrder(db, { customer, items: [{ productId: 1, qty: 1 }, { productId: 1, qty: 1 }, { productId: 4 }] });
  assert.equal(o.items.length, 2);
  assert.equal(o.total, 18500 * 2 + 6800);
  assert.equal(o.status, 'new');
  assert.equal(o.phone, '9876543210');
  assert.equal(stockOf(db, 1), before - 2);
});

test('createOrder rejects insufficient stock, inactive products and bad input without side effects', () => {
  const db = testDb();
  assert.throws(() => orders.createOrder(db, { customer, items: [{ productId: 5, qty: 1 }] }), (e) => e.status === 409);
  assert.throws(() => orders.createOrder(db, { customer, items: [{ productId: 1, qty: 1 }, { productId: 2, qty: 5 }] }), /Only 1 left/);
  assert.equal(stockOf(db, 1), 3, 'rolled back');
  assert.throws(() => orders.createOrder(db, { customer, items: [{ productId: 999 }] }), /no longer available/);
  assert.throws(() => orders.createOrder(db, { customer, items: [] }), /empty/);
  assert.throws(() => orders.createOrder(db, { customer, items: [{ productId: 6, qty: 11 }] }), /Maximum/);
  assert.throws(() => orders.createOrder(db, { customer, items: Array.from({ length: 21 }, (_, i) => ({ productId: i + 1 })) }), /At most/);
  assert.throws(() => orders.createOrder(db, { customer: { ...customer, pincode: '12' }, items: [{ productId: 1 }] }), /Pincode/);
  assert.throws(() => orders.createOrder(db, { customer: { ...customer, phone: '1' }, items: [{ productId: 1 }] }), /phone/);
  assert.equal(orders.listOrders(db).length, 0);
});

test('updateOrder changes status/payment, restocks on cancel and blocks reopening', () => {
  const db = testDb();
  const o = orders.createOrder(db, { customer, items: [{ productId: 3, qty: 2 }] });
  assert.equal(stockOf(db, 3), 2);
  const paid = orders.updateOrder(db, o.id, { status: 'confirmed', payment_status: 'paid', payment_ref: 'UTR123' });
  assert.equal(paid.payment_status, 'paid');
  assert.equal(paid.payment_ref, 'UTR123');
  assert.equal(orders.updateOrder(db, o.id, { tracking_info: 'DTDC 999' }).tracking_info, 'DTDC 999');
  assert.throws(() => orders.updateOrder(db, o.id, { status: 'lost' }), /status must be one of/);
  orders.updateOrder(db, o.id, { status: 'cancelled' });
  assert.equal(stockOf(db, 3), 4);
  orders.updateOrder(db, o.id, { status: 'cancelled' });
  assert.equal(stockOf(db, 3), 4, 'no double restock');
  assert.throws(() => orders.updateOrder(db, o.id, { status: 'new' }), /cannot be re-opened/);
  assert.throws(() => orders.getOrder(db, 999), /not found/);
});

test('listOrders filters by status and search; dashboardStats summarises', () => {
  const db = testDb();
  const a = orders.createOrder(db, { customer, items: [{ productId: 6 }] });
  orders.createOrder(db, { customer: { ...customer, name: 'Priya' }, items: [{ productId: 6 }] });
  orders.updateOrder(db, a.id, { status: 'confirmed', payment_status: 'paid' });
  assert.equal(orders.listOrders(db).length, 2);
  assert.equal(orders.listOrders(db, { status: 'confirmed' }).length, 1);
  assert.equal(orders.listOrders(db, { q: 'priya' }).length, 1);
  assert.equal(orders.listOrders(db, { q: a.order_no })[0].item_count, 1);
  assert.throws(() => orders.listOrders(db, { status: 'bogus' }), /status/);
  const s = orders.dashboardStats(db);
  assert.equal(s.orders.new, 1);
  assert.equal(s.orders.confirmed, 1);
  assert.equal(s.revenue_paid, 2450);
  assert.equal(s.products, 6);
  assert.ok(s.low_stock.some((p) => p.sku === 'AB-TS-001'));
});
