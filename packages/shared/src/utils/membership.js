import { EXPIRING_SOON_DAYS, MEMBERSHIP_STATUS } from '../constants/membershipStatus.js';
import { addDays, addMonths, daysBetween } from './dates.js';

/**
 * Last day of a membership period (inclusive).
 * Monthly from 09 Nov → 08 Dec. Quarterly from 13 Nov → 12 Feb.
 */
export function computeEndDate(startDate, { durationMonths = 0, durationDays = 0 }) {
  if (durationMonths > 0) return addDays(addMonths(startDate, durationMonths), -1);
  if (durationDays > 0) return addDays(startDate, durationDays - 1);
  throw new Error('A plan needs durationMonths or durationDays');
}

/**
 * When a renewal should start: the day after the current period ends,
 * or today if the membership has already expired.
 */
export function renewalStartDate(currentEndDate, today) {
  if (!currentEndDate || daysBetween(today, currentEndDate) < 0) return today;
  return addDays(currentEndDate, 1);
}

/** Days left including today's remaining access; negative once expired. */
export function daysRemaining(endDate, today) {
  return daysBetween(today, endDate);
}

/**
 * The single source of truth for a member's status badge.
 * @param {{ endDate?: string|null, suspended?: boolean, today: string }} input
 */
export function membershipStatus({ endDate, suspended = false, today }) {
  if (suspended) return MEMBERSHIP_STATUS.SUSPENDED;
  if (!endDate) return MEMBERSHIP_STATUS.PENDING;
  const left = daysRemaining(endDate, today);
  if (left < 0) return MEMBERSHIP_STATUS.EXPIRED;
  if (left <= EXPIRING_SOON_DAYS) return MEMBERSHIP_STATUS.EXPIRING_SOON;
  return MEMBERSHIP_STATUS.ACTIVE;
}

/** Whether the front desk should let this member in. */
export function canEnter(status) {
  return status === MEMBERSHIP_STATUS.ACTIVE || status === MEMBERSHIP_STATUS.EXPIRING_SOON;
}
