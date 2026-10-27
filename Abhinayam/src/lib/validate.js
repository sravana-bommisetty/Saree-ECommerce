'use strict';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (msg) => new HttpError(400, msg);
const notFound = (msg = 'Not found') => new HttpError(404, msg);

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function str(value, field, { required = false, max = 500 } = {}) {
  const v = value === undefined || value === null ? '' : String(value).trim();
  if (required && !v) throw badRequest(`${field} is required`);
  if (v.length > max) throw badRequest(`${field} must be at most ${max} characters`);
  return v;
}

function num(value, field, { required = false, min = 0, integer = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${field} is required`);
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || (integer && !Number.isInteger(n))) {
    throw badRequest(`${field} must be ${integer ? 'an integer' : 'a number'} >= ${min}`);
  }
  return n;
}

function bool(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on' ? 1 : 0;
}

function phone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) throw badRequest('A valid phone number is required');
  return digits;
}

function oneOf(value, field, allowed) {
  if (!allowed.includes(value)) throw badRequest(`${field} must be one of: ${allowed.join(', ')}`);
  return value;
}

module.exports = { HttpError, badRequest, notFound, slugify, str, num, bool, phone, oneOf };
