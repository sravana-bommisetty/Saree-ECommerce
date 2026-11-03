'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Client, Pool } = require('pg');
const { openDb, transaction } = require('../src/db');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { ensureSettings } = require('../src/services/settings');
const catalog = require('../src/services/catalog');
const orders = require('../src/services/orders');

test('Render deployment uses its HTTPS URL unless a public URL is explicitly configured', () => {
  const env = {
    DATABASE_URL: 'postgresql://test:test@localhost/test',
    NODE_ENV: 'production',
    SESSION_SECRET: 'test-secret',
    RENDER_EXTERNAL_URL: 'https://abhinayam-test.onrender.com/',
    PORT: '10000',
  };
  assert.equal(loadConfig(env).baseUrl, 'https://abhinayam-test.onrender.com');
  assert.equal(loadConfig(env).port, 10000);
  assert.equal(loadConfig(env).isProd, true);
  assert.equal(loadConfig(env).admin.password, '');
  assert.equal(loadConfig({ ...env, PUBLIC_BASE_URL: 'https://silks.example/' }).baseUrl, 'https://silks.example');
  assert.equal(loadConfig({ DATABASE_URL: env.DATABASE_URL }).baseUrl, 'http://localhost:3000');
});

test('admin bootstrap requires an explicitly configured password', async (context) => {
  const { ensureAdmin } = require('../src/auth');
  const env = { DATABASE_URL: 'postgresql://test:test@localhost/test' };
  assert.equal(loadConfig(env).admin.password, '');
  assert.equal(loadConfig({ ...env, ADMIN_PASSWORD: '' }).admin.password, '');
  assert.equal(loadConfig({ ...env, ADMIN_PASSWORD: 'Explicit@123' }).admin.password, 'Explicit@123');
  context.mock.method(console, 'warn', () => {});
  let queries = 0;
  const db = { prepare: (sql) => {
    queries++;
    assert.match(sql, /^SELECT COUNT/);
    return { get: async () => ({ n: 0 }) };
  } };
  assert.equal(await ensureAdmin(db, loadConfig(env).admin), false);
  assert.equal(queries, 1);
});

test('PostgreSQL adapter initializes schema, translates placeholders and isolates transactions', async (context) => {
  const calls = [];
  context.mock.method(Pool.prototype, 'query', async (sql, params) => {
    calls.push({ sql, params, pooled: true });
    return { rows: [{ id: 7 }], rowCount: 1 };
  });
  context.mock.method(Pool.prototype, 'end', async () => {});
  let released = 0;
  context.mock.method(Pool.prototype, 'connect', async () => ({
    query: async (sql, params) => {
      calls.push({ sql, params, pooled: false });
      return { rows: [{ id: 7 }], rowCount: 1 };
    },
    release: () => { released++; },
  }));
  const db = openDb('postgresql://test:test@localhost/test');
  await assert.rejects(db.prepare('SELECT 1').get(), /not initialized/);
  await db.__init();
  assert.match(calls[0].sql, /CREATE TABLE IF NOT EXISTS settings/);
  const sql = "SELECT '?' AS literal, $$?$$ AS dollar, $tag$?$tag$ AS tagged, ? AS first, ? AS second -- ?";
  await db.prepare(sql).get(1, 2);
  assert.equal(calls[1].sql, "SELECT '?' AS literal, $$?$$ AS dollar, $tag$?$tag$ AS tagged, $1 AS first, $2 AS second -- ?");
  assert.deepEqual(calls[1].params, [1, 2]);
  assert.equal((await db.prepare('INSERT INTO categories (name) VALUES (?) RETURNING id').run('Test')).lastInsertRowid, 7);

  const start = calls.length;
  await transaction(db, async () => {
    await db.prepare('SELECT ?').get(3);
    await new Promise((resolve) => setImmediate(resolve));
  });
  assert.deepEqual(calls.slice(start).map((call) => call.sql), ['BEGIN', 'SELECT $1', 'COMMIT']);
  assert.ok(calls.slice(start).every((call) => !call.pooled));
  await assert.rejects(transaction(db, async () => { throw new Error('rollback'); }), /rollback/);
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
  assert.equal(released, 2);
  await db.close();
});

test('settings initialization awaits queries and propagates database failures', async () => {
  let active = 0;
  const db = { prepare: () => ({ run: async () => {
    assert.equal(active++, 0);
    await new Promise((resolve) => setImmediate(resolve));
    active--;
  } }) };
  await ensureSettings(db, {});
  await assert.rejects(ensureSettings({ prepare: () => ({ run: async () => { throw new Error('SQL failed'); } }) }, {}), /SQL failed/);
});

