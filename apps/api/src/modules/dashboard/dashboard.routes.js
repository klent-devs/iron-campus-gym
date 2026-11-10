import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireDatabase } from '../../middleware/requireDatabase.js';
import { createDashboardController } from './dashboard.controller.js';

/**
 * GET /api/dashboard — summary cards, revenue chart, capacity, recent activities and alerts.
 * @param {{ service: ReturnType<typeof import('./dashboard.service.js').createDashboardService> | null }} deps
 */
export function dashboardRoutes({ service }) {
  const router = Router();
  const controller = createDashboardController({ service });

  router.get('/', requireDatabase(Boolean(service)), asyncHandler(controller.get));

  return router;
}
