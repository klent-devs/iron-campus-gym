import { ROLES } from '@icg/shared';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import {
  chartMonths,
  createDashboardService,
  percentChange,
  samePeriodLastMonth,
} from '../src/modules/dashboard/dashboard.service.js';

// 10 Nov 2026, 10:30 AM in Manila (UTC+8)
const NOW = new Date('2026-11-10T02:30:00Z');

function fakeRepo(overrides = {}) {
  return {
    getSettings: vi.fn(async () => ({ maxCapacity: 60, warningPct: 90, expiringSoonDays: 7 })),
    memberStatusCounts: vi.fn(async () => [
      { status: 'active', count: 397, ending_today: 0, ending_tomorrow: 0, ended_recently: 0 },
      {
        status: 'expiring_soon',
        count: 21,
        ending_today: 2,
        ending_tomorrow: 6,
        ended_recently: 0,
      },
      { status: 'expired', count: 37, ending_today: 0, ending_tomorrow: 0, ended_recently: 9 },
      { status: 'suspended', count: 4, ending_today: 0, ending_tomorrow: 0, ended_recently: 0 },
      { status: 'pending', count: 1, ending_today: 0, ending_tomorrow: 0, ended_recently: 0 },
    ]),
    countMembersCheckedIn: vi.fn(async (date) => (date === '2026-11-10' ? 124 : 113)),
    countWalkIns: vi.fn(async (date) => (date === '2026-11-10' ? 17 : 20)),
    countInsideNow: vi.fn(async () => ({ members: 30, walkIns: 4 })),
    recentActivities: vi.fn(async () => [
      {
        type: 'check_in',
        id: 'a1',
        at: new Date('2026-11-10T02:38:00Z'),
        name: 'Paolo Reyes',
        details: { memberCode: 'ICG-2025-0318', method: 'qr' },
      },
    ]),
    stockItems: vi.fn(async () => [
      { name: 'Sports Drink 500ml', quantity: 0, reorderLevel: 12, unit: 'btl' },
      { name: 'Disinfectant Spray 1L', quantity: 2, reorderLevel: 4, unit: 'btl' },
      { name: 'Whey Sachet 30g', quantity: 6, reorderLevel: 15, unit: 'sachet' },
      { name: 'Bottled Water 500ml', quantity: 8, reorderLevel: 24, unit: 'pcs' },
      { name: 'Chalk Block', quantity: 30, reorderLevel: 10, unit: 'pcs' },
    ]),
    paidRevenue: vi.fn(async (from) => (from === '2026-11-01' ? 486300 : 448600)),
    monthlyRevenue: vi.fn(async () => [
      { month: '2026-10', revenue: 472000 },
      { month: '2026-11', revenue: 486300 },
    ]),
    walkInCollected: vi.fn(async () => 1620),
    ...overrides,
  };
}

const serviceWith = (repo, now = NOW) =>
  createDashboardService({ repo, timeZone: 'Asia/Manila', now: () => now });

