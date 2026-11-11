/**
 * Dates are passed around as plain 'YYYY-MM-DD' strings (the gym's local calendar day),
 * which avoids timezone surprises. Timestamps (check-in times) are ISO strings in UTC.
 */
export const GYM_TIMEZONE = 'Asia/Manila';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value) {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(toUtc(value));
}

function toUtc(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d);
  const back = new Date(t);
  return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d
    ? t
    : NaN;
}

function fromUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today's date in the gym's timezone, e.g. '2026-11-09'. */
export function todayInGym(now = new Date(), timeZone = GYM_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDays(isoDate, days) {
  return fromUtc(toUtc(isoDate) + days * 86_400_000);
}

/** Whole days from `fromDate` to `toDate` (negative if toDate is earlier). */
export function daysBetween(fromDate, toDate) {
  return Math.round((toUtc(toDate) - toUtc(fromDate)) / 86_400_000);
}

/**
 * Adds whole months, clamping to the last day of the month (31 Jan + 1 month → 28/29 Feb).
 */
export function addMonths(isoDate, months) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const targetMonthIndex = m - 1 + months;
  const ty = y + Math.floor(targetMonthIndex / 12);
  const tm = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return fromUtc(Date.UTC(ty, tm, Math.min(d, lastDay)));
}

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

/**
 * '2026-11-09' → '09 Nov 2026'. Month names are fixed here rather than taken from Intl, because
 * newer Node/browser versions write September as "Sept" in en-GB and older ones as "Sep".
 */
export function formatDate(isoDate) {
  if (!isIsoDate(isoDate)) return '—';
  const [year, month, day] = isoDate.split('-');
  return `${day} ${MONTHS_SHORT[Number(month) - 1]} ${year}`;
}

/** ISO timestamp → '10:38 AM' in gym time. */
export function formatTime(timestamp, timeZone = GYM_TIMEZONE) {
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(
    new Date(timestamp),
  );
}

/** Two timestamps → '1h 42m'. */
export function formatDuration(startTimestamp, endTimestamp) {
  if (!startTimestamp || !endTimestamp) return '—';
  const minutes = Math.max(
    0,
    Math.round((new Date(endTimestamp) - new Date(startTimestamp)) / 60_000),
  );
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}
