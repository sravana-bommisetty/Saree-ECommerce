'use strict';
const { loadConfig } = require('./config');
const { openDb } = require('./db');
const { createApp } = require('./app');

const config = loadConfig();
const db = openDb(config.dbFile);
const app = createApp({ db, config });

const server = app.listen(config.port, () => {
  console.log(`Abhinayam Silks running at http://localhost:${config.port}  (admin: /admin, staff: /staff)`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
