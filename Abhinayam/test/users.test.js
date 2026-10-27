'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const users = require('../src/services/users');
const { testDb } = require('./helpers');

const staff = (o = {}) => ({ username: 'meena', password: 'Staff@1234', display_name: 'Meena', ...o });

test('createUser defaults to staff, hides the hash and validates input', () => {
  const db = testDb();
  const u = users.createUser(db, staff());
  assert.deepEqual({ role: u.role, is_active: u.is_active, display_name: u.display_name }, { role: 'staff', is_active: true, display_name: 'Meena' });
  assert.equal(u.password_hash, undefined);
  assert.equal(users.listUsers(db).length, 1);
  assert.throws(() => users.createUser(db, staff({ username: '' })), /Username is required/);
  assert.throws(() => users.createUser(db, staff({ username: 'bad name' })), /may only contain/);
  assert.throws(() => users.createUser(db, staff({ username: 'x', password: 'short' })), /at least 8/);
  assert.throws(() => users.createUser(db, staff({ username: 'y', role: 'owner' })), /Role must be one of/);
  assert.throws(() => users.createUser(db, staff()), /UNIQUE/);
});

test('updateUser changes role, status, name and resets password', () => {
  const db = testDb();
  const admin = users.createUser(db, staff({ username: 'boss', role: 'admin' }));
  const u = users.createUser(db, staff());
  const upd = users.updateUser(db, u.id, { role: 'admin', is_active: '0', display_name: 'Meena K', password: 'Reset@1234' }, admin.id);
  assert.deepEqual({ role: upd.role, is_active: upd.is_active, display_name: upd.display_name }, { role: 'admin', is_active: false, display_name: 'Meena K' });
  assert.equal(users.updateUser(db, u.id, {}, admin.id).role, 'admin', 'empty update keeps values');
  assert.throws(() => users.updateUser(db, u.id, { password: 'short' }, admin.id), /at least 8/);
  assert.throws(() => users.updateUser(db, 999, {}, admin.id), /not found/);
});

test('admins cannot lock themselves out and one active admin always remains', () => {
  const db = testDb();
  const a = users.createUser(db, staff({ username: 'a1', role: 'admin' }));
  const b = users.createUser(db, staff({ username: 'a2', role: 'admin' }));
  assert.throws(() => users.updateUser(db, a.id, { role: 'staff' }, a.id), /your own admin access/);
  assert.throws(() => users.updateUser(db, a.id, { is_active: false }, a.id), /your own admin access/);
  assert.throws(() => users.deleteUser(db, a.id, a.id), /your own account/);
  users.updateUser(db, b.id, { role: 'staff' }, a.id);
  assert.equal(users.countActiveAdmins(db), 1);
  assert.throws(() => users.updateUser(db, a.id, { role: 'staff' }, 0), /At least one active admin/);
  assert.throws(() => users.deleteUser(db, a.id, 0), /At least one active admin/);
  users.deleteUser(db, b.id, a.id);
  assert.throws(() => users.getUser(db, b.id), /not found/);
});
