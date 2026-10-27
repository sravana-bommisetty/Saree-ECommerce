'use strict';
const { str } = require('../lib/validate');

const CONTENT_DEFAULTS = {
  tagline: 'Timeless silks, woven with tradition',
  email: 'hello@abhinayamsilks.com',
  phone_display: '+91 99999 99999',
  address: 'Abhinayam Silks, Main Road, Your City, Tamil Nadu, India',
  business_hours: 'Mon – Sat, 10:00 AM – 8:00 PM',
  about_text:
    'Abhinayam Silks brings you handpicked silk sarees sourced directly from master weavers across India. ' +
    'Every saree is chosen for its craftsmanship, purity of silk and timeless design – so you can celebrate every occasion in elegance.',
  delivery_info:
    'Free shipping across India on orders above ₹5,000. Orders are dispatched within 2–3 working days after payment confirmation. ' +
    'Delivery usually takes 4–7 working days depending on your location.',
  shipping_policy:
    'All orders are shipped via trusted courier partners with tracking. Tracking details are shared on WhatsApp once dispatched. ' +
    'International shipping is available on request – please contact us on WhatsApp.',
  return_policy:
    'We accept returns or exchanges within 7 days of delivery for unused sarees with original tags and packaging. ' +
    'Please record an unboxing video – damage claims require it. Refunds are processed to the original UPI account within 5–7 working days after inspection. ' +
    'Sale items and customised sarees are not eligible for return.',
  meta_description:
    'Shop authentic Kanjivaram, Banarasi, soft silk and tussar sarees online at Abhinayam Silks. Order easily on WhatsApp and pay via UPI.',
};

const EDITABLE_KEYS = [
  'store_name', 'whatsapp_number', 'upi_id', 'upi_payee_name', 'instagram_url',
  ...Object.keys(CONTENT_DEFAULTS),
];

function ensureSettings(db, defaults) {
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries({ ...defaults, ...CONTENT_DEFAULTS })) insert.run(key, value);
}

function getSettings(db) {
  const out = {};
  for (const row of db.prepare('SELECT key, value FROM settings').all()) out[row.key] = row.value;
  return out;
}

function updateSettings(db, input) {
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  for (const key of EDITABLE_KEYS) {
    if (input[key] !== undefined) upsert.run(key, str(input[key], key, { max: 5000 }));
  }
  return getSettings(db);
}

module.exports = { ensureSettings, getSettings, updateSettings, EDITABLE_KEYS };
