import { describe, expect, it } from 'vitest';
import {
  activityTime,
  describeActivity,
  describeAlerts,
  formatChange,
  formatDayRange,
  formatPercentChange,
  monthLabels,
  weekdayName,
} from '../src/features/dashboard/format.js';

describe('changes', () => {
  it('shows arrows for whole-number changes', () => {
    expect(formatChange(11)).toEqual({ text: '▲ 11', tone: 'up' });
    expect(formatChange(-3)).toEqual({ text: '▼ 3', tone: 'down' });
    expect(formatChange(0)).toEqual({ text: 'No change', tone: 'neutral' });
  });
  it('shows % change with one decimal, or nothing when there is no comparison', () => {
    expect(formatPercentChange(8.4)).toEqual({ text: '▲ 8.4%', tone: 'up' });
    expect(formatPercentChange(-2)).toEqual({ text: '▼ 2.0%', tone: 'down' });
    expect(formatPercentChange(null)).toBeNull();
  });
});

describe('dates', () => {
  it('formats the comparison period', () => {
    expect(formatDayRange({ from: '2026-10-01', to: '2026-10-10' })).toBe('1–10 Oct');
    expect(formatDayRange({ from: '2026-11-01', to: '2026-11-01' })).toBe('1 Nov');
  });
  it('names the weekday', () => {
    expect(weekdayName('2026-11-09')).toBe('Monday');
  });
  it('labels chart months', () => {
    expect(monthLabels('2026-11')).toEqual({ short: 'Nov', long: 'November 2026' });
  });
  it('shows just the time for today and adds the date for older activity (Manila time)', () => {
    expect(activityTime('2026-11-10T02:42:00Z', '2026-11-10')).toBe('10:42 AM');
    expect(activityTime('2026-11-09T02:42:00Z', '2026-11-10')).toBe('09 Nov, 10:42 AM');
    // 11:30 PM on 9 Nov in Manila is still "yesterday" even though UTC says 9 Nov 15:30
    expect(activityTime('2026-11-09T15:30:00Z', '2026-11-10')).toBe('09 Nov, 11:30 PM');
  });
});

describe('recent activity lines (design wording)', () => {
  it('new member', () => {
    expect(
      describeActivity({
        type: 'registration',
        name: 'Kyla Mae Dizon',
        details: {
          memberCode: 'ICG-2026-0642',
          planName: 'Monthly',
          staffName: 'Joy Mercado',
          staffRole: 'receptionist',
        },
      }),
    ).toMatchObject({
      icon: 'userAdd',
      text: 'New member: Kyla Mae Dizon',
      sub: 'ICG-2026-0642 · Monthly plan · registered by Joy (Front desk)',
    });
  });
  it('check-in by QR and by manual lookup', () => {
    const base = { type: 'check_in', name: 'Paolo Reyes' };
    expect(
      describeActivity({ ...base, details: { memberCode: 'ICG-2025-0318', method: 'qr' } }).sub,
    ).toBe('ICG-2025-0318 · QR scan');
    expect(
      describeActivity({ ...base, details: { memberCode: 'ICG-2024-0107', method: 'manual' } }).sub,
    ).toBe('ICG-2024-0107 · Manual ID lookup');
  });
  it('check-out shows how long they stayed', () => {
    expect(
      describeActivity({
        type: 'check_out',
        name: 'Bianca Santos',
        at: '2026-11-10T02:05:00Z',
        details: { checkInAt: '2026-11-10T00:17:00Z' },
      }),
    ).toMatchObject({ text: 'Check-out: Bianca Santos', sub: 'Stayed 1h 48m' });
  });
  it('payment', () => {
    expect(
      describeActivity({
        type: 'payment',
        name: 'Andrea Lim',
        details: {
          amount: 1200,
          paymentType: 'membership_renewal',
          paymentMethod: 'GCash',
          transactionNo: 'TXN-2026-11-0391',
        },
      }),
    ).toMatchObject({
      text: 'Payment received: ₱1,200.00 from Andrea Lim',
      sub: 'Membership renewal · GCash · TXN-2026-11-0391',
    });
  });
  it('product payment without a person', () => {
    expect(
      describeActivity({
        type: 'payment',
        name: null,
        details: { amount: 20, paymentType: 'product' },
      }).text,
    ).toBe('Payment received: ₱20.00');
  });
  it('walk-in, paid and not yet paid', () => {
    const base = { type: 'walk_in', name: 'Carlo Tan' };
    expect(
      describeActivity({
        ...base,
        details: { feeType: 'student', fee: 80, paymentMethod: 'Cash' },
      }),
    ).toMatchObject({ text: 'Walk-in registered: Carlo Tan', sub: 'Student rate ₱80.00 · Cash' });
    expect(
      describeActivity({ ...base, details: { feeType: 'regular', fee: 100, paymentMethod: null } })
        .sub,
    ).toBe('Regular rate ₱100.00 · Not paid yet');
  });
});

describe('alerts', () => {
  const quiet = {
    expiringSoon: { count: 0, withinDays: 7, endingToday: 0, endingTomorrow: 0 },
    expired: { count: 0, recent: 0, recentDays: 7 },
    stock: { lowCount: 0, outCount: 0, lowestItem: null, outItem: null },
  };

  it('matches the design sample', () => {
    const view = describeAlerts({
      expiringSoon: { count: 21, withinDays: 7, endingToday: 0, endingTomorrow: 6 },
      expired: { count: 37, recent: 9, recentDays: 7 },
      stock: {
        lowCount: 3,
        outCount: 1,
        lowestItem: { name: 'Bottled Water 500ml', quantity: 8 },
        outItem: { name: 'Sports Drink 500ml', quantity: 0 },
      },
    });
    expect(view.expiring).toEqual({
      title: '21 memberships expiring soon',
      text: 'Within the next 7 days · 6 expire tomorrow',
    });
    expect(view.expired).toEqual({
      title: '37 expired memberships',
      text: 'Not renewed yet · 9 expired in the past 7 days',
    });
    expect(view.stock).toEqual({
      title: '3 items low on stock · 1 out of stock',
      text: 'Bottled Water 500ml has 8 left',
    });
  });

  it('uses singular words for one', () => {
    const view = describeAlerts({
      ...quiet,
      expiringSoon: { count: 1, withinDays: 7, endingToday: 1, endingTomorrow: 0 },
      expired: { count: 1, recent: 0, recentDays: 7 },
    });
    expect(view.expiring).toEqual({
      title: '1 membership expiring soon',
      text: 'Within the next 7 days · 1 end today',
    });
    expect(view.expired.title).toBe('1 expired membership');
    expect(view.expired.text).toBe('Not renewed yet');
  });

  it('names the out-of-stock item when nothing is merely low', () => {
    const view = describeAlerts({
      ...quiet,
      stock: {
        lowCount: 0,
        outCount: 2,
        lowestItem: null,
        outItem: { name: 'Sports Drink 500ml' },
      },
    });
    expect(view.stock).toEqual({
      title: '2 out of stock',
      text: 'Sports Drink 500ml is out of stock',
    });
  });

  it('hides boxes with nothing to report', () => {
    expect(describeAlerts(quiet)).toEqual({ expiring: null, expired: null, stock: null });
  });
});
