/** Date ranges for the dashboard's Revenue Analytics chart. */
export const REVENUE_RANGES = Object.freeze({
  '12m': { label: 'Last 12 months', totalLabel: '12-month revenue' },
  ytd: { label: 'This year', totalLabel: 'Revenue this year' },
  '6m': { label: 'Last 6 months', totalLabel: '6-month revenue' },
});

export const REVENUE_RANGE_LIST = Object.keys(REVENUE_RANGES);

export const DEFAULT_REVENUE_RANGE = '12m';
