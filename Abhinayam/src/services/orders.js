'use strict';
const crypto = require('node:crypto');
const { transaction } = require('../db');
const { str, num, phone, oneOf, badRequest, notFound, HttpError } = require('../lib/validate');

const ORDER_STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'refunded'];
const MAX_ITEMS = 20;
const MAX_QTY = 10;

function newOrderNo(now = new Date()) {
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, '');
  return `AS${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function parseCustomer(c = {}) {
  const pincode = str(c.pincode, 'Pincode', { required: true, max: 10 });
  if (!/^\d{6}$/.test(pincode)) throw badRequest('Pincode must be 6 digits');
  return {
    customer_name: str(c.name, 'Name', { required: true, max: 100 }),
    phone: phone(c.phone),
    address: str(c.address, 'Address', { required: true, max: 500 }),
    city: str(c.city, 'City', { required: true, max: 80 }),
    pincode,
    notes: str(c.notes, 'Notes', { max: 500 }),
  };
}

function parseItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw badRequest('Your bag is empty');
  if (items.length > MAX_ITEMS) throw badRequest(`At most ${MAX_ITEMS} different sarees per order`);
  const merged = new Map();
  for (const it of items) {
    const id = num(it?.productId, 'productId', { required: true, integer: true, min: 1 });
    const qty = num(it?.qty ?? 1, 'qty', { integer: true, min: 1 });
    merged.set(id, (merged.get(id) || 0) + qty);
  }
  for (const qty of merged.values()) if (qty > MAX_QTY) throw badRequest(`Maximum ${MAX_QTY} pieces per saree`);
  return merged;
}

function createOrder(db, { customer, items }) {
  const c = parseCustomer(customer);
  const wanted = parseItems(items);
  return transaction(db, async () => {
    const lines = [];
    for (const [productId, qty] of [...wanted].sort(([first], [second]) => first - second)) {
      const p = await db.prepare('SELECT id, sku, name, price, stock_qty FROM products WHERE id = ? AND is_active = TRUE FOR UPDATE').get(productId);
      if (!p) throw badRequest(`Saree #${productId} is no longer available`);
      if (p.stock_qty < qty) throw new HttpError(409, `Only ${p.stock_qty} left of "${p.name}"`);
      lines.push({ product_id: p.id, product_name: p.name, sku: p.sku, unit_price: p.price, qty });
    }
    const total = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0);
    const orderNo = newOrderNo();
    const { lastInsertRowid: orderId } = await db
      .prepare(
        `INSERT INTO orders (order_no, customer_name, phone, address, city, pincode, notes, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
      )
      .run(orderNo, c.customer_name, c.phone, c.address, c.city, c.pincode, c.notes, total);
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, sku, unit_price, qty) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const decrement = db.prepare('UPDATE products SET stock_qty = stock_qty - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    for (const l of lines) {
      await insertItem.run(orderId, l.product_id, l.product_name, l.sku, l.unit_price, l.qty);
      await decrement.run(l.qty, l.product_id);
    }
    return getOrder(db, Number(orderId));
  });
}

async function getOrder(db, id) {
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) throw notFound('Order not found');
  order.items = await db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(id);
  return order;
}

async function trackOrder(db, { order_no, phone: customerPhone } = {}) {
  const orderNo = str(order_no, 'Order number', { required: true, max: 20 }).toUpperCase();
  if (!/^AS\d{6}-[A-F0-9]{6}$/.test(orderNo)) throw badRequest('Enter a valid order number');
  const normalizedPhone = phone(customerPhone);
  const phoneCandidates = [normalizedPhone];
  if (normalizedPhone.length === 10) phoneCandidates.push(`91${normalizedPhone}`);
  else if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) phoneCandidates.push(normalizedPhone.slice(2));
  const phonePlaceholders = phoneCandidates.map(() => '?').join(', ');
  const order = await db
    .prepare(`SELECT order_no, status, tracking_info FROM orders WHERE order_no = ? AND phone IN (${phonePlaceholders})`)
    .get(orderNo, ...phoneCandidates);
  if (!order) throw notFound('We could not find an order matching those details');
  return order;
}

function listOrders(db, { status, q } = {}) {
  const where = [];
  const params = [];
  if (status) { where.push('status = ?'); params.push(oneOf(status, 'status', ORDER_STATUSES)); }
  if (q) {
    const like = `%${String(q).trim()}%`;
    where.push('(order_no LIKE ? OR customer_name LIKE ? OR phone LIKE ?)');
    params.push(like, like, like);
  }
  return db
    .prepare(
      `SELECT o.*, (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) AS item_count
         FROM orders o ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY o.created_at DESC, o.id DESC LIMIT 500`
    )
    .all(...params);
}

async function updateOrder(db, id, body = {}) {
  return transaction(db, async () => {
    await db.prepare('SELECT id FROM orders WHERE id = ? FOR UPDATE').get(id);
    const order = await getOrder(db, id);
    const status = body.status !== undefined ? oneOf(body.status, 'status', ORDER_STATUSES) : order.status;
    const paymentStatus =
      body.payment_status !== undefined ? oneOf(body.payment_status, 'payment_status', PAYMENT_STATUSES) : order.payment_status;
    if (order.status === 'cancelled' && status !== 'cancelled') throw badRequest('Cancelled orders cannot be re-opened');

    if (status === 'cancelled' && order.status !== 'cancelled') {
      const restock = db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?');
      for (const it of order.items) if (it.product_id) await restock.run(it.qty, it.product_id);
    }
    await db.prepare(
      `UPDATE orders SET status = ?, payment_status = ?, payment_ref = ?, tracking_info = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(
      status,
      paymentStatus,
      body.payment_ref !== undefined ? str(body.payment_ref, 'Payment reference', { max: 100 }) : order.payment_ref,
      body.tracking_info !== undefined ? str(body.tracking_info, 'Tracking info', { max: 300 }) : order.tracking_info,
      id
    );
    return getOrder(db, id);
  });
}

async function dashboardStats(db) {
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  for (const row of await db.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all()) byStatus[row.status] = row.n;
  return {
    orders: byStatus,
    revenue_paid: (await db.prepare("SELECT COALESCE(SUM(total), 0) AS v FROM orders WHERE payment_status = 'paid'").get()).v,
    products: (await db.prepare('SELECT COUNT(*) AS n FROM products').get()).n,
    low_stock: await db
      .prepare('SELECT id, sku, name, stock_qty FROM products WHERE is_active = TRUE AND stock_qty <= 2 ORDER BY stock_qty, name')
      .all(),
  };
}

module.exports = { createOrder, getOrder, trackOrder, listOrders, updateOrder, dashboardStats, newOrderNo, ORDER_STATUSES, PAYMENT_STATUSES };
