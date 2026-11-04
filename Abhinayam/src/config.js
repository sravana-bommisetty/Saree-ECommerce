'use strict';
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');

function loadConfig(env = process.env) {
  const isProd = env.NODE_ENV === 'production';
  
  // DATABASE_URL is now REQUIRED (for both dev and prod)
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is required.\n' +
      'Set your PostgreSQL/Neon connection string:\n' +
      'export DATABASE_URL="postgresql://user:password@host/dbname"'
    );
  }
  
  let sessionSecret = env.SESSION_SECRET;
  if (!sessionSecret) {
    if (isProd) throw new Error('SESSION_SECRET must be set in production');
    sessionSecret = crypto.randomBytes(32).toString('hex');
  }
  
  return {
    isProd,
    port: Number(env.PORT) || 3000,
    baseUrl: (env.PUBLIC_BASE_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${Number(env.PORT) || 3000}`).replace(/\/$/, ''),
    databaseUrl,  // ALWAYS use PostgreSQL
    uploadDir: path.resolve(ROOT, env.UPLOAD_DIR || 'uploads'),
    publicDir: path.join(ROOT, 'public'),
    sessionSecret,
    aws: env.AWS_BUCKET_NAME ? {
      bucket: env.AWS_BUCKET_NAME,
      region: env.AWS_REGION || 'us-east-2',
      endpoint: env.AWS_ENDPOINT_URL_S3,
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    } : null,
    admin: {
      username: env.ADMIN_USERNAME || 'admin',
      password: env.ADMIN_PASSWORD || '',
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
