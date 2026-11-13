/**
 * Member portal notifications (MNotifications.dc.html), worked out from the member's own records:
 * payments, check-ins, "expires in 7 days", "expired", plus the gym's announcements.
 * Read ones are remembered on the member (`readNotifications`).
 * TODO(api): real push/SMS reminders come from the cloud service (milestone 8).
 */
import {
  EXPIRING_SOON_DAYS,
  addDays,
  formatDate,
  formatPeso,
  formatTime,
  todayInGym,
} from '@icg/shared';
import { gymTimestamp } from './seed.js';
import { indexes, memberInfo, methodName } from './selectors.js';

/** Only things from the last 14 days count as new. */
const NEW_FOR_DAYS = 14;

/**
 * @returns {{ id, kind: 'pay'|'in'|'info'|'clock'|'x', title, body, at, unread }[]} newest first
 */
export function memberNotifications(state, memberId, now = new Date()) {
  const ix = indexes(state);
  const member = ix.member.get(memberId);
  if (!member) return [];
  const today = todayInGym(now);
  const nowIso = now.toISOString();
  const list = [];

  for (const p of ix.paymentsByMember.get(memberId) ?? []) {
    if (p.status !== 'paid') continue;
    list.push({
      id: `pay:${p.id}`,
      kind: 'pay',
      title: 'Payment received',
      body: `${formatPeso(p.amount)} by ${methodName(state, p.method)} for ${p.description}. Receipt ${p.txnNo}.`,
      at: p.at,
    });
  }
  const visits = (ix.checkInsByMember.get(memberId) ?? []).filter(
    (c) => c.timeIn >= gymTimestamp(addDays(today, -NEW_FOR_DAYS), 0),
  );
  for (const c of visits) {
    list.push({
      id: `in:${c.id}`,
      kind: 'in',
      title: 'Checked in',
      body: `Welcome back! You checked in at ${formatTime(c.timeIn)}.`,
      at: c.timeIn,
    });
  }
  const subs = ix.subsByMember.get(memberId) ?? [];
  for (const s of subs) {
    const warnOn = addDays(s.endDate, -EXPIRING_SOON_DAYS);
    const continued = subs.some((x) => x.startDate === addDays(s.endDate, 1));
    if (warnOn <= today && !continued) {
      list.push({
        id: `exp7:${s.id}`,
        kind: 'clock',
        title: `Membership expires in ${EXPIRING_SOON_DAYS} days`,
        body: `Your ${s.planName} plan ends ${formatDate(s.endDate)}. Renew at the front desk.`,
        at: gymTimestamp(warnOn, 480),
      });
    }
    const expiredOn = addDays(s.endDate, 1);
    if (expiredOn <= today && !continued) {
      list.push({
        id: `x:${s.id}`,
        kind: 'x',
        title: 'Membership expired',
        body: `Your plan ended ${formatDate(s.endDate)}. Your QR code won’t work until you renew.`,
        at: gymTimestamp(expiredOn, 480),
      });
    }
  }
  if (member.suspended) {
    list.push({
      id: `sus:${member.suspendedOn}`,
      kind: 'x',
      title: 'Membership suspended',
      body: `Reason: ${member.suspendReason}. Please talk to the front desk.`,
      at: gymTimestamp(member.suspendedOn, 480),
    });
  }
  for (const n of state.notices) {
    list.push({ id: `notice:${n.id}`, kind: 'info', title: n.title, body: n.body, at: n.at });
  }

  const read = new Set(member.readNotifications ?? []);
  const fresh = gymTimestamp(addDays(today, -NEW_FOR_DAYS), 0);
  return list
    .filter((n) => n.at <= nowIso)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 40)
    .map((n) => ({ ...n, unread: n.at >= fresh && !read.has(n.id) }));
}

/** When the member gets the "expires soon" reminder (a week before the end). */
export function reminderDate(state, memberId, now = new Date()) {
  const member = indexes(state).member.get(memberId);
  const info = member && memberInfo(state, member, todayInGym(now));
  return info?.endDate ? addDays(info.endDate, -EXPIRING_SOON_DAYS) : null;
}
