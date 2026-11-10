import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDb, db } from './config/db.js';

const app = createApp({ db, adminOrigin: env.ADMIN_ORIGIN, timeZone: env.GYM_TIMEZONE });

const server = app.listen(env.API_PORT, env.API_HOST, () => {
  console.log(`IRON CAMPUS GYM API running on http://${env.API_HOST}:${env.API_PORT}`);
  if (!db) console.warn('DATABASE_URL is not set — copy .env.example to .env and fill it in.');
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down…`);
  server.close();
  await closeDb();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
