import { describe, expect, it } from 'vitest';
import {
  countByStatus,
  customerHistory,
  dateRange,
  findExistingCustomer,
  formatPhone,
  matchesSearch,
  paymentLabel,
  summarize,
  visitMeta,
  visitsInRange,
} from '../src/features/walkins/demoData.js';
import { createDemoData } from './fixtures/walkinsDesign.js';

// 10:52 AM in Manila on Mon 09 Nov 2026, like the design.
const NOW = new Date('2026-11-09T02:52:00Z');
const TODAY = '2026-11-09';

describe('walk-in sample data', () => {
  const { customers, visits } = createDemoData(NOW);
  const todays = visitsInRange(visits, 'today', TODAY);

  it('matches the design: 8 walk-ins today, 4 inside, ₱580 collected, 1 unpaid (₱100)', () => {
    expect(summarize(todays)).toEqual({
      total: 8,
      inside: 4,
      collected: 580,
      unpaidCount: 1,
      unpaidAmount: 100,
    });
    expect(countByStatus(todays)).toEqual({ All: 8, Inside: 4, Completed: 4, Unpaid: 1 });
  });

  it('shows Ryan as a 4th visit this month, with the Monthly plan hint', () => {
    const ryanToday = todays.find((v) => v.customerId === 'c7');
    expect(visitMeta(ryanToday, visits)).toBe('Regular · 4th visit this month');
    const ryan = customers.find((c) => c.id === 'c7');
    const h = customerHistory(ryan, visits, TODAY);
    expect(h.monthCount).toBe(4);
    expect(h.monthSpent).toBe(400);
    expect(h.suggestion).toMatch(/Ryan has spent ₱400\.00 this month/);
    expect(h.suggestion).toMatch(/pays off at 12 visits/);
  });

  it('labels payments', () => {
    expect(paymentLabel({ paymentStatus: 'unpaid' })).toEqual({ text: 'Unpaid', tone: 'bad' });
    expect(paymentLabel({ paymentStatus: 'refunded' }).text).toBe('Refunded');
    expect(paymentLabel({ paymentStatus: 'paid', paymentMethod: 'gcash' }).text).toBe(
      'Paid · GCash',
    );
  });
});

describe('date filters (weeks start Monday)', () => {
  it('works out each range', () => {
    expect(dateRange('today', TODAY)).toEqual({ from: TODAY, to: TODAY });
    expect(dateRange('yesterday', TODAY)).toEqual({ from: '2026-11-08', to: '2026-11-08' });
    expect(dateRange('week', TODAY)).toEqual({ from: '2026-11-09', to: TODAY }); // a Monday
    expect(dateRange('week', '2026-11-15')).toEqual({ from: '2026-11-09', to: '2026-11-15' });
    expect(dateRange('month', TODAY)).toEqual({ from: '2026-11-01', to: TODAY });
  });
});

describe('search and duplicates', () => {
  const kenji = { id: 'c2', name: 'Kenji Ramos', phone: '09173301182' };

  it('finds by name or by number typed with spaces', () => {
    expect(matchesSearch(kenji, 'kenji')).toBe(true);
    expect(matchesSearch(kenji, '0917 330')).toBe(true);
    expect(matchesSearch(kenji, 'ella')).toBe(false);
    expect(matchesSearch(kenji, '  ')).toBe(true);
  });

  it('reuses a customer by number, or by name when neither has a number', () => {
    const list = [kenji, { id: 'c4', name: 'Nathan Lopez', phone: null }];
    expect(findExistingCustomer(list, { name: 'K. Ramos', phone: '09173301182' })).toBe(kenji);
    expect(findExistingCustomer(list, { name: 'nathan lopez', phone: null })?.id).toBe('c4');
    expect(findExistingCustomer(list, { name: 'Kenji Ramos', phone: null })).toBe(null);
  });

  it('formats numbers for display', () => {
    expect(formatPhone('09173301182')).toBe('0917 330 1182');
    expect(formatPhone(null)).toBe('—');
  });
});
