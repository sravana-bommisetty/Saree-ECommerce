'use strict';
const { str, bool, oneOf, badRequest, notFound } = require('../lib/validate');
const { hashPassword, isStrongEnough, MIN_LENGTH } = require('../lib/password');

const ROLES = ['admin', 'staff'];
const USERNAME_RE = /^[A-Za-z0-9._@-]+$/;
const COLUMNS = 'id, username, display_name, role, is_active, last_login_at, created_at';

const toUser = (row) => row && { ...row, is_active: Boolean(row.is_active) };

function validPassword(password) {
  if (!isStrongEnough(password)) throw badRequest(`Password must be at least ${MIN_LENGTH} characters`);
  return password;
}

async function listUsers(db) {
  return (await db.prepare(`SELECT ${COLUMNS} FROM admins ORDER BY role, username`).all()).map(toUser);
}

async function getUser(db, id) {
  const user = toUser(await db.prepare(`SELECT ${COLUMNS} FROM admins WHERE id = ?`).get(id));
  if (!user) throw notFound('User not found');
  return user;
}

async function countActiveAdmins(db, excludeId = 0) {
  return (await db.prepare("SELECT COUNT(*) AS n FROM admins WHERE role = 'admin' AND is_active = TRUE AND id <> ?").get(excludeId)).n;
}

async function createUser(db, body = {}) {
  const username = str(body.username, 'Username', { required: true, max: 40 });
  if (!USERNAME_RE.test(username)) throw badRequest('Username may only contain letters, numbers, dot, dash, underscore or @');
  const role = oneOf(body.role || 'staff', 'Role', ROLES);
  const displayName = str(body.display_name, 'Name', { max: 80 });
  const hash = hashPassword(validPassword(body.password));
  const { lastInsertRowid } = await db
    .prepare('INSERT INTO admins (username, password_hash, role, display_name) VALUES (?, ?, ?, ?) RETURNING id')
    .run(username, hash, role, displayName);
  return getUser(db, Number(lastInsertRowid));
}

// actorId is the logged-in admin; they cannot lock themselves out, and the shop always keeps one active admin.
async function updateUser(db, id, body = {}, actorId = 0) {
  const current = await getUser(db, id);
  const role = body.role === undefined ? current.role : oneOf(body.role, 'Role', ROLES);
  const isActive = body.is_active === undefined ? current.is_active : Boolean(bool(body.is_active));
  const displayName = body.display_name === undefined ? current.display_name : str(body.display_name, 'Name', { max: 80 });

  const losesAdmin = current.role === 'admin' && current.is_active && (role !== 'admin' || !isActive);
  if (losesAdmin && id === actorId) throw badRequest('You cannot remove your own admin access');
  if (losesAdmin && await countActiveAdmins(db, id) === 0) throw badRequest('At least one active admin is required');

  await db.prepare('UPDATE admins SET role = ?, is_active = ?, display_name = ? WHERE id = ?').run(role, isActive, displayName, id);
  if (body.password) await db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hashPassword(validPassword(body.password)), id);
  return getUser(db, id);
}

async function deleteUser(db, id, actorId = 0) {
  const user = await getUser(db, id);
  if (id === actorId) throw badRequest('You cannot delete your own account');
  if (user.role === 'admin' && user.is_active && await countActiveAdmins(db, id) === 0) {
    throw badRequest('At least one active admin is required');
  }
  await db.prepare('DELETE FROM admins WHERE id = ?').run(id);
}

module.exports = { ROLES, listUsers, getUser, createUser, updateUser, deleteUser, countActiveAdmins };
