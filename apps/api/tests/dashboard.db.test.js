/**
 * Runs the dashboard SQL against a real PostgreSQL database.
 * Skipped unless TEST_DATABASE_URL is set, e.g.
 *   TEST_DATABASE_URL=postgres://postgres:PASSWORD@localhost:5432/iron_campus_gym_test npm test
 * Use a separate test database: migrations are applied to it, and every test runs inside a
 * transaction that is rolled back, so no data is left behind.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, todayInGym } from '@icg/shared';
import knex from 'knex';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../src/config/pgTypes.js';
import { createDashboardRepo } from '../src/modules/dashboard/dashboard.repo.js';
import { createDashboardService } from '../src/modules/dashboard/dashboard.service.js';

const url = process.env.TEST_DATABASE_URL;
const here = path.dirname(fileURLToPath(import.meta.url));
const TZ = 'Asia/Manila';

describe.skipIf(!url)('dashboard SQL (real database)', () => {
  let db;

  beforeAll(async () => {
    db = knex({ client: 'pg', connection: url, pool: { min: 0, max: 4 } });
    await db.migrate.latest({
      directory: path.resolve(here, '../src/db/migrations'),
      loadExtensions: ['.js'],
    });
  });

  afterAll(async () => {
    await db?.destroy();
  });

  /** Runs `fn` inside a transaction that is always rolled back. */
  async function inRollback(fn) {
    const trx = await db.transaction();
    try {
      await fn(trx);
    } finally {
      await trx.rollback();
    }
  }

  const tag = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  /** Inserts one of everything the dashboard counts. */
  async function addFixtures(trx) {
    const today = todayInGym();
    const t = tag();
    // The reference seed normally creates this row; member_status_view needs it for "Expiring Soon".
    await trx('gym_settings').insert({ max_capacity: 60 }).onConflict('singleton').ignore();
    const [staff] = await trx('staff_profiles')
      .insert({ full_name: 'Joy Test', username: `joy.${t}`, role: 'receptionist' })
      .returning('id');
    const [plan] = await trx('membership_plans')
      .insert({ name: `Test Plan ${t}`, duration_months: 1, price: 1200 })
      .returning(['id', 'name']);
    const [method] = await trx('payment_methods')
      .insert({ code: `test_${t}`, name: `Test Cash ${t}` })
      .returning(['id', 'name']);

    const addMember = async (name, endDate) => {
      const [m] = await trx('members')
        .insert({
          member_code: `ICG-9999-${t}${name.length}`,
          full_name: name,
          contact_number: '09170000000',
          registered_by: staff.id,
        })
        .returning('id');
      const [s] = await trx('subscriptions')
        .insert({
          member_id: m.id,
          plan_id: plan.id,
          plan_name: plan.name,
          price: 1200,
          start_date: addDays(endDate, -29),
          end_date: endDate,
        })
        .returning('id');
      return { memberId: m.id, subscriptionId: s.id };
    };

    const expiring = await addMember(`Expiring ${t}`, addDays(today, 1));
    await addMember(`Lapsed Member ${t}`, addDays(today, -3));

    await trx('payments').insert({
      transaction_no: `TXN-TEST-${t}-1`,
      type: 'membership_renewal',
      member_id: expiring.memberId,
      subscription_id: expiring.subscriptionId,
      description: 'Test renewal',
      amount: 1200,
      payment_method_id: method.id,
      status: 'paid',
      paid_at: trx.fn.now(),
    });
    // A voided payment must not count as revenue.
    await trx('payments').insert({
      transaction_no: `TXN-TEST-${t}-2`,
      type: 'membership_renewal',
      member_id: expiring.memberId,
      description: 'Entered twice',
      amount: 999,
      payment_method_id: method.id,
      status: 'voided',
      paid_at: trx.fn.now(),
      voided_at: trx.fn.now(),
      void_reason: 'Entered twice',
    });

    const [session] = await trx('attendance_sessions')
      .insert({ member_id: expiring.memberId, check_in_method: 'manual' })
      .returning('id');

    const [customer] = await trx('walkin_customers')
      .insert({ full_name: `Walk-in ${t}` })
      .returning('id');
    const [visit] = await trx('walkin_visits')
      .insert({ walkin_customer_id: customer.id, visit_date: today, fee: 80, fee_type: 'student' })
      .returning('id');
    await trx('payments').insert({
      transaction_no: `TXN-TEST-${t}-3`,
      type: 'walkin',
      walkin_visit_id: visit.id,
      description: 'Walk-in day pass',
      amount: 80,
      payment_method_id: method.id,
      status: 'paid',
      paid_at: trx.fn.now(),
    });

    const [item] = await trx('inventory_items')
      .insert({ name: `Test Water ${t}`, category: 'Drinks and Beverages', reorder_level: 24 })
      .returning('id');
    await trx('stock_movements').insert({
      item_id: item.id,
      type: 'delivery',
      quantity: 5,
      quantity_change: 5,
      movement_date: today,
    });

    return { t, today, method, sessionId: session.id };
  }

  async function snapshot(repo, today) {
    const statusRows = await repo.memberStatusCounts({ recentDays: 7 });
    const by = Object.fromEntries(statusRows.map((r) => [r.status, r]));
    return {
      expiringSoon: by.expiring_soon?.count ?? 0,
      endingTomorrow: by.expiring_soon?.ending_tomorrow ?? 0,
      expired: by.expired?.count ?? 0,
      endedRecently: by.expired?.ended_recently ?? 0,
      revenue: await repo.paidRevenue(`${today.slice(0, 7)}-01`, today),
      checkedIn: await repo.countMembersCheckedIn(today, new Date()),
      walkIns: await repo.countWalkIns(today, new Date()),
      collected: await repo.walkInCollected(today),
      inside: await repo.countInsideNow(today),
    };
  }

  it('keeps DATE columns as YYYY-MM-DD strings', async () => {
    await inRollback(async (trx) => {
      const { rows } = await trx.raw(`SELECT DATE '2026-11-09' AS d`);
      expect(rows[0].d).toBe('2026-11-09');
    });
  });

  it('reads opening hours as HH:MM (Postgres sends 06:00:00)', async () => {
    await inRollback(async (trx) => {
      await trx('gym_settings').insert({ max_capacity: 60 }).onConflict('singleton').ignore();
      await trx('gym_settings').update({ opening_time: '05:30', closing_time: '23:00' });
      const settings = await createDashboardRepo(trx, { timeZone: TZ }).getSettings();
      expect(settings).toMatchObject({ opensAt: '05:30', closesAt: '23:00' });
    });
  });

  it('counts members, revenue, attendance, walk-ins and people inside', async () => {
    await inRollback(async (trx) => {
      const repo = createDashboardRepo(trx, { timeZone: TZ });
      const today = todayInGym();
      const before = await snapshot(repo, today);
      await addFixtures(trx);
      const after = await snapshot(repo, today);

      expect(after.expiringSoon - before.expiringSoon).toBe(1);
      expect(after.endingTomorrow - before.endingTomorrow).toBe(1);
      expect(after.expired - before.expired).toBe(1);
      expect(after.endedRecently - before.endedRecently).toBe(1);
      expect(after.revenue - before.revenue).toBe(1280); // 1200 + 80, voided ₱999 excluded
      expect(after.checkedIn - before.checkedIn).toBe(1);
      expect(after.walkIns - before.walkIns).toBe(1);
      expect(after.collected - before.collected).toBe(80);
      expect(after.inside.members - before.inside.members).toBe(1);
      expect(after.inside.walkIns - before.inside.walkIns).toBe(1);
    });
  });

  it('groups revenue by gym month', async () => {
    await inRollback(async (trx) => {
      const repo = createDashboardRepo(trx, { timeZone: TZ });
      const today = todayInGym();
      const month = today.slice(0, 7);
      const from = `${month}-01`;
      const toExcl = addDays(from, 40).slice(0, 8) + '01';
      const sum = async () =>
        (await repo.monthlyRevenue(from, toExcl)).find((r) => r.month === month)?.revenue ?? 0;
      const before = await sum();
      await addFixtures(trx);
      expect((await sum()) - before).toBe(1280);
    });
  });

  it('lists recent activities with their details', async () => {
    await inRollback(async (trx) => {
      const repo = createDashboardRepo(trx, { timeZone: TZ });
      const { t, method, sessionId } = await addFixtures(trx);
      await trx('attendance_sessions')
        .where({ id: sessionId })
        .update({ check_out_at: trx.raw("now() + interval '1 minute'") });

      const rows = await repo.recentActivities(50);
      const mine = rows.filter((r) => String(r.name).includes(t));
      const types = mine.map((r) => r.type);
      expect(types).toEqual(
        expect.arrayContaining(['registration', 'check_in', 'check_out', 'walk_in', 'payment']),
      );
      const registration = mine.find((r) => r.type === 'registration');
      expect(registration.details).toMatchObject({
        staffName: 'Joy Test',
        staffRole: 'receptionist',
      });
      expect(registration.details.planName).toContain('Test Plan');
      expect(mine.find((r) => r.type === 'check_in').details.method).toBe('manual');
      expect(mine.find((r) => r.type === 'walk_in').details).toMatchObject({
        feeType: 'student',
        fee: 80,
        paymentMethod: method.name,
      });
      const walkInPayment = mine.find(
        (r) => r.type === 'payment' && r.details.paymentType === 'walkin',
      );
      expect(walkInPayment.details.amount).toBe(80);
      expect(mine.some((r) => r.type === 'payment' && r.details.amount === 999)).toBe(false);
      // newest first
      const times = rows.map((r) => new Date(r.at).getTime());
      expect([...times].sort((a, b) => b - a)).toEqual(times);
    });
  });

  it('builds the whole dashboard from the real database', async () => {
    // Read-only, on the pool (the service runs its queries in parallel).
    const service = createDashboardService({
      repo: createDashboardRepo(db, { timeZone: TZ }),
      timeZone: TZ,
    });
    for (const range of ['12m', '6m', 'ytd']) {
      const d = await service.getDashboard({ range, includeRevenue: true });
      expect(d.revenueChart.range).toBe(range);
      expect(d.revenue.thisPeriod).toBeGreaterThanOrEqual(0);
      expect(d.members.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(d.activities)).toBe(true);
    }
  });
});
