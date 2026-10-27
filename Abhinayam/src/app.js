'use strict';
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { publicRoutes } = require('./routes/public');
const { adminRoutes } = require('./routes/admin');
const { ensureSettings } = require('./services/settings');
const { ensureAdmin } = require('./auth');
const seo = require('./seo');
const { HttpError } = require('./lib/validate');

function createApp({ db, config }) {
  ensureSettings(db, config.defaults);
  ensureAdmin(db, config.admin);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      hsts: config.isProd,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: config.isProd ? [] : null,
        },
      },
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(
    session({
      name: 'abhinayam.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: 8 * 60 * 60 * 1000 },
    })
  );

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/admin', adminRoutes(db, config));
  app.use('/api', publicRoutes(db));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  app.get('/robots.txt', (_req, res) => res.type('text/plain').send(seo.robotsTxt(config.baseUrl)));
  app.get('/sitemap.xml', (_req, res) => res.type('application/xml').send(seo.sitemapXml(db, config.baseUrl)));
  app.get('/saree/:slug', (req, res) => res.type('html').send(seo.productPage(db, config, req.params.slug)));

  // Staff portal shares the admin single-page app; admin.js adapts to the URL.
  app.get(['/staff', '/staff/'], (_req, res) => res.sendFile('admin/index.html', { root: config.publicDir }));

  app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d', fallthrough: false }));
  app.use(express.static(config.publicDir, { extensions: ['html'], maxAge: config.isProd ? '1h' : 0 }));

  app.use((req, res) => res.status(404).sendFile('404.html', { root: config.publicDir }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    let status = err instanceof HttpError ? err.status : err.status || err.statusCode || 500;
    let message = err.message;
    if (err.name === 'MulterError') { status = 400; }
    if (/UNIQUE constraint failed/.test(err.message)) {
      status = 409;
      message = `An item with the same ${err.message.split('.').pop()} already exists`;
    }
    if (status >= 500) {
      console.error(err);
      message = 'Something went wrong. Please try again.';
    }
    if (req.path.startsWith('/api/')) return res.status(status).json({ error: message });
    if (status === 404) return res.status(404).sendFile('404.html', { root: config.publicDir });
    res.status(status).type('text').send(message);
  });

  return app;
}

module.exports = { createApp };
