/**
 * The Dashboard's numbers from the sample data, in the same shape as GET /api/dashboard
 * (docs/api.md), so the Dashboard page works the same with either.
 * TODO(api): the Dashboard goes back to the API when the API has the real data.
 */
import {
  DEFAULT_REVENUE_RANGE,
  MEMBERSHIP_STATUS,
  STOCK_STATUS,
  addDays,
  addMonths,
  canEnter,
  capacityLevel,
  daysBetween,
  roundMoney,
  stockStatus,
  todayInGym,
} from '@icg/shared';
import { monthRevenue } from './records.js';
import { dayOf, indexes, membersView, staffName } from './selectors.js';

const DAY_MS = 86_400_000;
const RECENT_EXPIRED_DAYS = 7;
const EXPIRING_DAYS = 7;

const monthStartOf = (d) => `${d.slice(0, 7)}-01`;

function samePeriodLastMonth(today) {
  const thisMonthStart = monthStartOf(today);
  const from = addMonths(thisMonthStart, -1);
  const lastDayPrev = addDays(thisMonthStart, -1);
  const to = addDays(from, Number(today.slice(8, 10)) - 1);
  return { from, to: to > lastDayPrev ? lastDayPrev : to };
}

function chartMonths(range, today) {
  const current = monthStartOf(today);
  const count = range === 'ytd' ? Number(today.slice(5, 7)) : range === '6m' ? 6 : 12;
  return Array.from({ length: count }, (_, i) => addMonths(current, i - (count - 1)).slice(0, 7));
}

