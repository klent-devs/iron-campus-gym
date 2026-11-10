import { ROLES, dashboardQuerySchema } from '@icg/shared';

export function createDashboardController({ service }) {
  return {
    /** GET /api/dashboard?range=12m|6m|ytd */
    async get(req, res) {
      const { range } = dashboardQuerySchema.parse(req.query);
      // Receptionists don't see revenue (gym rule), so it is left out of the response entirely.
      const includeRevenue = req.staff?.role === ROLES.OWNER;
      const data = await service.getDashboard({ range, includeRevenue });
      res.set('Cache-Control', 'no-store').json(data);
    },
  };
}
