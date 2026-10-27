'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer } = require('./helpers');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const customer = { name: 'Lakshmi', phone: '9876543210', address: '12 Temple St', city: 'Chennai', pincode: '600001' };

test('HTTP API', async (t) => {
  const srv = await startServer();
  t.after(() => srv.close());
  const { request } = srv;

  await t.test('static pages, health and security headers', async () => {
    for (const p of ['/', '/shop', '/categories', '/about', '/contact', '/shipping-returns', '/cart', '/admin/', '/staff', '/staff/']) {
      const res = await request('GET', p);
      assert.equal(res.status, 200, p);
      assert.match(res.headers.get('content-type'), /html/);
    }
    const health = await request('GET', '/healthz');
    assert.deepEqual(health.json, { status: 'ok' });
    assert.match(health.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(health.headers.get('x-powered-by'), null);
    const missing = await request('GET', '/does-not-exist');
    assert.equal(missing.status, 404);
    assert.match(missing.text, /Page not found/);
    assert.equal((await request('GET', '/api/nope')).status, 404);
  });

  await t.test('public catalogue endpoints', async () => {
    assert.equal((await request('GET', '/api/settings')).json.store_name, 'Abhinayam Silks');
    assert.equal((await request('GET', '/api/categories')).json.length, 5);
    assert.equal((await request('GET', '/api/products?q=kanjivaram&inStock=1')).json.total, 2);
    assert.ok((await request('GET', '/api/products/filters')).json.colors.length > 0);
    assert.equal((await request('GET', '/api/products/royal-blue-banarasi-brocade')).json.sku, 'AB-BN-001');
    assert.equal((await request('GET', '/api/products/nope')).status, 404);
    assert.equal((await request('GET', '/api/products?minPrice=abc')).status, 400);
  });

  await t.test('SEO: product page, sitemap and robots', async () => {
    const page = await request('GET', '/saree/maroon-kanjivaram-gold-zari');
    assert.equal(page.status, 200);
    assert.match(page.text, /<title>Maroon Kanjivaram with Gold Zari \| Abhinayam Silks<\/title>/);
    assert.match(page.text, /"@type":"Product"/);
    assert.match(page.text, /https:\/\/schema.org\/InStock/);
    assert.match(page.text, /rel="canonical" href="https:\/\/shop.test\/saree\/maroon-kanjivaram-gold-zari"/);
    assert.equal((await request('GET', '/saree/unknown')).status, 404);

    const sitemap = await request('GET', '/sitemap.xml');
    assert.match(sitemap.headers.get('content-type'), /xml/);
    assert.match(sitemap.text, /<loc>https:\/\/shop.test\/saree\/pink-cotton-silk-daily<\/loc>/);
    assert.match(sitemap.text, /<loc>https:\/\/shop.test\/shipping-returns<\/loc>/);
    const robots = await request('GET', '/robots.txt');
    assert.match(robots.text, /Disallow: \/admin/);
    assert.match(robots.text, /Disallow: \/staff/);
    assert.match(robots.text, /Sitemap: https:\/\/shop.test\/sitemap.xml/);
  });

  await t.test('placing an order returns WhatsApp + UPI details and reserves stock', async () => {
    const res = await request('POST', '/api/orders', { body: { customer, items: [{ productId: 6, qty: 2 }] } });
    assert.equal(res.status, 201);
    assert.match(res.json.order.order_no, /^AS\d{6}-/);
    assert.equal(res.json.order.total, 4900);
    assert.match(res.json.whatsappUrl, /^https:\/\/wa\.me\/919999999999\?text=/);
    assert.match(decodeURIComponent(res.json.whatsappUrl), /Pink Cotton Silk Daily Wear/);
    assert.match(res.json.upiUrl, /^upi:\/\/pay\?pa=abhinayamsilks%40upi/);
    assert.match(res.json.upiQr, /^data:image\/png;base64,/);
    assert.equal((await request('GET', '/api/products/pink-cotton-silk-daily')).json.stock_qty, 8);

    const sold = await request('POST', '/api/orders', { body: { customer, items: [{ productId: 5 }] } });
    assert.equal(sold.status, 409);
    const bad = await request('POST', '/api/orders', { body: { customer: {}, items: [{ productId: 1 }] } });
    assert.equal(bad.status, 400);
    assert.match(bad.json.error, /required|Pincode/);
  });

  await t.test('admin endpoints require login and the fetch header', async () => {
    assert.equal((await request('GET', '/api/admin/stats')).status, 401);
    assert.equal((await request('POST', '/api/admin/login', { body: { username: 'owner', password: 'Secret@123' } })).status, 403);
    assert.equal((await request('POST', '/api/admin/login', { body: { username: 'owner', password: 'bad' }, admin: true })).status, 401);
    await srv.login();
    assert.equal((await request('GET', '/api/admin/me')).json.username, 'owner');
    assert.equal((await request('PUT', '/api/admin/settings', { body: { tagline: 'x' } })).status, 403, 'mutations need header');
  });

  await t.test('admin manages products with photo uploads', async () => {
    const form = new FormData();
    Object.entries({ name: 'Lavender Organza', sku: 'ab-org-1', price: '7200', stock_qty: '3', category_id: '3', fabric: 'Organza', color: 'Purple', is_active: '1', is_featured: '0' })
      .forEach(([k, v]) => form.append(k, v));
    form.append('images', new Blob([PNG], { type: 'image/png' }), 'photo.png');
    const created = await request('POST', '/api/admin/products', { form, admin: true });
    assert.equal(created.status, 200, created.text);
    assert.equal(created.json.sku, 'AB-ORG-1');
    const imgUrl = created.json.images[0].url;
    assert.match(imgUrl, /^\/uploads\/.+\.png$/);
    const img = await request('GET', imgUrl);
    assert.equal(img.status, 200);
    const filePath = path.join(srv.config.uploadDir, path.basename(imgUrl));
    assert.ok(fs.existsSync(filePath));

    const dup = new FormData();
    Object.entries({ name: 'Dup', sku: 'AB-ORG-1', price: '1' }).forEach(([k, v]) => dup.append(k, v));
    dup.append('images', new Blob([PNG], { type: 'image/png' }), 'p.png');
    const conflict = await request('POST', '/api/admin/products', { form: dup, admin: true });
    assert.equal(conflict.status, 409);
    assert.equal(fs.readdirSync(srv.config.uploadDir).length, 1, 'orphan upload removed');

    const badType = new FormData();
    badType.append('name', 'x');
    badType.append('images', new Blob(['hello'], { type: 'text/plain' }), 'x.txt');
    assert.equal((await request('POST', '/api/admin/products', { form: badType, admin: true })).status, 400);

    const upd = new FormData();
    Object.entries({ name: 'Lavender Organza', sku: 'AB-ORG-1', price: '6900', stock_qty: '3', is_active: '1' }).forEach(([k, v]) => upd.append(k, v));
    assert.equal((await request('PUT', `/api/admin/products/${created.json.id}`, { form: upd, admin: true })).json.price, 6900);
    assert.equal((await request('PATCH', `/api/admin/products/${created.json.id}/stock`, { body: { stock_qty: 7 }, admin: true })).json.stock_qty, 7);
    assert.equal((await request('GET', '/api/admin/products?q=organza')).json.total, 1);
    assert.equal((await request('GET', `/api/admin/products/${created.json.id}`)).json.images.length, 1);
    assert.equal((await request('GET', '/api/admin/products/abc')).status, 400);

    assert.equal((await request('DELETE', `/api/admin/images/${created.json.images[0].id}`, { admin: true })).status, 200);
    assert.equal((await request('DELETE', `/api/admin/products/${created.json.id}`, { admin: true })).status, 200);
    assert.ok(!fs.existsSync(filePath), 'image file deleted');
  });

  await t.test('admin manages staff users; staff can only view and update stock', async () => {
    const created = await request('POST', '/api/admin/users', { body: { username: 'priya', display_name: 'Priya', password: 'Staff@1234', role: 'staff' }, admin: true });
    assert.equal(created.status, 201);
    assert.equal(created.json.role, 'staff');
    assert.equal(created.json.password_hash, undefined);
    assert.equal((await request('POST', '/api/admin/users', { body: { username: 'priya', password: 'Staff@1234' }, admin: true })).status, 409);
    assert.equal((await request('GET', '/api/admin/users')).json.length, 2);

    const staff = srv.client();
    assert.equal((await staff.request('POST', '/api/admin/login', { body: { username: 'priya', password: 'Staff@1234' }, admin: true })).status, 401, 'staff rejected on admin portal');
    assert.equal((await staff.request('POST', '/api/admin/login', { body: { username: 'owner', password: 'Secret@123', portal: 'staff' }, admin: true })).status, 401, 'admin rejected on staff portal');
    const me = await staff.login({ username: 'priya', password: 'Staff@1234', portal: 'staff' });
    assert.equal(me.role, 'staff');
    assert.equal((await staff.request('GET', '/api/admin/me')).json.display_name, 'Priya');

    const stock = await staff.request('GET', '/api/admin/stock?q=pink');
    assert.equal(stock.status, 200);
    assert.equal(stock.json.length, 1);
    assert.equal(stock.json[0].price, undefined, 'staff stock view hides prices');
    const pid = stock.json[0].id;
    const upd = await staff.request('PATCH', `/api/admin/products/${pid}/stock`, { body: { stock_qty: 15, note: 'New delivery' }, admin: true });
    assert.equal(upd.json.stock_qty, 15);
    const hist = await staff.request('GET', `/api/admin/stock/history?productId=${pid}`);
    assert.deepEqual(
      { old: hist.json[0].old_qty, new: hist.json[0].new_qty, note: hist.json[0].note, by: hist.json[0].changed_by },
      { old: 8, new: 15, note: 'New delivery', by: 'Priya' }
    );
    assert.ok((await staff.request('GET', '/api/admin/stock?lowStock=2')).json.every((p) => p.stock_qty <= 2));

    for (const [method, url] of [['GET', '/api/admin/stats'], ['GET', '/api/admin/orders'], ['GET', '/api/admin/settings'], ['GET', '/api/admin/users'], ['GET', '/api/admin/products'], ['DELETE', `/api/admin/products/${pid}`]]) {
      assert.equal((await staff.request(method, url, { admin: true })).status, 403, `${method} ${url}`);
    }
    assert.equal((await staff.request('POST', '/api/admin/password', { body: { currentPassword: 'Staff@1234', newPassword: 'Staff@5678' }, admin: true })).status, 403, 'staff cannot change password');

    const adminId = (await request('GET', '/api/admin/me')).json.id;
    assert.equal((await request('PUT', `/api/admin/users/${adminId}`, { body: { role: 'staff' }, admin: true })).status, 400);
    assert.equal((await request('DELETE', `/api/admin/users/${adminId}`, { admin: true })).status, 400);

    // Deactivating a user ends their session immediately and blocks new logins.
    assert.equal((await request('PUT', `/api/admin/users/${created.json.id}`, { body: { is_active: false }, admin: true })).json.is_active, false);
    assert.equal((await staff.request('GET', '/api/admin/stock')).status, 401);
    assert.equal((await staff.request('POST', '/api/admin/login', { body: { username: 'priya', password: 'Staff@1234', portal: 'staff' }, admin: true })).status, 401);

    // Promoting to admin grants full access.
    await request('PUT', `/api/admin/users/${created.json.id}`, { body: { is_active: true, role: 'admin', password: 'Admin@5678' }, admin: true });
    await staff.login({ username: 'priya', password: 'Admin@5678' });
    assert.equal((await staff.request('GET', '/api/admin/stats')).status, 200);
    assert.equal((await request('DELETE', `/api/admin/users/${created.json.id}`, { admin: true })).status, 200);
    assert.equal((await staff.request('GET', '/api/admin/me')).status, 401);
  });

  await t.test('admin manages categories, orders, settings and password', async () => {
    const cat = await request('POST', '/api/admin/categories', { form: (() => { const f = new FormData(); f.append('name', 'Linen'); return f; })(), admin: true });
    assert.equal(cat.json.slug, 'linen');
    const f2 = new FormData();
    f2.append('name', 'Linen Sarees');
    assert.equal((await request('PUT', `/api/admin/categories/${cat.json.id}`, { form: f2, admin: true })).json.slug, 'linen-sarees');
    assert.equal((await request('GET', '/api/admin/categories')).json.length, 6);
    assert.equal((await request('DELETE', `/api/admin/categories/${cat.json.id}`, { admin: true })).status, 200);

    const list = await request('GET', '/api/admin/orders?status=new');
    assert.equal(list.json.length, 1);
    const id = list.json[0].id;
    assert.equal((await request('GET', `/api/admin/orders/${id}`)).json.items.length, 1);
    const upd = await request('PATCH', `/api/admin/orders/${id}`, { body: { status: 'shipped', payment_status: 'paid', tracking_info: 'DTDC' }, admin: true });
    assert.equal(upd.json.status, 'shipped');
    assert.equal((await request('GET', '/api/admin/stats')).json.revenue_paid, 4900);

    const s = await request('PUT', '/api/admin/settings', { body: { whatsapp_number: '918888888888' }, admin: true });
    assert.equal(s.json.whatsapp_number, '918888888888');
    assert.equal((await request('GET', '/api/admin/settings')).json.whatsapp_number, '918888888888');
    assert.equal((await request('GET', '/api/settings')).json.whatsapp_number, '918888888888');

    assert.equal((await request('POST', '/api/admin/password', { body: { currentPassword: 'bad', newPassword: 'Another@123' }, admin: true })).status, 400);
    assert.equal((await request('POST', '/api/admin/password', { body: { currentPassword: 'Secret@123', newPassword: 'short' }, admin: true })).status, 400);
    assert.equal((await request('POST', '/api/admin/password', { body: { currentPassword: 'Secret@123', newPassword: 'Another@123' }, admin: true })).status, 200);

    assert.equal((await request('POST', '/api/admin/logout', { admin: true })).status, 200);
    assert.equal((await request('GET', '/api/admin/me')).status, 401);
  });
});
