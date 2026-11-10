/**
 * IRON CAMPUS GYM — core schema (milestone 1).
 *
 * Gym rules enforced by the database itself (not just the app):
 *  - one open check-in per member, one open walk-in visit per customer
 *  - one active QR token per member
 *  - payments are never deleted; voids/refunds must record a reason
 *  - stock only changes through stock_movements and can never go below zero
 *  - every change to a business table is queued in sync_outbox for the cloud
 */
import {
  INVENTORY_CATEGORIES,
  MEMBERSHIP_STATUS,
  PAYMENT_STATUS_LIST,
  PAYMENT_TYPE_LIST,
  ROLE_LIST,
  STOCK_MOVEMENT_TYPE_LIST,
  SUBSCRIPTION_STATUS_LIST,
} from '@icg/shared';

const list = (values) => values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');

/** Tables mirrored to Supabase (everything except sync bookkeeping and counters). */
const SYNCED_TABLES = [
  'gym_settings',
  'staff_profiles',
  'payment_methods',
  'membership_plans',
  'members',
  'subscriptions',
  'qr_tokens',
  'attendance_sessions',
  'walkin_customers',
  'walkin_visits',
  'payments',
  'inventory_items',
  'stock_movements',
  'notifications',
  'audit_logs',
];

/** Tables with an updated_at column kept current by trigger. */
const UPDATED_AT_TABLES = SYNCED_TABLES.filter((t) => !['stock_movements', 'audit_logs'].includes(t));

