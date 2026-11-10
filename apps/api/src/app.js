import { GYM_TIMEZONE } from '@icg/shared';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { staffContext as defaultStaffContext } from './middleware/staffContext.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { createDashboardRepo } from './modules/dashboard/dashboard.repo.js';
import { createDashboardService } from './modules/dashboard/dashboard.service.js';
import { healthRoutes } from './modules/health/health.routes.js';

/**
 * Builds the Express app. Dependencies are passed in so tests can use a fake database.
 * New modules (members, attendance, payments…) are mounted under /api as they are built.
 *
 * @param {object} [options]
 * @param {import('knex').Knex|null} [options.db]
 * @param {string} [options.adminOrigin]
 * @param {string} [options.timeZone]
 * @param {{ dashboard?: object }} [options.services] override module services (tests)
 * @param {import('express').RequestHandler} [options.staffContext] sets req.staff (tests)
 */
export function createApp({
  db = null,
  adminOrigin = 'http://localhost:5173',
  timeZone = GYM_TIMEZONE,
  services = {},
  staffContext = defaultStaffContext,
} = {}) {
  const app = express();

  const dashboard =
    services.dashboard ??
    (db ? createDashboardService({ repo: createDashboardRepo(db, { timeZone }), timeZone }) : null);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: adminOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRoutes({ db }));

  app.use('/api', staffContext);
  app.use('/api/dashboard', dashboardRoutes({ service: dashboard }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
