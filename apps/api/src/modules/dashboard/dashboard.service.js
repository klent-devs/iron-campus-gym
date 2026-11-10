import {
  DEFAULT_REVENUE_RANGE,
  EXPIRING_SOON_DAYS,
  GYM_TIMEZONE,
  MEMBERSHIP_STATUS,
  STOCK_STATUS,
  addDays,
  addMonths,
  canEnter,
  capacityLevel,
  roundMoney,
  stockStatus,
  todayInGym,
} from '@icg/shared';

const DAY_MS = 86_400_000;
const ACTIVITY_LIMIT = 8;
/** "N expired in the past 7 days" on the Expired alert. */
export const RECENTLY_EXPIRED_DAYS = 7;

const DEFAULT_SETTINGS = {
  maxCapacity: null,
  warningPct: 90,
  expiringSoonDays: EXPIRING_SOON_DAYS,
};

const monthStartOf = (isoDate) => `${isoDate.slice(0, 7)}-01`;

/** 1st of this month → today. */
export function monthToDate(today) {
  return { from: monthStartOf(today), to: today };
}

/** The same days last month (1–10 Oct when today is 10 Nov), cut at the end of that month. */
export function samePeriodLastMonth(today) {
  const thisMonthStart = monthStartOf(today);
  const from = addMonths(thisMonthStart, -1);
  const dayOfMonth = Number(today.slice(8, 10));
  const lastDayOfPrevMonth = addDays(thisMonthStart, -1);
  const to = addDays(from, dayOfMonth - 1);
  return { from, to: to > lastDayOfPrevMonth ? lastDayOfPrevMonth : to };
}

/** First day of each month shown on the revenue chart, oldest first. */
export function chartMonths(range, today) {
  const current = monthStartOf(today);
  const count = range === 'ytd' ? Number(today.slice(5, 7)) : range === '6m' ? 6 : 12;
  return Array.from({ length: count }, (_, i) => addMonths(current, i - (count - 1)));
}

/** % change rounded to 1 decimal; null when there is nothing to compare with. */
export function percentChange(current, previous) {
  if (!previous || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function summarizeMembers(statusRows) {
  const by = Object.fromEntries(statusRows.map((r) => [r.status, r]));
  const count = (status) => by[status]?.count ?? 0;
  return {
    by,
    members: {
      total: statusRows.reduce((sum, r) => sum + r.count, 0),
      active: statusRows.filter((r) => canEnter(r.status)).reduce((sum, r) => sum + r.count, 0),
      expiringSoon: count(MEMBERSHIP_STATUS.EXPIRING_SOON),
      expired: count(MEMBERSHIP_STATUS.EXPIRED),
      suspended: count(MEMBERSHIP_STATUS.SUSPENDED),
    },
  };
}

function summarizeStock(items) {
  const low = [];
  const out = [];
  for (const item of items) {
    const status = stockStatus(item.quantity, item.reorderLevel);
    if (status === STOCK_STATUS.LOW_STOCK) low.push(item);
    if (status === STOCK_STATUS.OUT_OF_STOCK) out.push(item);
  }
  low.sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name));
  const pick = (item) => item && { name: item.name, quantity: item.quantity, unit: item.unit };
  return {
    lowCount: low.length,
    outCount: out.length,
    lowestItem: pick(low[0]) ?? null,
    outItem: pick(out[0]) ?? null,
  };
}

function toActivity(row) {
  return {
    id: `${row.type}:${row.id}`,
    type: row.type,
    at: new Date(row.at).toISOString(),
    name: row.name,
    details: row.details ?? {},
  };
}

/**
 * Builds everything the admin Dashboard shows.
 * @param {{ repo: ReturnType<typeof import('./dashboard.repo.js').createDashboardRepo>,
 *           timeZone?: string, now?: () => Date }} deps
 */
