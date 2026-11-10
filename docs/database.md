# Database

Schema lives in `apps/api/src/db/migrations/`. The same tables are created in Supabase at milestone 8.

| Table | Purpose |
|---|---|
| `staff_profiles` | Gym staff; `auth_user_id` links to Supabase `auth.users`; role `owner` / `receptionist` |
| `members` | Registered members; `member_code` is the visible ID (`ICG-2026-0643`) |
| `membership_plans` | Plans with duration (months/days), price, active flag |
| `subscriptions` | One row per paid period. Renewals add a row — never a new member |
| `qr_tokens` | Each member's random QR token (one active per member); `revoked_at` when cancelled |
| `attendance_sessions` | Check-in / check-out. Unique index allows **one open session per member** |
| `walkin_customers` | Day-pass customers; `member_id` set when converted to a member |
| `walkin_visits` | Each walk-in visit with time in/out and fee |
| `payment_methods` | Configurable methods (Cash, GCash, Bank Transfer…) |
| `payments` | Every peso received. Status `paid` / `pending` / `voided` / `refunded`; never deleted |
| `inventory_items` | Consumables only (drinks, protein, supplies, cleaning, other) |
| `stock_movements` | Stock in/out; the only way quantities change |
| `gym_settings` | Single row: gym info, capacity, hours, walk-in fees |
| `notifications` | Messages shown in the member portal |
| `audit_logs` | Who changed what, when and why |
| `sync_outbox`, `sync_state` | Cloud sync queue and cursors |

## Status values

Defined once in `packages/shared/src/constants/` and enforced with CHECK constraints.

- Membership: `active`, `expiring_soon` (≤ 7 days left), `expired`, `suspended`, `pending`
- Payment: `paid`, `pending`, `voided`, `refunded`
- Stock movement: `delivery`, `return`, `count_add`, `sold`, `used`, `damaged`, `count_remove`
