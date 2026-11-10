import { apiGet } from '../../lib/apiClient.js';

/** GET /api/dashboard — see docs/api.md for the response. */
export function getDashboard(range, signal) {
  return apiGet(`/dashboard?range=${encodeURIComponent(range)}`, { signal });
}
