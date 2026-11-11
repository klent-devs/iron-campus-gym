import { z } from 'zod';
import { DEFAULT_REVENUE_RANGE, REVENUE_RANGE_LIST } from '../constants/reports.js';

/** Query string for GET /api/dashboard */
export const dashboardQuerySchema = z.object({
  range: z
    .enum(REVENUE_RANGE_LIST, { error: 'Choose a valid date range' })
    .default(DEFAULT_REVENUE_RANGE),
});
