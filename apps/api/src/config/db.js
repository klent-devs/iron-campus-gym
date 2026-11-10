import knex from 'knex';
import config from '../../knexfile.js';
import './pgTypes.js';

/**
 * Shared Knex instance. `null` when DATABASE_URL is not set yet, so the API can still
 * start and report "not configured" on /api/health instead of crashing.
 */
export const db = config.connection ? knex(config) : null;

export async function closeDb() {
  if (db) await db.destroy();
}
