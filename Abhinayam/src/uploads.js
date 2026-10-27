'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const { badRequest } = require('./lib/validate');

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const URL_PREFIX = '/uploads/';

function createUploader(uploadDir) {
  fs.mkdirSync(uploadDir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 8 },
    fileFilter: (_req, file, cb) =>
      ALLOWED[file.mimetype] ? cb(null, true) : cb(badRequest('Only JPG, PNG or WEBP images are allowed')),
  });
}

const fileUrls = (req) => (req.files || (req.file ? [req.file] : [])).map((f) => URL_PREFIX + f.filename);

function removeUpload(uploadDir, url) {
  if (typeof url !== 'string' || !url.startsWith(URL_PREFIX)) return;
  const file = path.join(uploadDir, path.basename(url));
  try {
    fs.rmSync(file, { force: true });
  } catch (err) {
    console.warn(`[uploads] Could not delete ${file}: ${err.message}`);
  }
}

module.exports = { createUploader, fileUrls, removeUpload };
