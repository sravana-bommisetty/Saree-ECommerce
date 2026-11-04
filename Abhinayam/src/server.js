'use strict';
const { loadConfig } = require('./config');
const { openDb } = require('./db');
const { createApp } = require('./app');

const config = loadConfig();
const db = openDb(config.databaseUrl);

async function start() {
  try {
    // Initialize PostgreSQL connection
    await db.__init();

    const app = await createApp({ db, config });

    const server = app.listen(config.port, () => {
      console.log(`Abhinayam Silks running at http://localhost:${config.port}`);
      console.log(`Admin: /admin, Staff: /staff`);
    });

    function shutdown() {
      server.close(() => {
        const closeResult = db.close();
        // Handle async close
        if (closeResult && typeof closeResult.then === 'function') {
          closeResult.then(() => {
            console.log('Database connection closed');
            process.exit(0);
          }).catch(err => {
            console.error('Error closing database:', err);
            process.exit(1);
          });
        } else {
          process.exit(0);
        }
      });
    }
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start application:', err.message || err);
    // AggregateError (e.g. failed DB connection) has an empty top-level message.
    if (err.errors) {
      for (const sub of err.errors) console.error('  -', sub.message);
    }
    await db.close();
    process.exit(1);
  }
}

start();
