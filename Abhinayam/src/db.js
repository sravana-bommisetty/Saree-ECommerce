'use strict';
const { Pool, types } = require('pg');
const { AsyncLocalStorage } = require('node:async_hooks');
const fs = require('node:fs/promises');
const path = require('node:path');

const transactions = new AsyncLocalStorage();

function placeholders(sql) {
  let index = 0;
  return sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\$([A-Za-z_][A-Za-z_0-9]*)?\$[\s\S]*?\$\1\$|--[^\n]*|\/\*[\s\S]*?\*\/|\?/g,
    (token) => token === '?' ? `$${++index}` : token);
}

/**
 * Open PostgreSQL database connection
 * ALWAYS uses PostgreSQL (both development and production)
 * @param {string} databaseUrl - PostgreSQL connection string (required)
 * @returns {Object} Database instance with prepare(), exec(), close()
 */
function openDb(databaseUrl) {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is required.\n' +
      'Set your Neon PostgreSQL connection string:\n' +
      'DATABASE_URL=postgresql://...'
    );
  }

  const db = {
    __isPostgres: true,
    __client: null,
    __initialized: false,
    
    async __init() {
      if (this.__initialized) return;
      console.log('🔄 Initializing PostgreSQL connection...');
      this.__client = new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 30000,  // Increased to 30 seconds
        idleTimeoutMillis: 30000,
        max: 20,
        types: {
          getTypeParser(oid, format) {
            if (oid === 20 || oid === 1700) return Number;
            if (oid === 1114 || oid === 1184) return (value) => value;
            return types.getTypeParser(oid, format);
          },
        },
      });
      try {
        console.log('🔄 Testing connection (timeout: 25s)...');
        const testResult = await Promise.race([
          this.__client.query('SELECT 1'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout after 25 seconds')), 25000))
        ]);
        console.log('✅ Database connection established');
        
        console.log('🔄 Applying schema...');
        const schema = await fs.readFile(path.join(__dirname, '../db/schema-postgres.sql'), 'utf8');
        await this.__client.query(schema);
        this.__initialized = true;
        console.log('✅ Schema applied successfully');
      } catch (error) {
        if (this.__client) {
          await this.__client.end();
          this.__client = null;
        }
        throw error;
      }
      console.log('✅ Connected to PostgreSQL');
    },

    async query(sql, params) {
      if (!this.__initialized) throw new Error('Database not initialized. Call await db.__init() first');
      const current = transactions.getStore();
      const client = current?.db === this ? current.client : this.__client;
      return client.query(sql, params);
    },

    prepare(sql) {
      const self = this;
      const text = placeholders(sql);
      
      return {
        async get(...params) {
          const res = await self.query(text, params);
          return res.rows[0] || null;
        },
        
        async all(...params) {
          const res = await self.query(text, params);
          return res.rows;
        },
        
        async run(...params) {
          const res = await self.query(text, params);
          return {
            changes: res.rowCount,
            lastInsertRowid: res.rows[0]?.id
          };
        }
      };
    },

    async exec(sql) {
      await this.query(sql);
    },

    close() {
      if (this.__client && this.__initialized) {
        return this.__client.end();
      }
      return Promise.resolve();
    }
  };
  
  return db;
}

/**
 * Transaction support for PostgreSQL
 */
async function transaction(db, fn) {
  const client = await db.__client.connect();
  try {
    await client.query('BEGIN');
    const result = await transactions.run({ db, client }, fn);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { openDb, transaction };

