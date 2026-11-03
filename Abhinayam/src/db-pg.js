'use strict';
const { Pool } = require('pg');

// PostgreSQL Database Wrapper
// Provides an interface compatible with SQLite DatabaseSync API but uses PostgreSQL
function openDb(connectionString) {
  if (!connectionString) {
    throw new Error('DATABASE_URL connection string required for PostgreSQL');
  }

  const pool = new Pool({ 
    connectionString,
    // Connection pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return {
    pool,
    
    prepare: (sql) => {
      const self = arguments.callee.self = { pool, sql };
      
      return {
        // Synchronous wrapper using promises
        // These will need to be awaited in the calling code
        get(...params) {
          // Returns a promise for single row
          return pool.query(sql, params).then(res => res.rows[0] || null);
        },
        
        all(...params) {
          // Returns a promise for multiple rows
          return pool.query(sql, params).then(res => res.rows);
        },
        
        run(...params) {
          // Returns a promise for INSERT/UPDATE/DELETE
          return pool.query(sql, params).then(res => ({
            lastInsertRowid: res.rows[0]?.id,
            changes: res.rowCount
          }));
        }
      };
    },

    exec(sql) {
      // For executing raw SQL blocks (like schema creation)
      // Split by semicolon and execute each statement
      const statements = sql.split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      return statements.reduce((promise, statement) => {
        return promise.then(() => pool.query(statement));
      }, Promise.resolve());
    },

    close() {
      return pool.end();
    }
  };
}

function transaction(db, fn) {
  const client = db.pool;
  
  return client.query('BEGIN')
    .then(() => Promise.resolve(fn()))
    .then(result => {
      return client.query('COMMIT').then(() => result);
    })
    .catch(err => {
      return client.query('ROLLBACK').then(() => {
        throw err;
      });
    });
}

module.exports = { openDb, transaction };
