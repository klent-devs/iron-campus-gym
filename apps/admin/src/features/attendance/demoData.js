/**
 * Attendance — SCREEN LOGIC (lookup, scan decisions, counting, wording). The records come from the
 * shared sample data (demoStore.js → packages/demo-data), kept in this browser.
 *
 * TODO(api): when the attendance API is built (milestone 4), load members/check-ins from it and
 * send scans, check-outs and time-out fixes to it. The API must apply the same rules (one open
 * check-in per member, expired/suspended rejected). The lookup, wording and counting helpers below
 * only need members and check-ins in the same shape.
 *
 * Shapes:
 *   member:  { id, code: 'ICG-2025-0291', name, plan: 'Monthly', endDate: 'YYYY-MM-DD'|null,
 *              suspended, suspendedOn?, suspendReason?, balance?, qrToken }
 *   checkIn: { id, memberId, timeIn: ISO, timeOut: ISO|null,
 *              fix?: { reason, at: ISO } }   (fix = the time out was entered by staff)
 *   rejection: { id, at: ISO, kind: 'expired'|'suspended'|'invalid', memberId|null }
 */
import {
  MEMBERSHIP_STATUS,
  addDays,
  canEnter,
  daysBetween,
  formatTime,
  isMemberCode,
  membershipStatus,
  parseQrPayload,
  todayInGym,
} from '@icg/shared';

/** Why a time out was entered by hand (docs/design/AttendanceRecords.dc.html). */
export const FIX_REASONS = Object.freeze([
  'Member forgot to scan out',
  'Scanner was offline',
  'Wrong member scanned',
]);

export const RECORD_RANGES = Object.freeze({
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This week',
  pick: 'Pick a date…',
});

const MINUTE = 60_000;

/** Gym (Manila) date of a check-in or any timestamp, 'YYYY-MM-DD'. */
export const dayOf = (timestamp) => todayInGym(new Date(timestamp));

/** Membership status and days left, using the shared rules. */
export function memberStatus(member, today) {
  const status = membershipStatus({
    endDate: member.endDate,
    suspended: member.suspended,
    today,
  });
  const daysLeft = member.endDate ? daysBetween(today, member.endDate) : null;
  return { status, daysLeft };
}

/** The member's open check-in from today (they are inside), if any. */
export function openCheckInToday(checkIns, memberId, today) {
  return (
    checkIns.find((c) => c.memberId === memberId && !c.timeOut && dayOf(c.timeIn) === today) ?? null
  );
}

/** Open check-ins from an earlier day: the member forgot to scan out. Oldest first. */
export function missedCheckOuts(checkIns, today) {
  return checkIns
    .filter((c) => !c.timeOut && dayOf(c.timeIn) < today)
    .sort((a, b) => a.timeIn.localeCompare(b.timeIn));
}

/**
 * Find members for what staff typed or scanned.
 * - "ICG:<token>" (from a QR code) → that member only, or none if the code is unknown.
 * - A full Member ID → that member. Otherwise a part of the name or ID.
 * @returns {{ fromQr: boolean, matches: object[] }}
 */
export function findMembers(members, text) {
  const raw = text.trim();
  if (raw.toUpperCase().startsWith('ICG:')) {
    const token = parseQrPayload(raw);
    const found = token && members.find((m) => m.qrToken === token);
    return { fromQr: true, matches: found ? [found] : [] };
  }
  const q = raw.toLowerCase();
  if (!q) return { fromQr: false, matches: [] };
  if (isMemberCode(raw)) {
    const found = members.find((m) => m.code === raw.toUpperCase());
    return { fromQr: false, matches: found ? [found] : [] };
  }
  const matches = members.filter(
    (m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q),
  );
  return { fromQr: false, matches };
}

/**
 * What a scan (or the Check In / Check Out buttons) should do. Pure: changes nothing.
 * - mode 'auto' (a QR scan): inside → check out; otherwise → check in if allowed.
 * - mode 'in' / 'out': the buttons under "No QR?".
 * @returns {{ kind: 'granted'|'checkout'|'expired'|'suspended'|'invalid'|'already-in'|'not-in',
 *             member?: object, status?: string, daysLeft?: number|null, open?: object|null }}
 */
