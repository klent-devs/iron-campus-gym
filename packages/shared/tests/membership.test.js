import { describe, expect, it } from 'vitest';
import {
  canEnter,
  computeEndDate,
  daysRemaining,
  membershipStatus,
  renewalStartDate,
} from '../src/index.js';

describe('computeEndDate', () => {
  it('Monthly from 09 Nov ends 08 Dec', () => {
    expect(computeEndDate('2026-11-09', { durationMonths: 1 })).toBe('2026-12-08');
  });
  it('Quarterly from 13 Nov ends 12 Feb', () => {
    expect(computeEndDate('2026-11-13', { durationMonths: 3 })).toBe('2027-02-12');
  });
  it('clamps month ends (31 Jan + 1 month)', () => {
    expect(computeEndDate('2027-01-31', { durationMonths: 1 })).toBe('2027-02-27');
  });
  it('supports day-based plans', () => {
    expect(computeEndDate('2026-11-09', { durationDays: 30 })).toBe('2026-12-08');
  });
});

describe('membershipStatus', () => {
  const today = '2026-11-09';
  it('active with 29 days left', () => {
    expect(daysRemaining('2026-12-08', today)).toBe(29);
    expect(membershipStatus({ endDate: '2026-12-08', today })).toBe('active');
  });
  it('expiring soon at 7 days or fewer', () => {
    expect(membershipStatus({ endDate: '2026-11-16', today })).toBe('expiring_soon');
    expect(membershipStatus({ endDate: '2026-11-09', today })).toBe('expiring_soon');
  });
  it('expired after the end date', () => {
    expect(membershipStatus({ endDate: '2026-10-28', today })).toBe('expired');
  });
  it('suspended overrides dates', () => {
    expect(membershipStatus({ endDate: '2026-12-08', suspended: true, today })).toBe('suspended');
  });
  it('pending when there is no paid period', () => {
    expect(membershipStatus({ endDate: null, today })).toBe('pending');
  });
  it('only active and expiring members may enter', () => {
    expect(canEnter('active')).toBe(true);
    expect(canEnter('expiring_soon')).toBe(true);
    expect(canEnter('expired')).toBe(false);
    expect(canEnter('suspended')).toBe(false);
  });
});

describe('renewalStartDate', () => {
  it('starts the day after the current plan ends', () => {
    expect(renewalStartDate('2026-11-12', '2026-11-09')).toBe('2026-11-13');
  });
  it('starts today when already expired', () => {
    expect(renewalStartDate('2026-10-28', '2026-11-09')).toBe('2026-11-09');
  });
});
