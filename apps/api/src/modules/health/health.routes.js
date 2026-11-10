import { Router } from 'express';

/**
 * GET /api/health — used by the admin website's status dot and by deployment checks.
 * @param {{ db: import('knex').Knex | null }} deps
 */
export function healthRoutes({ db }) {
  const router = Router();

  router.get('/', async (_req, res) => {
    let database = 'not_configured';
    if (db) {
      try {
        await db.raw('select 1');
        database = 'up';
      } catch {
        database = 'down';
      }
    }
    res.status(database === 'down' ? 503 : 200).json({
      status: database === 'down' ? 'degraded' : 'ok',
      service: 'iron-campus-gym-api',
      database,
      time: new Date().toISOString(),
    });
  });

  return router;
}