export function decideScan({ member, checkIns, today, mode = 'auto' }) {
  if (!member) return { kind: 'invalid' };
  const open = openCheckInToday(checkIns, member.id, today);
  const { status, daysLeft } = memberStatus(member, today);
  const base = { member, status, daysLeft, open };
  if (open) return { ...base, kind: mode === 'in' ? 'already-in' : 'checkout' };
  if (mode === 'out') return { ...base, kind: 'not-in' };
  if (status === MEMBERSHIP_STATUS.SUSPENDED) return { ...base, kind: 'suspended' };
  if (!canEnter(status)) return { ...base, kind: 'expired' };
  return { ...base, kind: 'granted' };
}

/** Check-ins of one member in the current month (for "Visits this month"). */
export function visitsThisMonth(checkIns, memberId, today) {
  const month = today.slice(0, 7);
  return checkIns.filter((c) => c.memberId === memberId && dayOf(c.timeIn).slice(0, 7) === month)
    .length;
}

/** '4 min' under an hour, else '1h 11m' (the "Currently Inside" cards). */
export function shortDuration(fromIso, to = new Date()) {
  const minutes = Math.max(0, Math.floor((new Date(to) - new Date(fromIso)) / MINUTE));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** 'EB' for Ella Bautista. */
export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** Numbers for the summary cards and the records footer (today only). */
export function summarizeDay(checkIns, rejections, today) {
  const todays = checkIns.filter((c) => dayOf(c.timeIn) === today);
  const done = todays.filter((c) => c.timeOut);
  const totalMinutes = done.reduce(
    (sum, c) => sum + (new Date(c.timeOut) - new Date(c.timeIn)) / MINUTE,
    0,
  );
  const avg = done.length ? Math.round(totalMinutes / done.length) : null;
  return {
    total: todays.length,
    inside: todays.length - done.length,
    checkedOut: done.length,
    rejected: rejections.filter((r) => dayOf(r.at) === today).length,
    averageStay:
      avg === null ? '—' : `${Math.floor(avg / 60)}h ${String(avg % 60).padStart(2, '0')}m`,
  };
}

/** First and last date (inclusive) for the records date filter. Weeks start on Monday. */
export function recordRange(key, today, picked) {
  if (key === 'yesterday') return { from: addDays(today, -1), to: addDays(today, -1) };
  if (key === 'week') {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
    return { from: addDays(today, -((weekday + 6) % 7)), to: today };
  }
  if (key === 'pick' && picked) return { from: picked, to: picked };
  return { from: today, to: today };
}

/** Search by member name or Member ID. */
export function matchesMember(member, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return Boolean(
    member && (member.name.toLowerCase().includes(q) || member.code.toLowerCase().includes(q)),
  );
}

/**
 * A sensible starting time out for "Fix missed check-out": 1h 30m after the time in, rounded to
 * 5 minutes, never after 10:00 PM (closing) that day. Returns 'HH:MM' (24-hour, for <input>).
 */
export function suggestedTimeOut(timeInIso) {
  const [h, m] = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Manila',
  })
    .format(new Date(timeInIso))
    .split(':')
    .map(Number);
  let minutes = Math.min(h * 60 + m + 90, 22 * 60);
  minutes = Math.round(minutes / 5) * 5;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Gym date + 'HH:MM' → ISO timestamp (Manila is UTC+8 all year, no daylight saving). */
export function gymTimeToIso(date, hhmm) {
  return new Date(`${date}T${hhmm}:00+08:00`).toISOString();
}

/** "checked in 08 Nov at 5:02 PM" */
export function checkedInPhrase(timeInIso) {
  const day = dayOf(timeInIso);
  const short = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`));
  return `checked in ${short} at ${formatTime(timeInIso)}`;
}
