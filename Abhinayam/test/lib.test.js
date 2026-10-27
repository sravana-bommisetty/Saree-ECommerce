'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../src/lib/validate');
const wa = require('../src/lib/whatsapp');
const { loadConfig } = require('../src/config');

test('slugify produces url-safe slugs', () => {
  assert.equal(v.slugify('  Maroon Kanjivaram – Gold Zari! '), 'maroon-kanjivaram-gold-zari');
  assert.equal(v.slugify('Café Silk'), 'cafe-silk');
});

test('str trims, enforces required and max length', () => {
  assert.equal(v.str('  hi ', 'x'), 'hi');
  assert.equal(v.str(undefined, 'x'), '');
  assert.throws(() => v.str('', 'Name', { required: true }), /Name is required/);
  assert.throws(() => v.str('abcd', 'Name', { max: 3 }), /at most 3/);
});

test('num validates numbers, integers and minimums', () => {
  assert.equal(v.num('12.5', 'p'), 12.5);
  assert.equal(v.num('', 'p'), null);
  assert.throws(() => v.num('', 'Price', { required: true }), /Price is required/);
  assert.throws(() => v.num('-1', 'Price'), />= 0/);
  assert.throws(() => v.num('1.5', 'Qty', { integer: true }), /integer/);
  assert.throws(() => v.num('abc', 'Qty'), /number/);
});

test('bool, phone and oneOf helpers', () => {
  for (const t of [true, 1, '1', 'true', 'on']) assert.equal(v.bool(t), 1);
  for (const f of [false, 0, '0', '', undefined]) assert.equal(v.bool(f), 0);
  assert.equal(v.phone('+91 98765-43210'), '919876543210');
  assert.throws(() => v.phone('12345'), /valid phone/);
  assert.equal(v.oneOf('a', 'x', ['a', 'b']), 'a');
  assert.throws(() => v.oneOf('c', 'status', ['a', 'b']), /status must be one of/);
});

test('whatsappUrl strips non-digits and encodes text', () => {
  assert.equal(wa.whatsappUrl('+91 99999-99999', 'Hi & bye'), 'https://wa.me/919999999999?text=Hi%20%26%20bye');
});

test('upiUrl builds a standard UPI deep link', () => {
  const url = new URL(wa.upiUrl({ upiId: 'shop@upi', payeeName: 'Abhinayam Silks', amount: 1500, note: 'Order X' }));
  assert.equal(url.protocol, 'upi:');
  assert.equal(url.searchParams.get('pa'), 'shop@upi');
  assert.equal(url.searchParams.get('am'), '1500.00');
  assert.equal(url.searchParams.get('cu'), 'INR');
  assert.equal(url.searchParams.get('tn'), 'Order X');
});

test('orderMessage includes order, items, address and UPI id', () => {
  const msg = wa.orderMessage(
    { order_no: 'AS1', total: 3000, customer_name: 'Lakshmi', phone: '9876543210', address: '1 Road', city: 'Chennai', pincode: '600001', notes: 'Gift wrap' },
    [{ product_name: 'Silk', sku: 'S1', qty: 2, unit_price: 1500 }],
    'shop@upi'
  );
  for (const part of ['AS1', 'Silk (S1) x 2', '₹3,000', 'Lakshmi', 'Chennai - 600001', 'Gift wrap', 'shop@upi']) {
    assert.ok(msg.includes(part), `missing ${part}`);
  }
});

test('loadConfig applies defaults and requires secrets in production', () => {
  const c = loadConfig({ PORT: '4000' });
  assert.equal(c.port, 4000);
  assert.equal(c.baseUrl, 'http://localhost:4000');
  assert.ok(c.sessionSecret.length >= 32);
  assert.equal(c.admin.password, 'ChangeMe@123');
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /SESSION_SECRET/);
  assert.equal(loadConfig({ NODE_ENV: 'production', SESSION_SECRET: 'x' }).admin.password, '');
});