function percentChange(current, previous) {
  if (!previous || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const paidBetween = (state, from, to) =>
  roundMoney(
    state.payments
      .filter((p) => p.status === 'paid' && dayOf(p.at) >= from && dayOf(p.at) <= to)
      .reduce((s, p) => s + p.amount, 0),
  );

/**
 * @param {object} state  sample data
 * @param {{ range?: string, includeRevenue?: boolean, now?: Date }} options
 */
export function buildDashboard(
  state,
  { range = DEFAULT_REVENUE_RANGE, includeRevenue = true, now = new Date() } = {},
) {
  const today = todayInGym(now);
  const lastWeekDay = addDays(today, -7);
  const lastWeekTime = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const nowIso = now.toISOString();
  const ix = indexes(state);
  const members = membersView(state, today);

  const count = (status) => members.filter((m) => m.status === status).length;
  const memberCounts = {
    total: members.length,
    active: members.filter((m) => canEnter(m.status)).length,
    expiringSoon: count(MEMBERSHIP_STATUS.EXPIRING_SOON),
    expired: count(MEMBERSHIP_STATUS.EXPIRED),
    suspended: count(MEMBERSHIP_STATUS.SUSPENDED),
  };

  const membersIn = (date, until) =>
    new Set(
      state.checkIns
        .filter((c) => dayOf(c.timeIn) === date && c.timeIn <= until)
        .map((c) => c.memberId),
    ).size;
  const walkInsOn = (date, until) =>
    state.visits.filter((v) => dayOf(v.timeIn) === date && v.timeIn <= until).length;
  const attendanceToday = membersIn(today, nowIso);
  const attendanceLastWeek = membersIn(lastWeekDay, lastWeekTime);
  const walkToday = walkInsOn(today, nowIso);
  const walkLastWeek = walkInsOn(lastWeekDay, lastWeekTime);

  const membersInside = state.checkIns.filter(
    (c) => !c.timeOut && dayOf(c.timeIn) === today,
  ).length;
  const walkInsInside = state.visits.filter((v) => !v.timeOut && dayOf(v.timeIn) === today).length;
  const insideNow = membersInside + walkInsInside;
  const { maxCapacity, warningPct, opensAt, closesAt } = state.settings;

  let revenue = null;
  let revenueChart = null;
  let collectedToday = null;
  if (includeRevenue) {
    const period = { from: monthStartOf(today), to: today };
    const comparePeriod = samePeriodLastMonth(today);
    const thisPeriod = paidBetween(state, period.from, period.to);
    const compare =
      comparePeriod.from >= state.meta.historyStart
        ? paidBetween(state, comparePeriod.from, comparePeriod.to)
        : monthRevenue(
            state,
            comparePeriod.from.slice(0, 7),
            new Date(`${comparePeriod.to}T15:59:59Z`),
          );
    revenue = {
      thisPeriod,
      comparePeriodTotal: compare,
      changePct: percentChange(thisPeriod, compare),
      period,
      comparePeriod,
    };
    const months = chartMonths(range, today).map((month) => ({
      month,
      revenue: monthRevenue(state, month, now),
      expenses: 0,
    }));
    const total = roundMoney(months.reduce((s, m) => s + m.revenue, 0));
    revenueChart = {
      range,
      months,
      totals: { revenue: total, expenses: 0, net: total },
      expensesTracked: false,
    };
    collectedToday = roundMoney(
      state.payments
        .filter((p) => p.type === 'walkin' && p.status === 'paid' && dayOf(p.at) === today)
        .reduce((s, p) => s + p.amount, 0),
    );
  }

  // Recent activities: newest 8 of registrations, check-ins/outs, walk-ins and payments.
  const since = new Date(now.getTime() - 3 * DAY_MS).toISOString();
  const activities = [];
  for (const c of state.checkIns) {
    const m = ix.member.get(c.memberId);
    if (c.timeIn >= since) {
      activities.push({
        id: `check_in:${c.id}`,
        type: 'check_in',
        at: c.timeIn,
        name: m?.name,
        details: { memberCode: m?.code, method: 'qr' },
      });
    }
    if (c.timeOut && c.timeOut >= since && !c.fix) {
      activities.push({
        id: `check_out:${c.id}`,
        type: 'check_out',
        at: c.timeOut,
        name: m?.name,
        details: { memberCode: m?.code, checkInAt: c.timeIn },
      });
    }
  }
  for (const v of state.visits) {
    if (v.timeIn < since) continue;
    const p = ix.payment.get(v.paymentId);
    activities.push({
      id: `walk_in:${v.id}`,
      type: 'walk_in',
      at: v.timeIn,
      name: ix.customer.get(v.customerId)?.name,
      details: {
        feeType: v.feeType,
        fee: v.fee,
        paymentMethod: p?.status === 'pending' ? null : (p?.method ?? null),
      },
    });
  }
  for (const p of state.payments) {
    if (p.at < since || p.type === 'walkin') continue;
    if (p.type === 'membership_new') {
      const sub = p.subscriptionId ? ix.sub.get(p.subscriptionId) : null;
      const staff = ix.staff.get(p.staffId);
      activities.push({
        id: `registration:${p.id}`,
        type: 'registration',
        at: p.at,
        name: p.customerName,
        details: {
          memberCode: ix.member.get(p.memberId)?.code,
          planName: sub?.planName ?? p.description.replace(/ membership$/, ''),
          staffName: staffName(state, p.staffId),
          staffRole: staff?.role,
        },
      });
    } else if (includeRevenue) {
      activities.push({
        id: `payment:${p.id}`,
        type: 'payment',
        at: p.at,
        name: p.customerName,
        details: {
          amount: p.amount,
          paymentType: p.type,
          transactionNo: p.txnNo,
          paymentMethod: p.method,
        },
      });
    }
  }
  activities.sort((a, b) => b.at.localeCompare(a.at));

  const expiring = members.filter((m) => m.status === MEMBERSHIP_STATUS.EXPIRING_SOON);
  const expired = members.filter((m) => m.status === MEMBERSHIP_STATUS.EXPIRED);
  const low = [];
  const out = [];
  for (const item of state.items) {
    const s = stockStatus(item.quantity, item.reorderLevel);
    if (s === STOCK_STATUS.LOW_STOCK) low.push(item);
    if (s === STOCK_STATUS.OUT_OF_STOCK) out.push(item);
  }
  low.sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name));
  const brief = (item) => item && { name: item.name, quantity: item.quantity, unit: item.unit };

  // Front desk (the Receptionist's Dashboard): who is inside now, unpaid walk-ins and check-ins
  // left open from an earlier day. No money totals except what is still owed.
  const memberById = new Map(members.map((m) => [m.id, m]));
  const unpaid = (visit) => {
    const p = ix.payment.get(visit.paymentId);
    return Boolean(p && p.status === 'pending' && !p.method);
  };
  const inside = [
    ...state.checkIns
      .filter((c) => !c.timeOut && dayOf(c.timeIn) === today)
      .map((c) => {
        const m = memberById.get(c.memberId);
        return {
          key: `member:${c.id}`,
          kind: 'member',
          checkInId: c.id,
          memberId: c.memberId,
          name: m?.name ?? 'Member',
          detail: [m?.code, m?.plan].filter(Boolean).join(' · '),
          timeIn: c.timeIn,
          unpaid: false,
        };
      }),
    ...state.visits
      .filter((v) => !v.timeOut && dayOf(v.timeIn) === today)
      .map((v) => ({
        key: `walkin:${v.id}`,
        kind: 'walkin',
        visitId: v.id,
        name: ix.customer.get(v.customerId)?.name ?? 'Walk-in',
        detail: `Walk-in · ${v.feeType === 'student' ? 'Student' : 'Regular'} rate`,
        timeIn: v.timeIn,
        unpaid: unpaid(v),
      })),
  ].sort((a, b) => b.timeIn.localeCompare(a.timeIn));
  const unpaidVisits = state.visits.filter(unpaid).sort((a, b) => a.timeIn.localeCompare(b.timeIn));
  const missed = state.checkIns
    .filter((c) => !c.timeOut && dayOf(c.timeIn) < today)
    .sort((a, b) => a.timeIn.localeCompare(b.timeIn));

  return {
    generatedAt: nowIso,
    today,
    timeZone: 'Asia/Manila',
    includesRevenue: includeRevenue,
    gymHours: { opensAt, closesAt },
    members: memberCounts,
    revenue,
    attendance: {
      today: attendanceToday,
      sameDayLastWeek: attendanceLastWeek,
      change: attendanceToday - attendanceLastWeek,
      compareDate: lastWeekDay,
    },
    walkIns: {
      today: walkToday,
      sameDayLastWeek: walkLastWeek,
      change: walkToday - walkLastWeek,
      compareDate: lastWeekDay,
      collectedToday,
    },
    revenueChart,
    capacity: {
      insideNow,
      membersInside,
      walkInsInside,
      maxCapacity: state.settings.showCapacity ? maxCapacity : null,
      warningPct,
      ...capacityLevel({
        inside: insideNow,
        max: state.settings.showCapacity ? maxCapacity : null,
        warningPct,
      }),
    },
    activities: activities.slice(0, 8),
    frontDesk: {
      inside,
      unpaidWalkIns: {
        count: unpaidVisits.length,
        amount: roundMoney(unpaidVisits.reduce((sum, v) => sum + v.fee, 0)),
        first: unpaidVisits[0]
          ? {
              name: ix.customer.get(unpaidVisits[0].customerId)?.name ?? 'Walk-in',
              timeIn: unpaidVisits[0].timeIn,
            }
          : null,
      },
      missedCheckOuts: {
        count: missed.length,
        names: missed.map((c) => ix.member.get(c.memberId)?.name).filter(Boolean),
      },
    },
    alerts: {
      expiringSoon: {
        count: expiring.length,
        withinDays: EXPIRING_DAYS,
        endingToday: expiring.filter((m) => m.endDate === today).length,
        endingTomorrow: expiring.filter((m) => m.endDate === addDays(today, 1)).length,
      },
      expired: {
        count: expired.length,
        recent: expired.filter((m) => daysBetween(m.endDate, today) <= RECENT_EXPIRED_DAYS).length,
        recentDays: RECENT_EXPIRED_DAYS,
      },
      stock: {
        lowCount: low.length,
        outCount: out.length,
        lowestItem: brief(low[0]) ?? null,
        outItem: brief(out[0]) ?? null,
      },
    },
  };
}
