'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../src/auth');
const users = require('../src/services/users');
const { migrate } = require('../src/db');
const { testDb } = require('./helpers');

test('hashPassword/verifyPassword round-trip and reject wrong or malformed hashes', () => {
  const h = auth.hashPassword('Secret@123');
  assert.match(h, /^scrypt\$/);
  assert.ok(auth.verifyPassword('Secret@123', h));
  assert.ok(!auth.verifyPassword('wrong', h));
  assert.ok(!auth.verifyPassword('x', 'garbage'));
});

test('ensureAdmin creates the first admin only once and skips without password', (t) => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'warn', () => {});
  const db = testDb();
  assert.equal(auth.ensureAdmin(db, { username: 'a', password: '' }), false);
  assert.equal(auth.ensureAdmin(db, { username: 'a', password: 'Secret@123' }), true);
  assert.equal(auth.ensureAdmin(db, { username: 'b', password: 'Secret@123' }), false);
  assert.deepEqual({ ...auth.authenticate(db, 'a', 'Secret@123') }, { id: 1, username: 'a', role: 'admin', display_name: '' });
  assert.ok(db.prepare('SELECT last_login_at FROM admins WHERE id = 1').get().last_login_at);
  assert.equal(auth.authenticate(db, 'a', 'nope'), null);
  assert.equal(auth.authenticate(db, 'ghost', 'Secret@123'), null);
});

test('createAdmin enforces password length', () => {
  assert.throws(() => auth.createAdmin(testDb(), 'x', 'short'), /at least 8/);
});

test('changePassword verifies current password and updates hash', () => {
  const db = testDb();
  auth.createAdmin(db, 'a', 'Secret@123');
  assert.equal(auth.changePassword(db, 1, 'wrong', 'NewSecret@1'), false);
  assert.throws(() => auth.changePassword(db, 1, 'Secret@123', 'short'), /at least 8/);
  assert.equal(auth.changePassword(db, 1, 'Secret@123', 'NewSecret@1'), true);
  assert.ok(auth.authenticate(db, 'a', 'NewSecret@1'));
});

test('authenticate rejects deactivated users and enforces the requested role', () => {
  const db = testDb();
  auth.createAdmin(db, 'a', 'Secret@123');
  assert.equal(auth.authenticate(db, 'a', 'Secret@123', { role: 'staff' }), null);
  assert.equal(auth.authenticate(db, 'a', 'Secret@123', { role: 'admin' }).role, 'admin');
  db.prepare('UPDATE admins SET is_active = 0').run();
  assert.equal(auth.authenticate(db, 'a', 'Secret@123'), null);
});

test('requireAuth loads the current user and rejects missing or deactivated accounts', () => {
  const db = testDb();
  auth.createAdmin(db, 'a', 'Secret@123');
  const mw = auth.requireAuth(db);
  const run = (session) => {
    const out = { status: 200, next: false, destroyed: false };
    const req = { session: session && { ...session, destroy: () => (out.destroyed = true) } };
    mw(req, { status: (s) => ((out.status = s), { json: () => {} }) }, () => (out.next = true));
    return { ...out, user: req.user };
  };
  assert.equal(run({}).status, 401);
  const ok = run({ admin: { id: 1 } });
  assert.ok(ok.next);
  assert.equal(ok.user.role, 'admin');
  db.prepare('UPDATE admins SET is_active = 0').run();
  const gone = run({ admin: { id: 1 } });
  assert.deepEqual({ status: gone.status, destroyed: gone.destroyed, next: gone.next }, { status: 401, destroyed: true, next: false });
});

test('requireRole allows listed roles only', () => {
  let status;
  let nextCalled = false;
  const res = { status: (s) => ((status = s), { json: () => {} }) };
  auth.requireRole('admin')({ user: { role: 'staff' } }, res, () => (nextCalled = true));
  assert.equal(status, 403);
  auth.requireRole('admin', 'staff')({ user: { role: 'staff' } }, res, () => (nextCalled = true));
  assert.ok(nextCalled);
});

test('ensureAdmin ignores staff-only databases when counting admins', (t) => {
  t.mock.method(console, 'log', () => {});
  const db = testDb();
  users.createUser(db, { username: 's', password: 'Staff@1234', role: 'staff' });
  assert.equal(auth.ensureAdmin(db, { username: 'boss', password: 'Secret@123' }), true);
});

test('migrate adds new admin columns to an old database', () => {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE admins (id INTEGER PRIMARY KEY, username TEXT, password_hash TEXT, created_at TEXT)');
  db.exec("INSERT INTO admins (username, password_hash) VALUES ('old', 'x')");
  migrate(db);
  migrate(db);
  assert.deepEqual({ ...db.prepare('SELECT role, is_active, display_name FROM admins').get() }, { role: 'admin', is_active: 1, display_name: '' });
});
