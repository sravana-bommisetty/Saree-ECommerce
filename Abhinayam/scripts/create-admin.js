'use strict';
// Usage: npm run create-admin -- <username> <password> [admin|staff]
const { loadConfig } = require('../src/config');
const { openDb } = require('../src/db');
const { createUser } = require('../src/services/users');

const [username, password, role = 'admin'] = process.argv.slice(2);
if (!username || !password) {
  console.error('Usage: npm run create-admin -- <username> <password> [admin|staff]');
  process.exit(1);
}
const db = openDb(loadConfig().dbFile);
try {
  createUser(db, { username, password, role });
  console.log(`${role === 'staff' ? 'Staff user' : 'Admin'} "${username}" created.`);
} catch (err) {
  console.error(`Failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  db.close();
}
