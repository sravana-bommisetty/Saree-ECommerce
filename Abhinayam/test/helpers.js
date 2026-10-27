'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../src/db');
const { loadConfig } = require('../src/config');
const { createApp } = require('../src/app');

const ADMIN = { username: 'owner', password: 'Secret@123' };

function testDb() {
  return openDb(':memory:');
}

function testConfig(overrides = {}) {
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'abhinayam-test-'));
  return {
    ...loadConfig({ DB_FILE: ':memory:', SESSION_SECRET: 'test-secret', ADMIN_USERNAME: ADMIN.username, ADMIN_PASSWORD: ADMIN.password, PUBLIC_BASE_URL: 'https://shop.test' }),
    uploadDir,
    ...overrides,
  };
}

async function startServer() {
  const db = testDb();
  const config = testConfig();
  const origLog = console.log;
  console.log = () => {};
  const app = createApp({ db, config });
  console.log = origLog;
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  // Each client has its own cookie jar, so tests can act as several users at once.
  function client() {
    let cookie = '';

    async function request(method, url, { body, form, headers = {}, admin = false } = {}) {
      const h = { ...headers };
      if (admin) h['X-Requested-With'] = 'fetch';
      if (cookie) h.Cookie = cookie;
      let payload;
      if (form) payload = form;
      else if (body !== undefined) {
        h['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
      const res = await fetch(base + url, { method, headers: h, body: payload, redirect: 'manual' });
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = undefined; }
      return { status: res.status, headers: res.headers, text, json };
    }

    async function login(creds = ADMIN) {
      const res = await request('POST', '/api/admin/login', { body: creds, admin: true });
      if (res.status !== 200) throw new Error(`login failed: ${res.text}`);
      return res.json;
    }

    return { request, login };
  }

  const { request, login } = client();

  async function close() {
    await new Promise((r) => server.close(r));
    db.close();
    fs.rmSync(config.uploadDir, { recursive: true, force: true });
  }

  return { db, config, request, login, client, close, base };
}

module.exports = { testDb, testConfig, startServer, ADMIN };
