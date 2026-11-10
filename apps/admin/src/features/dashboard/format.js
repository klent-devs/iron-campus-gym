/**
 * Turns dashboard API data into the words shown on screen. Pure functions (tested in
 * apps/admin/tests/dashboard-format.test.js); all money/date formatting goes through @icg/shared.
 */
import {
  CAPACITY_LEVEL,
  PAYMENT_TYPE_LABELS,
  ROLES,
  formatDate,
  formatDuration,
  formatPeso,
  formatTime,
  todayInGym,
} from '@icg/shared';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "1 membership" / "21 memberships" */
export function plural(count, singular, pluralWord = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

/** Whole-number change: ▲ 11 / ▼ 3 / No change */
export function formatChange(change) {
  if (change > 0) return { text: `▲ ${change}`, tone: 'up' };
  if (change < 0) return { text: `▼ ${Math.abs(change)}`, tone: 'down' };
  return { text: 'No change', tone: 'neutral' };
}

/** % change: ▲ 8.4% / ▼ 2.0% / No change; null when there is nothing to compare with. */
export function formatPercentChange(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct > 0) return { text: `▲ ${pct.toFixed(1)}%`, tone: 'up' };
  if (pct < 0) return { text: `▼ ${Math.abs(pct).toFixed(1)}%`, tone: 'down' };
  return { text: 'No change', tone: 'neutral' };
}

/** { from: '2026-10-01', to: '2026-10-10' } → "1–10 Oct" (or "1 Oct" for a single day). */
export function formatDayRange({ from, to }) {
  const month = MONTHS_SHORT[Number(from.slice(5, 7)) - 1];
  const a = Number(from.slice(8, 10));
  const b = Number(to.slice(8, 10));
  return a === b ? `${a} ${month}` : `${a}–${b} ${month}`;
}

/** '2026-11-03' → 'Tuesday' */
export function weekdayName(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** '2026-11' → 'Nov' (axis) and 'November 2026' (tooltip). */
export function monthLabels(month) {
  const index = Number(month.slice(5, 7)) - 1;
  return { short: MONTHS_SHORT[index], long: `${MONTHS_LONG[index]} ${month.slice(0, 4)}` };
}

/** "10:42 AM" for today, "09 Nov, 10:42 AM" for earlier days (gym time). */
export function activityTime(at, today) {
  const day = todayInGym(new Date(at));
  if (day === today) return formatTime(at);
  return `${formatDate(day).slice(0, 6)}, ${formatTime(at)}`;
}

function staffLabel(name, role) {
  if (!name) return null;
  const first = name.split(' ')[0];
  return `${first} (${role === ROLES.OWNER ? 'Owner' : 'Front desk'})`;
}

const join = (parts) => parts.filter(Boolean).join(' · ');

/**
 * One line in Recent Activities.
 * @returns {{ icon: string, tone: 'brand'|'success'|'neutral', text: string, sub: string }}
 */
export function describeActivity(activity) {
  const { type, name, details: d = {} } = activity;
  switch (type) {
    case 'registration': {
      const staff = staffLabel(d.staffName, d.staffRole);
      return {
        icon: 'userAdd',
        tone: 'brand',
        text: `New member: ${name}`,
        sub: join([
          d.memberCode,
          d.planName && `${d.planName} plan`,
          staff && `registered by ${staff}`,
        ]),
      };
    }
    case 'check_in':
      return {
        icon: 'checkIn',
        tone: 'success',
        text: `Check-in: ${name}`,
        sub: join([d.memberCode, d.method === 'manual' ? 'Manual ID lookup' : 'QR scan']),
      };
    case 'check_out':
      return {
        icon: 'checkOut',
        tone: 'neutral',
        text: `Check-out: ${name}`,
        sub: d.checkInAt ? `Stayed ${formatDuration(d.checkInAt, activity.at)}` : '',
      };
    case 'walk_in':
      return {
        icon: 'walk',
        tone: 'neutral',
        text: `Walk-in registered: ${name}`,
        sub: join([
          `${d.feeType === 'student' ? 'Student' : 'Regular'} rate ${formatPeso(d.fee)}`,
          d.paymentMethod ?? 'Not paid yet',
        ]),
      };
    case 'payment':
      return {
        icon: 'cash',
        tone: 'success',
        text: name
          ? `Payment received: ${formatPeso(d.amount)} from ${name}`
          : `Payment received: ${formatPeso(d.amount)}`,
        sub: join([PAYMENT_TYPE_LABELS[d.paymentType], d.paymentMethod, d.transactionNo]),
      };
    default:
      return { icon: 'overview', tone: 'neutral', text: name ?? 'Activity', sub: '' };
  }
}

/** Badge tone for the capacity gauge. */
export const CAPACITY_TONES = {
  [CAPACITY_LEVEL.QUIET]: 'ok',
  [CAPACITY_LEVEL.BUSY]: 'warn',
  [CAPACITY_LEVEL.ALMOST_FULL]: 'bad',
  [CAPACITY_LEVEL.FULL]: 'bad',
  [CAPACITY_LEVEL.NOT_SET]: 'mute',
};

/** Texts for the three alert boxes. Returns null for a box with nothing to report. */
export function describeAlerts(alerts) {
  const { expiringSoon, expired, stock } = alerts;

  const expiring =
    expiringSoon.count > 0
      ? {
          title: `${plural(expiringSoon.count, 'membership')} expiring soon`,
          text: join([
            `Within the next ${plural(expiringSoon.withinDays, 'day')}`,
            expiringSoon.endingToday > 0 && `${expiringSoon.endingToday} end today`,
            expiringSoon.endingTomorrow > 0 &&
              `${expiringSoon.endingTomorrow} ${expiringSoon.endingTomorrow === 1 ? 'expires' : 'expire'} tomorrow`,
          ]),
        }
      : null;

  const lapsed =
    expired.count > 0
      ? {
          title: `${plural(expired.count, 'expired membership')}`,
          text: join([
            'Not renewed yet',
            expired.recent > 0 &&
              `${expired.recent} expired in the past ${expired.recentDays} days`,
          ]),
        }
      : null;

  const stockAlert =
    stock.lowCount > 0 || stock.outCount > 0
      ? {
          title: join([
            stock.lowCount > 0 && `${plural(stock.lowCount, 'item')} low on stock`,
            stock.outCount > 0 && `${stock.outCount} out of stock`,
          ]),
          text: stock.lowestItem
            ? `${stock.lowestItem.name} has ${stock.lowestItem.quantity} left`
            : `${stock.outItem.name} is out of stock`,
        }
      : null;

  return { expiring, expired: lapsed, stock: stockAlert };
}
