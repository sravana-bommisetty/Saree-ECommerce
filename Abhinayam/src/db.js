'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_DIR = path.resolve(__dirname, '..', 'db');

function openDb(file, { seed = true } = {}) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'));
  migrate(db);
  if (seed && db.prepare('SELECT COUNT(*) AS n FROM categories').get().n === 0) {
    db.exec(fs.readFileSync(path.join(DB_DIR, 'seed.sql'), 'utf8'));
  }
  return db;
}

// Columns added after the first release; CREATE TABLE IF NOT EXISTS does not add them to existing databases.
const ADDED_COLUMNS = {
  admins: {
    role: "TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','staff'))",
    display_name: "TEXT NOT NULL DEFAULT ''",
    is_active: 'INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))',
    last_login_at: 'TEXT',
  },
};

function migrate(db) {
  for (const [table, columns] of Object.entries(ADDED_COLUMNS)) {
    const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
    for (const [name, def] of Object.entries(columns)) {
      if (!existing.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
    }
  }
}

function transaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { openDb, transaction, migrate };
