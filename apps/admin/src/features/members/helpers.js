/** Wording and small helpers shared by the member pages. */
import { MEMBERSHIP_STATUS, formatDate } from '@icg/shared';
import { DemoError } from '@icg/demo-data';

export { formatPhone } from '../walkins/demoData.js';

/** Filter chips on the member list, in the design's order. */
export const STATUS_FILTERS = Object.freeze([
  { value: 'all', label: 'All' },
  { value: MEMBERSHIP_STATUS.ACTIVE, label: 'Active' },
  { value: MEMBERSHIP_STATUS.EXPIRING_SOON, label: 'Expiring Soon' },
  { value: MEMBERSHIP_STATUS.EXPIRED, label: 'Expired' },
  { value: MEMBERSHIP_STATUS.SUSPENDED, label: 'Suspended' },
]);

/** Reasons for Suspend Membership (MemberProfile.dc.html). */
export const SUSPEND_REASONS = Object.freeze([
  'Unpaid balance',
  'Rule violation',
  'Member request (freeze)',
]);

/** "29 days", "Today is the last day", "Expired 12d ago". */
export function daysText(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return '—';
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
  if (daysLeft === 0) return 'Last day today';
  return `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;
}

/** Text colour for the days left (green / amber / red / grey). */
export function daysTone(status) {
  return (
    {
      [MEMBERSHIP_STATUS.ACTIVE]: 'text-success-text',
      [MEMBERSHIP_STATUS.EXPIRING_SOON]: 'text-warning-text',
      [MEMBERSHIP_STATUS.EXPIRED]: 'text-danger-text',
    }[status] ?? 'text-ink-muted'
  );
}

/** "Monthly · expires 08 Dec 2026" */
export function planLine(member) {
  if (!member.endDate) return 'No paid membership yet';
  const verb = member.daysLeft < 0 ? 'expired' : 'expires';
  return `${member.plan} · ${verb} ${formatDate(member.endDate)}`;
}

/** Field errors from a DemoError, or `{ _: message }` for anything else. */
export function errorFields(err) {
  if (err instanceof DemoError && err.fields) return err.fields;
  return { _: err?.message ?? 'Something went wrong. Please try again.' };
}