test('PostgreSQL startup and application regression', { skip: !process.env.TEST_DATABASE_URL }, async (context) => {
  const schema = `regression_${crypto.randomUUID().replace(/-/g, '')}`;
  const control = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await control.connect();
  let server;
  let uploadDir;
  const url = new URL(process.env.TEST_DATABASE_URL);
  url.searchParams.set('options', `-c search_path=${schema}`);
  const db = openDb(url.toString());
  context.after(async () => {
    try {
      if (server) await new Promise((resolve) => server.close(resolve));
      await db.close();
      await control.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      if (uploadDir) await fs.rm(uploadDir, { recursive: true, force: true });
    } finally {
      await control.end();
    }
  });
  await control.query(`CREATE SCHEMA ${schema}`);
  await db.__init();
  uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'abhinayam-pg-'));
  const config = {
    ...loadConfig({ DATABASE_URL: url.toString(), SESSION_SECRET: 'test-secret', ADMIN_PASSWORD: 'Secret@123' }),
    uploadDir,
  };
  const app = await createApp({ db, config });
  await createApp({ db, config });
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM admins').get()).n, 1);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  async function request(method, route, body) {
    const response = await fetch(base + route, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch', Cookie: cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return response;
  }

  await context.test('startup, login and persistent settings', async () => {
    assert.equal((await request('GET', '/healthz')).status, 200);
    assert.equal((await request('GET', '/api/admin/settings')).status, 401);
    assert.equal((await request('POST', '/api/admin/login', { username: 'admin', password: 'bad' })).status, 401);
    assert.equal((await request('POST', '/api/admin/login', { username: 'admin', password: 'Secret@123' })).status, 200);
    assert.equal((await (await request('GET', '/api/admin/me')).json()).username, 'admin');
    assert.equal((await request('PUT', '/api/admin/settings', { tagline: 'PostgreSQL test' })).status, 200);
    assert.equal((await (await request('GET', '/api/settings')).json()).tagline, 'PostgreSQL test');
  });

  const category = await catalog.createCategory(db, { name: 'Test Silks' });
  const product = await catalog.createProduct(db, {
    name: 'Test Saree', sku: 'TEST-1', price: 1250.50, stock_qty: 5, category_id: category.id, is_featured: true,
  }, ['/uploads/test.png']);

  await context.test('catalog, numeric values, booleans and SEO', async () => {
    const listing = await (await request('GET', '/api/products?featured=1')).json();
    assert.equal(listing.total, 1);
    assert.equal(listing.items[0].price, 1250.50);
    assert.equal(listing.items[0].is_active, true);
    assert.equal((await catalog.listCategories(db))[0].product_count, 1);
    assert.equal((await catalog.filterOptions(db)).price.min, 1250.50);
    assert.equal((await request('GET', '/saree/test-saree')).status, 200);
    assert.match(await (await request('GET', '/sitemap.xml')).text(), /test-saree/);
    assert.equal((await request('GET', '/api/products/missing')).status, 404);
    const form = new FormData();
    form.append('name', 'Duplicate');
    form.append('sku', 'TEST-1');
    form.append('price', '1');
    form.append('images', new Blob(['image'], { type: 'image/png' }), 'test.png');
    const duplicate = await fetch(base + '/api/admin/products', {
      method: 'POST', headers: { Cookie: cookie, 'X-Requested-With': 'fetch' }, body: form,
    });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(await fs.readdir(uploadDir), []);
  });

  const customer = { name: 'Test Customer', phone: '9876543210', address: '1 Test St', city: 'Chennai', pincode: '600001' };
  await context.test('order creation, rollback and cancellation', async () => {
    const response = await request('POST', '/api/orders', { customer, items: [{ productId: product.id, qty: 2 }] });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.order.total, 2501);
    assert.match(result.upiQr, /^data:image\/png/);
    assert.equal((await catalog.getProduct(db, { id: product.id })).stock_qty, 3);
    await assert.rejects(orders.createOrder(db, { customer, items: [{ productId: product.id, qty: 10 }] }), /Only 3 left/);
    assert.equal((await orders.listOrders(db)).length, 1);
    const order = (await orders.listOrders(db))[0];
    await Promise.all([orders.updateOrder(db, order.id, { status: 'cancelled' }), orders.updateOrder(db, order.id, { status: 'cancelled' })]);
    assert.equal((await catalog.getProduct(db, { id: product.id })).stock_qty, 5);
    await assert.rejects(orders.updateOrder(db, order.id, { status: 'new' }), /cannot be re-opened/);
  });

  await context.test('concurrent orders cannot oversell stock', async () => {
    const results = await Promise.allSettled([
      orders.createOrder(db, { customer, items: [{ productId: product.id, qty: 4 }] }),
      orders.createOrder(db, { customer, items: [{ productId: product.id, qty: 4 }] }),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal((await catalog.getProduct(db, { id: product.id })).stock_qty, 1);
    await assert.rejects(transaction(db, async () => {
      await db.prepare('UPDATE products SET stock_qty = ? WHERE id = ?').run(8, product.id);
      throw new Error('forced rollback');
    }), /forced rollback/);
    assert.equal((await catalog.getProduct(db, { id: product.id })).stock_qty, 1);
  });

  await context.test('stock history and staff session revocation', async () => {
    assert.equal((await request('PATCH', `/api/admin/products/${product.id}/stock`, { stock_qty: 9, note: 'Delivery' })).status, 200);
    assert.equal((await catalog.stockHistory(db, { productId: product.id }))[0].new_qty, 9);
    assert.equal((await request('GET', '/api/admin/stats')).status, 200);
    const staffResponse = await request('POST', '/api/admin/users', { username: 'staff', password: 'Staff@123', role: 'staff' });
    assert.equal(staffResponse.status, 201);
    const staff = await staffResponse.json();
    const adminCookie = cookie;
    cookie = '';
    assert.equal((await request('POST', '/api/admin/login', { username: 'staff', password: 'Staff@123', portal: 'staff' })).status, 200);
    const staffCookie = cookie;
    assert.equal((await request('GET', '/api/admin/stock')).status, 200);
    assert.equal((await request('GET', '/api/admin/settings')).status, 403);
    cookie = adminCookie;
    assert.equal((await request('PUT', `/api/admin/users/${staff.id}`, { is_active: false })).status, 200);
    cookie = staffCookie;
    assert.equal((await request('GET', '/api/admin/stock')).status, 401);
  });
});