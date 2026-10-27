'use strict';
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');

function loadConfig(env = process.env) {
  const isProd = env.NODE_ENV === 'production';
  let sessionSecret = env.SESSION_SECRET;
  if (!sessionSecret) {
    if (isProd) throw new Error('SESSION_SECRET must be set in production');
    sessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return {
    isProd,
    port: Number(env.PORT) || 3000,
    baseUrl: (env.PUBLIC_BASE_URL || `http://localhost:${Number(env.PORT) || 3000}`).replace(/\/$/, ''),
    dbFile: env.DB_FILE === ':memory:' ? ':memory:' : path.resolve(ROOT, env.DB_FILE || 'data/abhinayam.db'),
    uploadDir: path.resolve(ROOT, env.UPLOAD_DIR || 'uploads'),
    publicDir: path.join(ROOT, 'public'),
    sessionSecret,
    admin: {
      username: env.ADMIN_USERNAME || 'admin',
      password: env.ADMIN_PASSWORD || (isProd ? '' : 'ChangeMe@123'),
    },
    defaults: {
      store_name: 'Abhinayam Silks',
      whatsapp_number: env.WHATSAPP_NUMBER || '919999999999',
      upi_id: env.UPI_ID || 'abhinayamsilks@upi',
      upi_payee_name: env.UPI_PAYEE_NAME || 'Abhinayam Silks',
      instagram_url: env.INSTAGRAM_URL || 'https://www.instagram.com/abhinayamsilks',
    },
  };
}

module.exports = { loadConfig, ROOT };
