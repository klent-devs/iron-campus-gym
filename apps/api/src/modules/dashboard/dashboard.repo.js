import { GYM_TIMEZONE, addDays } from '@icg/shared';

/** Start of a gym calendar day ('YYYY-MM-DD') as a timestamptz, so indexes on timestamps work. */
const DAY_START = '((?::date)::timestamp AT TIME ZONE ?)';

const toNumber = (value) => Number(value ?? 0);

/**
 * Database reads for the dashboard. Returns plain rows/numbers; the service does the maths.
 * Dates are gym-calendar days ('YYYY-MM-DD'); `until` values are JS Dates.
 * @param {import('knex').Knex} db
 */
export function createDashboardRepo(db, { timeZone = GYM_TIMEZONE } = {}) {
  return {
    async getSettings() {
      const row = await db('gym_settings').first(
        'max_capacity',
        'capacity_warning_pct',
        'expiring_soon_days',
      );
      if (!row) return null;
      return {
        maxCapacity: row.max_capacity,
        warningPct: row.capacity_warning_pct,
        expiringSoonDays: row.expiring_soon_days,
      };
    },

    /** One row per membership status, with how many end today/tomorrow or ended recently. */
    async memberStatusCounts({ recentDays }) {
      const { rows } = await db.raw(
        `SELECT status,
                count(*)::int                                                   AS count,
                count(*) FILTER (WHERE days_remaining = 0)::int                 AS ending_today,
                count(*) FILTER (WHERE days_remaining = 1)::int                 AS ending_tomorrow,
                count(*) FILTER (WHERE days_remaining BETWEEN ? AND -1)::int    AS ended_recently
           FROM member_status_view
          GROUP BY status`,
        [-recentDays],
      );
      return rows;
    },

    /** Sum of paid payments from `fromDate` to `toDate`, both days included. */
    async paidRevenue(fromDate, toDate) {
      const { rows } = await db.raw(
        `SELECT coalesce(sum(amount), 0) AS total
           FROM payments
          WHERE status = 'paid'
            AND paid_at >= ${DAY_START} AND paid_at < ${DAY_START}`,
        [fromDate, timeZone, addDays(toDate, 1), timeZone],
      );
      return toNumber(rows[0]?.total);
    },

    /** Paid revenue per gym month ('YYYY-MM'), from `fromDate` up to (not including) `toDateExclusive`. */
    async monthlyRevenue(fromDate, toDateExclusive) {
      const { rows } = await db.raw(
        `SELECT to_char(paid_at AT TIME ZONE ?, 'YYYY-MM') AS month, sum(amount) AS revenue
           FROM payments
          WHERE status = 'paid'
            AND paid_at >= ${DAY_START} AND paid_at < ${DAY_START}
          GROUP BY 1`,
        [timeZone, fromDate, timeZone, toDateExclusive, timeZone],
      );
      return rows.map((r) => ({ month: r.month, revenue: toNumber(r.revenue) }));
    },

    /** Members who checked in on `date`, up to the moment `until` (each member counted once). */
    async countMembersCheckedIn(date, until) {
      const { rows } = await db.raw(
        `SELECT count(DISTINCT member_id)::int AS n
           FROM attendance_sessions
          WHERE check_in_at >= ${DAY_START} AND check_in_at < ${DAY_START}
            AND check_in_at <= ?`,
        [date, timeZone, addDays(date, 1), timeZone, until],
      );
      return rows[0].n;
    },

    /** Walk-in visits on `date`, up to the moment `until`. */
    async countWalkIns(date, until) {
      const row = await db('walkin_visits')
        .where({ visit_date: date })
        .andWhere('time_in', '<=', until)
        .count('* as n')
        .first();
      return toNumber(row?.n);
    },

    /** Walk-in fees paid on `date`. */
    async walkInCollected(date) {
      const { rows } = await db.raw(
        `SELECT coalesce(sum(amount), 0) AS total
           FROM payments
          WHERE status = 'paid' AND type = 'walkin'
            AND paid_at >= ${DAY_START} AND paid_at < ${DAY_START}`,
        [date, timeZone, addDays(date, 1), timeZone],
      );
      return toNumber(rows[0]?.total);
    },

    /**
     * People inside right now: open member check-ins and open walk-in visits that started today.
     * Older open check-ins are missed check-outs (fixed on the Attendance page), not people inside.
     */
    async countInsideNow(today) {
      const { rows } = await db.raw(
        `SELECT
           (SELECT count(*)::int FROM attendance_sessions
             WHERE check_out_at IS NULL AND check_in_at >= ${DAY_START}) AS members,
           (SELECT count(*)::int FROM walkin_visits
             WHERE time_out IS NULL AND visit_date = ?) AS walk_ins`,
        [today, timeZone, today],
      );
      return { members: rows[0].members, walkIns: rows[0].walk_ins };
    },

    /** Latest registrations, check-ins, check-outs, walk-ins and payments, newest first. */
    async recentActivities(limit) {
      const { rows } = await db.raw(
        `SELECT * FROM (
           (SELECT 'registration' AS type, m.id, m.created_at AS at, m.full_name AS name,
                   jsonb_build_object('memberCode', m.member_code, 'planName', first_sub.plan_name,
                                      'staffName', st.full_name, 'staffRole', st.role) AS details
              FROM members m
              LEFT JOIN staff_profiles st ON st.id = m.registered_by
              LEFT JOIN LATERAL (
                SELECT s.plan_name FROM subscriptions s
                 WHERE s.member_id = m.id ORDER BY s.created_at, s.start_date LIMIT 1
              ) first_sub ON true
             ORDER BY m.created_at DESC LIMIT ?)
           UNION ALL
           (SELECT 'check_in', a.id, a.check_in_at, m.full_name,
                   jsonb_build_object('memberCode', m.member_code, 'method', a.check_in_method)
              FROM attendance_sessions a JOIN members m ON m.id = a.member_id
             ORDER BY a.check_in_at DESC LIMIT ?)
           UNION ALL
           (SELECT 'check_out', a.id, a.check_out_at, m.full_name,
                   jsonb_build_object('memberCode', m.member_code, 'checkInAt', a.check_in_at)
              FROM attendance_sessions a JOIN members m ON m.id = a.member_id
             WHERE a.check_out_at IS NOT NULL
             ORDER BY a.check_out_at DESC LIMIT ?)
           UNION ALL
           (SELECT 'walk_in', v.id, v.time_in, c.full_name,
                   jsonb_build_object('feeType', v.fee_type, 'fee', v.fee,
                                      'paymentMethod', pay.method_name)
              FROM walkin_visits v
              JOIN walkin_customers c ON c.id = v.walkin_customer_id
              LEFT JOIN LATERAL (
                SELECT pm.name AS method_name
                  FROM payments p JOIN payment_methods pm ON pm.id = p.payment_method_id
                 WHERE p.walkin_visit_id = v.id AND p.status = 'paid'
                 ORDER BY p.paid_at DESC LIMIT 1
              ) pay ON true
             ORDER BY v.time_in DESC LIMIT ?)
           UNION ALL
           (SELECT 'payment', p.id, p.paid_at, coalesce(m.full_name, c.full_name),
                   jsonb_build_object('amount', p.amount, 'paymentType', p.type,
                                      'transactionNo', p.transaction_no, 'paymentMethod', pm.name)
              FROM payments p
              LEFT JOIN members m ON m.id = p.member_id
              LEFT JOIN walkin_visits v ON v.id = p.walkin_visit_id
              LEFT JOIN walkin_customers c ON c.id = v.walkin_customer_id
              LEFT JOIN payment_methods pm ON pm.id = p.payment_method_id
             WHERE p.status = 'paid'
             ORDER BY p.paid_at DESC LIMIT ?)
         ) feed
         ORDER BY at DESC
         LIMIT ?`,
        [limit, limit, limit, limit, limit, limit],
      );
      return rows;
    },

    /** Active inventory items (consumables only, so the list is short). */
    async stockItems() {
      const rows = await db('inventory_items')
        .where({ is_active: true })
        .select('name', 'quantity', 'reorder_level', 'unit')
        .orderBy([{ column: 'quantity' }, { column: 'name' }]);
      return rows.map((r) => ({
        name: r.name,
        quantity: r.quantity,
        reorderLevel: r.reorder_level,
        unit: r.unit,
      }));
    },
  };
}