describe('dashboard date helpers', () => {
  it('compares this month so far with the same days last month', () => {
    expect(samePeriodLastMonth('2026-11-10')).toEqual({ from: '2026-10-01', to: '2026-10-10' });
  });
  it('stops at the end of a shorter previous month', () => {
    expect(samePeriodLastMonth('2026-03-31')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
  it('lists the chart months for each range', () => {
    const twelve = chartMonths('12m', '2026-11-10');
    expect(twelve).toHaveLength(12);
    expect(twelve[0]).toBe('2025-12-01');
    expect(twelve[11]).toBe('2026-11-01');
    expect(chartMonths('6m', '2026-11-10')[0]).toBe('2026-06-01');
    const ytd = chartMonths('ytd', '2026-11-10');
    expect(ytd).toHaveLength(11);
    expect(ytd[0]).toBe('2026-01-01');
  });
  it('gives no % change when there was nothing last month', () => {
    expect(percentChange(486300, 448600)).toBe(8.4);
    expect(percentChange(5000, 0)).toBeNull();
    expect(percentChange(0, 1000)).toBe(-100);
  });
});

describe('dashboard service', () => {
  it('builds the owner dashboard', async () => {
    const repo = fakeRepo();
    const d = await serviceWith(repo).getDashboard({ range: '12m', includeRevenue: true });

    expect(d.today).toBe('2026-11-10');
    expect(d.members).toEqual({
      total: 460,
      active: 418, // active + expiring soon (both may enter)
      expiringSoon: 21,
      expired: 37,
      suspended: 4,
    });
    expect(d.revenue).toMatchObject({
      thisPeriod: 486300,
      comparePeriodTotal: 448600,
      changePct: 8.4,
      period: { from: '2026-11-01', to: '2026-11-10' },
      comparePeriod: { from: '2026-10-01', to: '2026-10-10' },
    });
    expect(d.attendance).toMatchObject({ today: 124, sameDayLastWeek: 113, change: 11 });
    expect(d.walkIns).toMatchObject({ today: 17, change: -3, collectedToday: 1620 });
    expect(d.capacity).toMatchObject({
      insideNow: 34,
      maxCapacity: 60,
      percent: 56.7,
      level: 'busy',
    });
    expect(d.alerts.expiringSoon).toEqual({
      count: 21,
      withinDays: 7,
      endingToday: 2,
      endingTomorrow: 6,
    });
    expect(d.alerts.expired).toEqual({ count: 37, recent: 9, recentDays: 7 });
    expect(d.alerts.stock).toEqual({
      lowCount: 3,
      outCount: 1,
      lowestItem: { name: 'Disinfectant Spray 1L', quantity: 2, unit: 'btl' },
      outItem: { name: 'Sports Drink 500ml', quantity: 0, unit: 'btl' },
    });
    expect(d.activities).toEqual([
      {
        id: 'check_in:a1',
        type: 'check_in',
        at: '2026-11-10T02:38:00.000Z',
        name: 'Paolo Reyes',
        details: { memberCode: 'ICG-2025-0318', method: 'qr' },
      },
    ]);
  });

  it('compares attendance with the same time last week', async () => {
    const repo = fakeRepo();
    await serviceWith(repo).getDashboard({ includeRevenue: true });
    expect(repo.countMembersCheckedIn).toHaveBeenCalledWith('2026-11-10', NOW);
    expect(repo.countMembersCheckedIn).toHaveBeenCalledWith(
      '2026-11-03',
      new Date('2026-11-03T02:30:00Z'),
    );
    expect(repo.countWalkIns).toHaveBeenCalledWith('2026-11-03', new Date('2026-11-03T02:30:00Z'));
  });

  it('fills months without sales with ₱0 and keeps expenses at 0', async () => {
    const repo = fakeRepo();
    const d = await serviceWith(repo).getDashboard({ range: '6m', includeRevenue: true });
    expect(repo.monthlyRevenue).toHaveBeenCalledWith('2026-06-01', '2026-12-01');
    expect(d.revenueChart.months.map((m) => m.month)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
    expect(d.revenueChart.months[0]).toEqual({ month: '2026-06', revenue: 0, expenses: 0 });
    expect(d.revenueChart.totals).toEqual({ revenue: 958300, expenses: 0, net: 958300 });
    expect(d.revenueChart.expensesTracked).toBe(false);
  });

  it('leaves revenue out completely for receptionists', async () => {
    const repo = fakeRepo();
    const d = await serviceWith(repo).getDashboard({ includeRevenue: false });
    expect(d.revenue).toBeNull();
    expect(d.revenueChart).toBeNull();
    expect(d.walkIns.collectedToday).toBeNull();
    expect(d.includesRevenue).toBe(false);
    expect(repo.paidRevenue).not.toHaveBeenCalled();
    expect(repo.monthlyRevenue).not.toHaveBeenCalled();
    expect(repo.walkInCollected).not.toHaveBeenCalled();
  });

  it('uses the Manila calendar day just after midnight', async () => {
    // 1 Dec 2026, 12:30 AM in Manila = 30 Nov 4:30 PM UTC
    const repo = fakeRepo();
    const d = await serviceWith(repo, new Date('2026-11-30T16:30:00Z')).getDashboard({
      includeRevenue: true,
    });
    expect(d.today).toBe('2026-12-01');
    expect(d.revenue.period).toEqual({ from: '2026-12-01', to: '2026-12-01' });
    expect(d.revenue.comparePeriod).toEqual({ from: '2026-11-01', to: '2026-11-01' });
    expect(repo.countInsideNow).toHaveBeenCalledWith('2026-12-01');
  });

  it('handles a brand-new gym with no data or settings', async () => {
    const repo = fakeRepo({
      getSettings: vi.fn(async () => null),
      memberStatusCounts: vi.fn(async () => []),
      countMembersCheckedIn: vi.fn(async () => 0),
      countWalkIns: vi.fn(async () => 0),
      countInsideNow: vi.fn(async () => ({ members: 0, walkIns: 0 })),
      recentActivities: vi.fn(async () => []),
      stockItems: vi.fn(async () => []),
      paidRevenue: vi.fn(async () => 0),
      monthlyRevenue: vi.fn(async () => []),
      walkInCollected: vi.fn(async () => 0),
    });
    const d = await serviceWith(repo).getDashboard({ includeRevenue: true });
    expect(d.members).toEqual({ total: 0, active: 0, expiringSoon: 0, expired: 0, suspended: 0 });
    expect(d.revenue.changePct).toBeNull();
    expect(d.capacity).toMatchObject({ insideNow: 0, maxCapacity: null, level: 'not_set' });
    expect(d.alerts.stock).toEqual({ lowCount: 0, outCount: 0, lowestItem: null, outItem: null });
    expect(d.alerts.expiringSoon.withinDays).toBe(7);
    expect(d.activities).toEqual([]);
  });
});

describe('GET /api/dashboard', () => {
  const appWith = (repo, role = ROLES.OWNER) =>
    createApp({
      services: { dashboard: serviceWith(repo) },
      staffContext: (req, _res, next) => {
        req.staff = { id: null, role };
        next();
      },
    });

  it('returns the dashboard for the owner', async () => {
    const res = await request(appWith(fakeRepo())).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.revenueChart.range).toBe('12m');
    expect(res.body.revenue.changePct).toBe(8.4);
    expect(res.body.capacity.insideNow).toBe(34);
  });

  it('accepts a date range', async () => {
    const res = await request(appWith(fakeRepo())).get('/api/dashboard?range=ytd');
    expect(res.status).toBe(200);
    expect(res.body.revenueChart.months).toHaveLength(11);
  });

  it('rejects an unknown date range with a friendly message', async () => {
    const res = await request(appWith(fakeRepo())).get('/api/dashboard?range=forever');
    expect(res.status).toBe(400);
    expect(res.body.fields[0]).toMatchObject({
      field: 'range',
      message: 'Choose a valid date range',
    });
  });

  it('hides revenue from receptionists on the API, not just the UI', async () => {
    const res = await request(appWith(fakeRepo(), ROLES.RECEPTIONIST)).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.revenue).toBeNull();
    expect(res.body.revenueChart).toBeNull();
    expect(res.body.walkIns.collectedToday).toBeNull();
    expect(res.body.members.total).toBe(460);
  });

  it('treats every request as the owner until login is built (placeholder)', async () => {
    const app = createApp({ services: { dashboard: serviceWith(fakeRepo()) } });
    const res = await request(app).get('/api/dashboard');
    expect(res.body.includesRevenue).toBe(true);
  });

  it('says clearly when the database is not set up', async () => {
    const res = await request(createApp({ db: null })).get('/api/dashboard');
    expect(res.status).toBe(503);
    expect(res.body.error).toContain("database isn't set up");
  });

  it('returns a friendly 500 when the database fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const repo = fakeRepo({ stockItems: vi.fn(async () => Promise.reject(new Error('boom'))) });
    const res = await request(appWith(repo)).get('/api/dashboard');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Something went wrong. Please try again.');
    spy.mockRestore();
  });
});
