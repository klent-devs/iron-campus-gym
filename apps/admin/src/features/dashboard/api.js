import { buildDashboard } from '@icg/demo-data';
import { demo } from '../../lib/demo.js';

/**
 * Dashboard numbers. SAMPLE DATA: worked out in the browser from the sample data, in the same
 * shape as GET /api/dashboard (docs/api.md). Receptionists get no revenue (`includeRevenue`).
 * TODO(api): go back to `apiGet(`/dashboard?range=…`)` (lib/apiClient.js) when the API has the data.
 */
export async function getDashboard(range, { includeRevenue = false } = {}) {
  return buildDashboard(demo.getState(), { range, includeRevenue, now: new Date() });
}
