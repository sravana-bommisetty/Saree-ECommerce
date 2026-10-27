'use strict';
const { hashPassword, verifyPassword, isStrongEnough, MIN_LENGTH } = require('./lib/password');
const users = require('./services/users');

function createAdmin(db, username, password) {
  return users.createUser(db, { username, password, role: 'admin' });
}

function ensureAdmin(db, { username, password }) {
  if (db.prepare("SELECT COUNT(*) AS n FROM admins WHERE role = 'admin'").get().n > 0) return false;
  if (!password) {
    console.warn('[auth] No admin exists and ADMIN_PASSWORD is not set – admin panel is disabled.');
    return false;
  }
  createAdmin(db, username, password);
  console.log(`[auth] Created initial admin user "${username}". Change the password after first login.`);
  return true;
}

const SESSION_COLUMNS = 'id, username, role, display_name';

function authenticate(db, username, password, { role } = {}) {
  const row = db
    .prepare(`SELECT ${SESSION_COLUMNS}, password_hash, is_active FROM admins WHERE username = ?`)
    .get(String(username || ''));
  if (!row || !row.is_active || (role && row.role !== role) || !verifyPassword(password, row.password_hash)) return null;
  db.prepare('UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id);
  return { id: row.id, username: row.username, role: row.role, display_name: row.display_name };
}

function changePassword(db, userId, currentPassword, newPassword) {
  const row = db.prepare('SELECT password_hash FROM admins WHERE id = ?').get(userId);
  if (!row || !verifyPassword(currentPassword, row.password_hash)) return false;
  if (!isStrongEnough(newPassword)) throw new Error(`New password must be at least ${MIN_LENGTH} characters`);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), userId);
  return true;
}

// Re-reads the user on every request so role changes and deactivation take effect immediately.
function requireAuth(db) {
  const find = db.prepare(`SELECT ${SESSION_COLUMNS} FROM admins WHERE id = ? AND is_active = 1`);
  return (req, res, next) => {
    const sessionUser = req.session && req.session.admin;
    const row = sessionUser && find.get(sessionUser.id);
    if (!row) {
      if (sessionUser) req.session.destroy(() => {});
      return res.status(401).json({ error: 'Login required' });
    }
    req.user = { ...row };
    next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) return next();
    res.status(403).json({ error: 'You do not have access to this section' });
  };
}

module.exports = { hashPassword, verifyPassword, createAdmin, ensureAdmin, authenticate, changePassword, requireAuth, requireRole };
