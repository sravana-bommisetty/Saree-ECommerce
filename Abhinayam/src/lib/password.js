'use strict';
const crypto = require('node:crypto');

const KEY_LEN = 64;
const MIN_LENGTH = 8;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

const isStrongEnough = (password) => typeof password === 'string' && password.length >= MIN_LENGTH;

module.exports = { hashPassword, verifyPassword, isStrongEnough, MIN_LENGTH };
