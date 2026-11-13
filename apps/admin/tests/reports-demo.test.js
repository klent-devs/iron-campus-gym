import { parsePeso } from '@icg/shared';
import { describe, expect, it } from 'vitest';
import {
  buildReport,
  datesBetween,
  formatPeriod,
  periodProblem,
  quickPeriod,
  reportFileName,
  reportToCsv,
} from '../src/features/reports/demoData.js';

import { createSeed, dayRecords } from '@icg/demo-data';

// 10:52 AM in Manila on Tue 10 Nov 2026. The sample data starts on 01 Oct (1st of last month).
const NOW = new Date('2026-11-10T02:52:00Z');
const STATE = createSeed(NOW);
const PERIOD = { from: '2026-11-01', to: '2026-11-09' };
const OLD = { from: '2026-08-01', to: '2026-08-31' }; // before the sample data: made-up numbers
const report = (params) => buildReport(params, STATE, NOW);
const value = (r, label) => r.summary.find((s) => s.label === label).value;
const count = (text) => Number(String(text).replace(/,/g, ''));

describe('report sample data', () => {
  it('gives the same records for the same day (also before the sample data starts)', () => {
    expect(dayRecords(STATE, '2026-11-05', NOW)).toEqual(dayRecords(STATE, '2026-11-05', NOW));
    expect(dayRecords(STATE, '2026-08-05', NOW)).toEqual(dayRecords(STATE, '2026-08-05', NOW));
    expect(dayRecords(STATE, '2026-08-05', NOW)).not.toEqual(dayRecords(STATE, '2026-08-06', NOW));
  });

  it('has a believable number of check-ins per day, before and after the sample data starts', () => {
    for (const period of [PERIOD, OLD]) {
      const att = report({ type: 'att', ...period });
      const avg = count(value(att, 'Daily average'));
      expect(avg).toBeGreaterThan(60);
      expect(avg).toBeLessThan(140);
    }
    const att = report({ type: 'att', ...PERIOD });
    expect(att.rows).toHaveLength(9);
    expect(att.total[0]).toBe('9 days');
  });

  it('walk-in money agrees between the Walk-in and Payment reports', () => {
    for (const period of [PERIOD, OLD]) {
      const walk = report({ type: 'walk', ...period });
      const pay = report({ type: 'pay', ...period });
      expect(pay.total[2]).toBe(value(walk, 'Collected'));
    }
  });

  it('payment rows add up to the total', () => {
    const pay = report({ type: 'pay', ...PERIOD });
    const sum = pay.rows.reduce((s, r) => s + (r[4] === '—' ? 0 : parsePeso(r[4])), 0);
    expect(sum).toBeCloseTo(parsePeso(pay.total[4]), 2);
    expect(pay.total[4]).toBe(value(pay, 'Gross collected'));
  });

  it('the Payment Report is Owner-only and has no search; others filter by name', () => {
    expect(report({ type: 'pay', ...PERIOD }).ownerOnly).toBe(true);
    const one = dayRecords(STATE, '2026-11-03', NOW).payments.find((p) => p.status === 'paid');
    const pay = report({ type: 'pay', ...PERIOD, search: one.txnNo });
    expect(pay.search).toBe('');
    expect(pay).toEqual(report({ type: 'pay', ...PERIOD }));

    const walker = dayRecords(STATE, '2026-11-03', NOW).walkins[0].name;
    const walk = report({ type: 'walk', ...PERIOD, search: walker });
    expect(walk.search).toBe(walker);
    expect(count(value(walk, 'Walk-in visits'))).toBeGreaterThan(0);
    expect(count(value(walk, 'Walk-in visits'))).toBeLessThan(
      count(value(report({ type: 'walk', ...PERIOD }), 'Walk-in visits')),
    );
  });

  it('a search with no match gives an empty table', () => {
    const inv = report({ type: 'inv', ...PERIOD, search: 'zzz no such item' });
    expect(inv.rows).toEqual([]);
  });

  it('membership rows are per plan with a total (plans with nothing are left out)', () => {
    const mem = report({ type: 'mem', ...PERIOD });
    expect(mem.rows.map((r) => r[0])).toEqual([
      'Monthly',
      'Student Monthly',
      'Quarterly',
      'Annual',
    ]);
    expect(mem.total[0]).toBe('Total');
  });

  it('inventory on hand matches the items in the sample data', () => {
    const inv = report({ type: 'inv', ...PERIOD });
    const onHand = STATE.items.reduce((s, i) => s + i.quantity, 0);
    expect(count(inv.total[4])).toBe(onHand);
  });
});

describe('report periods', () => {
  const TODAY = '2026-11-09';
  const NOV = { from: '2026-11-01', to: '2026-11-09' };

  it('quick dates', () => {
    expect(quickPeriod('month', TODAY)).toEqual(NOV);
    expect(quickPeriod('week', TODAY)).toEqual({ from: TODAY, to: TODAY }); // a Monday
    expect(quickPeriod('lastMonth', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('explains bad dates in plain words', () => {
    expect(periodProblem(PERIOD, TODAY)).toBe('');
    expect(periodProblem({ from: '2026-11-09', to: '2026-11-01' }, TODAY)).toMatch(/on or before/);
    expect(periodProblem({ from: '2026-11-01', to: '2026-11-10' }, TODAY)).toMatch(/after today/);
    expect(periodProblem({ from: '2025-01-01', to: TODAY }, TODAY)).toMatch(/one year/);
  });

  it('formats periods like the design', () => {
    expect(formatPeriod(PERIOD)).toBe('01 – 09 Nov 2026');
    expect(formatPeriod({ from: '2026-10-28', to: '2026-11-09' })).toBe('28 Oct – 09 Nov 2026');
    expect(formatPeriod({ from: TODAY, to: TODAY })).toBe('09 Nov 2026');
    expect(datesBetween('2026-11-08', '2026-11-09')).toEqual(['2026-11-09', '2026-11-08']);
  });
});

describe('report export', () => {
  it('CSV starts with the BOM (for ₱ in Excel) and has the header and total rows', () => {
    const pay = report({ type: 'pay', ...PERIOD });
    const csv = reportToCsv(pay, new Date('2026-11-09T02:00:00Z'));
    expect(csv.startsWith('﻿IRON CAMPUS GYM · Payment Report')).toBe(true);
    expect(csv).toContain('Payment Method,Memberships,Walk-ins,Products,Total');
    expect(csv).toContain('"₱'); // amounts with commas are quoted
    expect(reportFileName(pay, 'csv')).toBe(
      'iron-campus-gym-payment-report-2026-11-01-to-2026-11-09.csv',
    );
  });
});