export function createDashboardService({ repo, timeZone = GYM_TIMEZONE, now = () => new Date() }) {
  async function getDashboard({ range = DEFAULT_REVENUE_RANGE, includeRevenue = false } = {}) {
    const current = now();
    const today = todayInGym(current, timeZone);
    const sameDayLastWeek = addDays(today, -7);
    const sameTimeLastWeek = new Date(current.getTime() - 7 * DAY_MS);
    const period = monthToDate(today);
    const comparePeriod = samePeriodLastMonth(today);
    const months = chartMonths(range, today);
    const skip = async () => null;

    const [
      settingsRow,
      statusRows,
      attendanceToday,
      attendanceLastWeek,
      walkInsToday,
      walkInsLastWeek,
      inside,
      activityRows,
      stockRows,
      revenueThisPeriod,
      revenueComparePeriod,
      monthlyRows,
      collectedToday,
    ] = await Promise.all([
      repo.getSettings(),
      repo.memberStatusCounts({ recentDays: RECENTLY_EXPIRED_DAYS }),
      repo.countMembersCheckedIn(today, current),
      repo.countMembersCheckedIn(sameDayLastWeek, sameTimeLastWeek),
      repo.countWalkIns(today, current),
      repo.countWalkIns(sameDayLastWeek, sameTimeLastWeek),
      repo.countInsideNow(today),
      repo.recentActivities(ACTIVITY_LIMIT),
      repo.stockItems(),
      includeRevenue ? repo.paidRevenue(period.from, period.to) : skip(),
      includeRevenue ? repo.paidRevenue(comparePeriod.from, comparePeriod.to) : skip(),
      includeRevenue
        ? repo.monthlyRevenue(months[0], addMonths(months[months.length - 1], 1))
        : skip(),
      includeRevenue ? repo.walkInCollected(today) : skip(),
    ]);

    const settings = { ...DEFAULT_SETTINGS, ...(settingsRow ?? {}) };
    const { by, members } = summarizeMembers(statusRows);
    const insideNow = inside.members + inside.walkIns;

    let revenue = null;
    let revenueChart = null;
    if (includeRevenue) {
      revenue = {
        thisPeriod: roundMoney(revenueThisPeriod),
        comparePeriodTotal: roundMoney(revenueComparePeriod),
        changePct: percentChange(revenueThisPeriod, revenueComparePeriod),
        period,
        comparePeriod,
      };
      const byMonth = Object.fromEntries(monthlyRows.map((r) => [r.month, r.revenue]));
      const chartRows = months.map((m) => ({
        month: m.slice(0, 7),
        revenue: roundMoney(byMonth[m.slice(0, 7)] ?? 0),
        // TODO(expenses): expenses are not recorded yet, so they are always 0.
        expenses: 0,
      }));
      const totalRevenue = roundMoney(chartRows.reduce((s, r) => s + r.revenue, 0));
      const totalExpenses = roundMoney(chartRows.reduce((s, r) => s + r.expenses, 0));
      revenueChart = {
        range,
        months: chartRows,
        totals: {
          revenue: totalRevenue,
          expenses: totalExpenses,
          net: roundMoney(totalRevenue - totalExpenses),
        },
        expensesTracked: false,
      };
    }

    return {
      generatedAt: current.toISOString(),
      today,
      timeZone,
      includesRevenue: includeRevenue,
      members,
      revenue,
      attendance: {
        today: attendanceToday,
        sameDayLastWeek: attendanceLastWeek,
        change: attendanceToday - attendanceLastWeek,
        compareDate: sameDayLastWeek,
      },
      walkIns: {
        today: walkInsToday,
        sameDayLastWeek: walkInsLastWeek,
        change: walkInsToday - walkInsLastWeek,
        compareDate: sameDayLastWeek,
        collectedToday: includeRevenue ? roundMoney(collectedToday) : null,
      },
      revenueChart,
      capacity: {
        insideNow,
        membersInside: inside.members,
        walkInsInside: inside.walkIns,
        maxCapacity: settings.maxCapacity,
        warningPct: settings.warningPct,
        ...capacityLevel({
          inside: insideNow,
          max: settings.maxCapacity,
          warningPct: settings.warningPct,
        }),
      },
      activities: activityRows.map(toActivity),
      alerts: {
        expiringSoon: {
          count: members.expiringSoon,
          withinDays: settings.expiringSoonDays,
          endingToday: by[MEMBERSHIP_STATUS.EXPIRING_SOON]?.ending_today ?? 0,
          endingTomorrow: by[MEMBERSHIP_STATUS.EXPIRING_SOON]?.ending_tomorrow ?? 0,
        },
        expired: {
          count: members.expired,
          recent: by[MEMBERSHIP_STATUS.EXPIRED]?.ended_recently ?? 0,
          recentDays: RECENTLY_EXPIRED_DAYS,
        },
        stock: summarizeStock(stockRows),
      },
    };
  }

  return { getDashboard };
}
