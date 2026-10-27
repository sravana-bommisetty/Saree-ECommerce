'use strict';
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('./services/catalog');
const { getSettings } = require('./services/settings');

const STATIC_PAGES = ['/', '/shop', '/categories', '/about', '/contact', '/shipping-returns'];

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// JSON-LD is embedded in <script>; escape "<" so content can never close the tag.
const safeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

function robotsTxt(baseUrl) {
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /staff\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
}

function sitemapXml(db, baseUrl) {
  const urls = [
    ...STATIC_PAGES.map((p) => ({ loc: baseUrl + p })),
    ...catalog.listCategories(db, { includeEmpty: false }).map((c) => ({ loc: `${baseUrl}/shop?category=${encodeURIComponent(c.slug)}` })),
    ...catalog.listProducts(db, { limit: 100, sort: 'newest' }).items.map((p) => ({
      loc: `${baseUrl}/saree/${encodeURIComponent(p.slug)}`,
      lastmod: String(p.updated_at).slice(0, 10),
    })),
  ];
  const body = urls
    .map((u) => `  <url><loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function productPage(db, config, slug) {
  const p = catalog.getProduct(db, { slug });
  const s = getSettings(db);
  const url = `${config.baseUrl}/saree/${encodeURIComponent(p.slug)}`;
  const image = p.image_url ? config.baseUrl + p.image_url : `${config.baseUrl}/images/logo.svg`;
  const desc = `${p.name} – ${p.fabric} saree in ${p.color}. ${p.description}`.slice(0, 300);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku,
    image: p.images.map((i) => config.baseUrl + i.url),
    description: p.description,
    color: p.color,
    material: p.fabric,
    category: p.category_name || 'Sarees',
    brand: { '@type': 'Brand', name: s.store_name },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: p.price,
      availability: p.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
  const head = [
    `<title>${escapeHtml(p.name)} | ${escapeHtml(s.store_name)}</title>`,
    `<meta name="description" content="${escapeHtml(desc)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<meta property="og:type" content="product">`,
    `<meta property="og:title" content="${escapeHtml(p.name)}">`,
    `<meta property="og:description" content="${escapeHtml(desc)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<script type="application/ld+json">${safeJson(jsonLd)}</script>`,
  ].join('\n  ');
  const template = fs.readFileSync(path.join(config.publicDir, 'product.html'), 'utf8');
  return template.replace(/<title>.*?<\/title>/, '').replace('<!--SEO-->', head);
}

module.exports = { robotsTxt, sitemapXml, productPage, escapeHtml };
