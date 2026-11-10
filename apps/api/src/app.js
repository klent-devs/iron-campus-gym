import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { healthRoutes } from './modules/health/health.routes.js';

/**
 * Builds the Express app. Dependencies are passed in so tests can use a fake database.
 * New modules (members, attendance, payments…) are mounted under /api as they are built.
 */
export function createApp({ db = null, adminOrigin = 'http://localhost:5173' } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: adminOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRoutes({ db }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