export async function up(knex) {
  await knex.raw(`
    -- ── helpers ────────────────────────────────────────────────────────────
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- ── sync bookkeeping ───────────────────────────────────────────────────
    CREATE TABLE sync_outbox (
      id           bigserial PRIMARY KEY,
      table_name   text        NOT NULL,
      row_id       uuid        NOT NULL,
      operation    text        NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
      payload      jsonb,
      created_at   timestamptz NOT NULL DEFAULT now(),
      pushed_at    timestamptz,
      attempts     integer     NOT NULL DEFAULT 0,
      last_error   text
    );
    CREATE INDEX sync_outbox_pending_idx ON sync_outbox (id) WHERE pushed_at IS NULL;

    CREATE TABLE sync_state (
      key        text PRIMARY KEY,
      value      text,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION enqueue_sync() RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        INSERT INTO sync_outbox (table_name, row_id, operation, payload)
        VALUES (TG_TABLE_NAME, OLD.id, 'delete', NULL);
        RETURN OLD;
      END IF;
      INSERT INTO sync_outbox (table_name, row_id, operation, payload)
      VALUES (TG_TABLE_NAME, NEW.id, lower(TG_OP), to_jsonb(NEW));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Atomic counters for Member IDs (ICG-2026-0643) and transaction numbers (TXN-2026-11-0391)
    CREATE TABLE counters (
      key   text PRIMARY KEY,
      value integer NOT NULL DEFAULT 0
    );

    -- ── settings & staff ───────────────────────────────────────────────────
    CREATE TABLE gym_settings (
      id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      singleton             boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
      gym_name              text    NOT NULL DEFAULT 'IRON CAMPUS GYM',
      tagline               text    NOT NULL DEFAULT 'STRONGER EVERY DAY.',
      address               text,
      contact_number        text,
      logo_url              text,
      opening_time          time    NOT NULL DEFAULT '06:00',
      closing_time          time    NOT NULL DEFAULT '22:00',
      max_capacity          integer CHECK (max_capacity IS NULL OR max_capacity > 0),
      show_capacity         boolean NOT NULL DEFAULT true,
      capacity_warning_pct  integer NOT NULL DEFAULT 90 CHECK (capacity_warning_pct BETWEEN 50 AND 100),
      walkin_fee_regular    numeric(10,2) NOT NULL DEFAULT 100 CHECK (walkin_fee_regular >= 0),
      walkin_fee_student    numeric(10,2) NOT NULL DEFAULT 80  CHECK (walkin_fee_student >= 0),
      expiring_soon_days    integer NOT NULL DEFAULT 7 CHECK (expiring_soon_days BETWEEN 1 AND 30),
      created_at            timestamptz NOT NULL DEFAULT now(),
      updated_at            timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE staff_profiles (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      auth_user_id   uuid UNIQUE,                          -- Supabase auth.users.id
      full_name      text NOT NULL,
      username       text NOT NULL UNIQUE,
      email          text UNIQUE,
      role           text NOT NULL CHECK (role IN (${list(ROLE_LIST)})),
      is_active      boolean NOT NULL DEFAULT true,
      last_login_at  timestamptz,
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE payment_methods (
      id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code                      text NOT NULL UNIQUE,
      name                      text NOT NULL,
      requires_reference        boolean NOT NULL DEFAULT false,
      needs_owner_confirmation  boolean NOT NULL DEFAULT false,
      is_active                 boolean NOT NULL DEFAULT true,
      sort_order                integer NOT NULL DEFAULT 0,
      created_at                timestamptz NOT NULL DEFAULT now(),
      updated_at                timestamptz NOT NULL DEFAULT now()
    );

    -- ── memberships ────────────────────────────────────────────────────────
    CREATE TABLE membership_plans (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name             text NOT NULL UNIQUE,
      duration_months  integer NOT NULL DEFAULT 0 CHECK (duration_months >= 0),
      duration_days    integer NOT NULL DEFAULT 0 CHECK (duration_days >= 0),
      price            numeric(10,2) NOT NULL CHECK (price >= 0),
      description      text,
      is_active        boolean NOT NULL DEFAULT true,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now(),
      CHECK (duration_months > 0 OR duration_days > 0)
    );

    CREATE TABLE members (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_code       text NOT NULL UNIQUE,              -- ICG-2026-0643
      auth_user_id      uuid UNIQUE,                       -- member portal login (Supabase)
      full_name         text NOT NULL,
      contact_number    text NOT NULL,
      email             text,
      address           text,
      photo_url         text,
      is_suspended      boolean NOT NULL DEFAULT false,
      suspended_reason  text,
      suspended_at      timestamptz,
      suspended_by      uuid REFERENCES staff_profiles(id),
      registered_by     uuid REFERENCES staff_profiles(id),
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now(),
      CHECK (NOT is_suspended OR suspended_reason IS NOT NULL)
    );
    CREATE INDEX members_name_idx ON members (lower(full_name));
    CREATE INDEX members_contact_idx ON members (contact_number);

    -- One row per paid period. Renewing adds a row; the member, Member ID and QR stay the same.
    CREATE TABLE subscriptions (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id   uuid NOT NULL REFERENCES members(id),
      plan_id     uuid NOT NULL REFERENCES membership_plans(id),
      plan_name   text NOT NULL,                 -- snapshot at time of sale
      price       numeric(10,2) NOT NULL CHECK (price >= 0),
      start_date  date NOT NULL,
      end_date    date NOT NULL,
      status      text NOT NULL DEFAULT 'active' CHECK (status IN (${list(SUBSCRIPTION_STATUS_LIST)})),
      created_by  uuid REFERENCES staff_profiles(id),
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now(),
      CHECK (end_date >= start_date)
    );
    CREATE INDEX subscriptions_member_end_idx ON subscriptions (member_id, end_date DESC);

    -- Random token shown as the member's QR code (no personal data). One active token per member.
    CREATE TABLE qr_tokens (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id       uuid NOT NULL REFERENCES members(id),
      token           text NOT NULL UNIQUE,
      issued_at       timestamptz NOT NULL DEFAULT now(),
      revoked_at      timestamptz,
      revoked_reason  text,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX qr_tokens_one_active_per_member ON qr_tokens (member_id) WHERE revoked_at IS NULL;

    -- ── attendance ─────────────────────────────────────────────────────────
    CREATE TABLE attendance_sessions (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id          uuid NOT NULL REFERENCES members(id),
      check_in_at        timestamptz NOT NULL DEFAULT now(),
      check_out_at       timestamptz,
      check_in_method    text NOT NULL DEFAULT 'qr' CHECK (check_in_method IN ('qr', 'manual')),
      checked_in_by      uuid REFERENCES staff_profiles(id),
      checked_out_by     uuid REFERENCES staff_profiles(id),
      corrected_by       uuid REFERENCES staff_profiles(id),
      correction_reason  text,
      created_at         timestamptz NOT NULL DEFAULT now(),
      updated_at         timestamptz NOT NULL DEFAULT now(),
      CHECK (check_out_at IS NULL OR check_out_at >= check_in_at),
      CHECK (corrected_by IS NULL OR correction_reason IS NOT NULL)
    );
    CREATE UNIQUE INDEX attendance_one_open_session ON attendance_sessions (member_id) WHERE check_out_at IS NULL;
    CREATE INDEX attendance_check_in_idx ON attendance_sessions (check_in_at DESC);

    -- ── walk-ins (kept separate from members) ──────────────────────────────
    CREATE TABLE walkin_customers (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name       text NOT NULL,
      contact_number  text,
      member_id       uuid REFERENCES members(id),   -- set when converted to a member
      converted_at    timestamptz,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX walkin_customers_name_idx ON walkin_customers (lower(full_name));
    CREATE INDEX walkin_customers_contact_idx ON walkin_customers (contact_number);

    CREATE TABLE walkin_visits (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      walkin_customer_id  uuid NOT NULL REFERENCES walkin_customers(id),
      visit_date          date NOT NULL,
      time_in             timestamptz NOT NULL DEFAULT now(),
      time_out            timestamptz,
      fee                 numeric(10,2) NOT NULL CHECK (fee >= 0),
      fee_type            text NOT NULL DEFAULT 'regular' CHECK (fee_type IN ('regular', 'student')),
      registered_by       uuid REFERENCES staff_profiles(id),
      completed_by        uuid REFERENCES staff_profiles(id),
      created_at          timestamptz NOT NULL DEFAULT now(),
      updated_at          timestamptz NOT NULL DEFAULT now(),
      CHECK (time_out IS NULL OR time_out >= time_in)
    );
    CREATE UNIQUE INDEX walkin_one_open_visit ON walkin_visits (walkin_customer_id) WHERE time_out IS NULL;
    CREATE INDEX walkin_visits_date_idx ON walkin_visits (visit_date DESC);

    -- ── payments (never deleted) ───────────────────────────────────────────
    CREATE TABLE payments (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_no     text NOT NULL UNIQUE,                 -- TXN-2026-11-0391
      type               text NOT NULL CHECK (type IN (${list(PAYMENT_TYPE_LIST)})),
      member_id          uuid REFERENCES members(id),
      walkin_visit_id    uuid REFERENCES walkin_visits(id),
      subscription_id    uuid REFERENCES subscriptions(id),
      description        text NOT NULL,
      amount             numeric(10,2) NOT NULL CHECK (amount >= 0),
      payment_method_id  uuid REFERENCES payment_methods(id),  -- null while unpaid
      reference_no       text,
      status             text NOT NULL DEFAULT 'paid' CHECK (status IN (${list(PAYMENT_STATUS_LIST)})),
      paid_at            timestamptz,
      processed_by       uuid REFERENCES staff_profiles(id),
      voided_at          timestamptz,
      voided_by          uuid REFERENCES staff_profiles(id),
      void_reason        text,
      refunded_at        timestamptz,
      refunded_by        uuid REFERENCES staff_profiles(id),
      refund_reason      text,
      created_at         timestamptz NOT NULL DEFAULT now(),
      updated_at         timestamptz NOT NULL DEFAULT now(),
      CHECK (member_id IS NOT NULL OR walkin_visit_id IS NOT NULL OR type = 'product'),
      CHECK (status <> 'paid'     OR (paid_at IS NOT NULL AND payment_method_id IS NOT NULL)),
      CHECK (status <> 'voided'   OR (voided_at IS NOT NULL AND void_reason IS NOT NULL)),
      CHECK (status <> 'refunded' OR (refunded_at IS NOT NULL AND refund_reason IS NOT NULL))
    );
    CREATE INDEX payments_paid_at_idx ON payments (paid_at DESC);
    CREATE INDEX payments_member_idx ON payments (member_id);

    CREATE OR REPLACE FUNCTION forbid_delete() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION '% rows cannot be deleted — void or refund instead', TG_TABLE_NAME
        USING ERRCODE = 'check_violation';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER payments_no_delete BEFORE DELETE ON payments FOR EACH ROW EXECUTE FUNCTION forbid_delete();

    -- ── inventory (consumables only — gym equipment is not tracked here) ───
    CREATE TABLE inventory_items (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name           text NOT NULL UNIQUE,
      category       text NOT NULL CHECK (category IN (${list(INVENTORY_CATEGORIES)})),
      unit           text NOT NULL DEFAULT 'pcs',
      cost_price     numeric(10,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
      selling_price  numeric(10,2) CHECK (selling_price IS NULL OR selling_price >= 0),
      quantity       integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      reorder_level  integer NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
      is_active      boolean NOT NULL DEFAULT true,
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE stock_movements (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id          uuid NOT NULL REFERENCES inventory_items(id),
      type             text NOT NULL CHECK (type IN (${list(STOCK_MOVEMENT_TYPE_LIST)})),
      quantity         integer NOT NULL CHECK (quantity > 0),
      quantity_change  integer NOT NULL,          -- signed, filled by trigger
      quantity_after   integer NOT NULL DEFAULT 0 CHECK (quantity_after >= 0),
      movement_date    date NOT NULL,
      remarks          text,
      payment_id       uuid REFERENCES payments(id),
      created_by       uuid REFERENCES staff_profiles(id),
      created_at       timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX stock_movements_item_idx ON stock_movements (item_id, created_at DESC);

    -- Applies each movement to the item. Removing more than is in stock fails the CHECK above.
    CREATE OR REPLACE FUNCTION apply_stock_movement() RETURNS trigger AS $$
    DECLARE new_qty integer;
    BEGIN
      NEW.quantity_change := CASE WHEN NEW.type IN ('delivery', 'return', 'count_add')
                                  THEN NEW.quantity ELSE -NEW.quantity END;
      UPDATE inventory_items
         SET quantity = quantity + NEW.quantity_change
       WHERE id = NEW.item_id
      RETURNING quantity INTO new_qty;
      NEW.quantity_after := new_qty;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER stock_movements_apply BEFORE INSERT ON stock_movements
      FOR EACH ROW EXECUTE FUNCTION apply_stock_movement();
    CREATE TRIGGER stock_movements_no_delete BEFORE DELETE ON stock_movements
      FOR EACH ROW EXECUTE FUNCTION forbid_delete();

    -- ── notifications & audit ──────────────────────────────────────────────
    CREATE TABLE notifications (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id   uuid NOT NULL REFERENCES members(id),
      kind        text NOT NULL,   -- payment, check_in, expiring, expired, announcement
      title       text NOT NULL,
      body        text NOT NULL,
      read_at     timestamptz,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX notifications_member_idx ON notifications (member_id, created_at DESC);

    CREATE TABLE audit_logs (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id     uuid REFERENCES staff_profiles(id),
      action       text NOT NULL,          -- e.g. payment.void, attendance.fix_checkout
      entity_type  text NOT NULL,
      entity_id    uuid,
      reason       text,
      details      jsonb,
      created_at   timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);
    CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION forbid_delete();

    -- ── reporting view: each member's current status ───────────────────────
    CREATE VIEW member_status_view AS
    SELECT m.id AS member_id,
           m.member_code,
           m.full_name,
           m.is_suspended,
           cur.plan_name,
           cur.start_date,
           cur.end_date,
           CASE
             WHEN m.is_suspended THEN '${MEMBERSHIP_STATUS.SUSPENDED}'
             WHEN cur.end_date IS NULL THEN '${MEMBERSHIP_STATUS.PENDING}'
             WHEN cur.end_date < (now() AT TIME ZONE 'Asia/Manila')::date THEN '${MEMBERSHIP_STATUS.EXPIRED}'
             WHEN cur.end_date - (now() AT TIME ZONE 'Asia/Manila')::date
                  <= (SELECT expiring_soon_days FROM gym_settings LIMIT 1) THEN '${MEMBERSHIP_STATUS.EXPIRING_SOON}'
             ELSE '${MEMBERSHIP_STATUS.ACTIVE}'
           END AS status,
           cur.end_date - (now() AT TIME ZONE 'Asia/Manila')::date AS days_remaining
      FROM members m
      LEFT JOIN LATERAL (
        SELECT s.plan_name, s.start_date, s.end_date
          FROM subscriptions s
         WHERE s.member_id = m.id AND s.status <> 'cancelled'
         ORDER BY s.end_date DESC
         LIMIT 1
      ) cur ON true;
  `);

  for (const table of UPDATED_AT_TABLES) {
    await knex.raw(
      `CREATE TRIGGER ${table}_set_updated_at BEFORE UPDATE ON ${table}
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
    );
  }
  for (const table of SYNCED_TABLES) {
    await knex.raw(
      `CREATE TRIGGER ${table}_enqueue_sync AFTER INSERT OR UPDATE OR DELETE ON ${table}
       FOR EACH ROW EXECUTE FUNCTION enqueue_sync();`,
    );
  }
}

export async function down(knex) {
  await knex.raw(`
    DROP VIEW IF EXISTS member_status_view;
    DROP TABLE IF EXISTS audit_logs, notifications, stock_movements, inventory_items, payments,
      walkin_visits, walkin_customers, attendance_sessions, qr_tokens, subscriptions, members,
      membership_plans, payment_methods, staff_profiles, gym_settings, counters, sync_state,
      sync_outbox CASCADE;
    DROP FUNCTION IF EXISTS apply_stock_movement(), forbid_delete(), enqueue_sync(), set_updated_at();
  `);
}
