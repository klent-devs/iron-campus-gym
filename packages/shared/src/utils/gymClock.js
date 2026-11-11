/**
 * Live clock helpers for the front desk: current gym time, greeting and whether the gym is open.
 * Always uses the gym's time zone (Asia/Manila), whatever the PC's own time zone is set to.
 */
import { GYM_TIMEZONE, formatDate, todayInGym } from './dates.js';

/** Minutes after the gym closes are counted as "closing soon" when they are this close. */
export const CLOSING_SOON_MINUTES = 60;

/** Default opening hours (same as the gym_settings column defaults). */
export const DEFAULT_GYM_HOURS = Object.freeze({ opensAt: '06:00', closesAt: '22:00' });

export const GYM_OPEN_STATE = Object.freeze({
  OPEN: 'open',
  CLOSING_SOON: 'closing_soon',
  CLOSED: 'closed',
});

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)/;

/** '06:00' or '06:00:00' (Postgres time) → 360. Returns null for anything else. */
export function timeToMinutes(value) {
  const match = typeof value === 'string' ? HH_MM.exec(value) : null;
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** '06:00:00' → '06:00'; null when it isn't a time. */
export function normalizeTime(value) {
  const minutes = timeToMinutes(value);
  if (minutes === null) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** '22:00' → '10:00 PM', '06:30' → '6:30 AM' */
export function formatTimeOfDay(value) {
  const minutes = timeToMinutes(value);
  if (minutes === null) return '—';
  const h24 = Math.floor(minutes / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(minutes % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** The gym's wall-clock time right now: { hours: 0–23, minutes, seconds }. */
export function gymTimeParts(now = new Date(), timeZone = GYM_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { hours: get('hour'), minutes: get('minute'), seconds: get('second') };
}

/** Big clock text: '10:42:15 AM' (or '10:42 AM' with seconds: false), in gym time. */
export function formatClock(now = new Date(), { seconds = true, timeZone = GYM_TIMEZONE } = {}) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    second: seconds ? '2-digit' : undefined,
  }).format(now);
}

const weekdayIn = (now, timeZone, weekday) =>
  new Intl.DateTimeFormat('en-US', { timeZone, weekday }).format(now);

/** 'Wednesday, 11 Nov 2026' in gym time. */
export function formatLongDate(now = new Date(), timeZone = GYM_TIMEZONE) {
  return `${weekdayIn(now, timeZone, 'long')}, ${formatDate(todayInGym(now, timeZone))}`;
}

/** 'Wed Nov 11 2:26PM' in gym time: the one-line clock under the sidebar logo. */
export function formatSidebarClock(now = new Date(), timeZone = GYM_TIMEZONE) {
  const [day, month] = formatDate(todayInGym(now, timeZone)).split(' '); // '09', 'Sep'
  // Drop the space before AM/PM (some versions use a special narrow space, so remove any space).
  const time = formatClock(now, { seconds: false, timeZone }).replace(/\s/g, '');
  return `${weekdayIn(now, timeZone, 'short')} ${month} ${Number(day)} ${time}`;
}

/** 'Good morning' before noon, 'Good afternoon' until 6 PM, then 'Good evening'. */
export function greetingFor(now = new Date(), timeZone = GYM_TIMEZONE) {
  const { hours } = gymTimeParts(now, timeZone);
  if (hours < 12) return 'Good morning';
  if (hours < 18) return 'Good afternoon';
  return 'Good evening';
}

function minutesWord(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/**
 * Is the gym open right now, based on gym_settings opening_time / closing_time?
 * Handles hours that run past midnight (e.g. 18:00–02:00). Same opening and closing time = open 24 hours.
 * @returns {{ state: 'open'|'closing_soon'|'closed', label: string, detail: string }}
 */
export function gymOpenStatus({
  now = new Date(),
  opensAt = DEFAULT_GYM_HOURS.opensAt,
  closesAt = DEFAULT_GYM_HOURS.closesAt,
  timeZone = GYM_TIMEZONE,
} = {}) {
  const open = timeToMinutes(opensAt) ?? timeToMinutes(DEFAULT_GYM_HOURS.opensAt);
  const close = timeToMinutes(closesAt) ?? timeToMinutes(DEFAULT_GYM_HOURS.closesAt);
  const { hours, minutes } = gymTimeParts(now, timeZone);
  const nowMin = hours * 60 + minutes;
  const openText = formatTimeOfDay(normalizeTime(opensAt) ?? DEFAULT_GYM_HOURS.opensAt);
  const closeText = formatTimeOfDay(normalizeTime(closesAt) ?? DEFAULT_GYM_HOURS.closesAt);

  if (open === close) {
    return { state: GYM_OPEN_STATE.OPEN, label: 'Open now', detail: 'Open 24 hours' };
  }

  const overnight = close < open;
  const isOpen = overnight ? nowMin >= open || nowMin < close : nowMin >= open && nowMin < close;

  if (isOpen) {
    const left = (close - nowMin + 1440) % 1440;
    if (left <= CLOSING_SOON_MINUTES) {
      return {
        state: GYM_OPEN_STATE.CLOSING_SOON,
        label: 'Closing soon',
        detail: `Closes in ${minutesWord(left)} (${closeText})`,
      };
    }
    return { state: GYM_OPEN_STATE.OPEN, label: 'Open now', detail: `Closes at ${closeText}` };
  }

  // Closed: opening is later today unless we are past opening time (after today's closing).
  const opensTomorrow = !overnight && nowMin >= close;
  return {
    state: GYM_OPEN_STATE.CLOSED,
    label: 'Closed',
    detail: opensTomorrow ? `Opens tomorrow at ${openText}` : `Opens at ${openText}`,
  };
}
