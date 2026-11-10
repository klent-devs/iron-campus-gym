# Architecture

```
 Front desk PC (gym LAN)                          Cloud
 ┌───────────────────────────┐            ┌──────────────────────┐
 │ Admin website (React)     │            │ Supabase              │
 │        │ REST /api        │            │  - Postgres (mirror)  │
 │ Express API ── Local PG ◄─┼── sync ───►│  - Auth (staff+member)│
 │                           │  service   │  - RLS policies       │
 │ Sync service (outbox)     │            └──────────▲───────────┘
 └───────────────────────────┘                       │ supabase-js
                                          ┌──────────┴───────────┐
                                          │ Member portal (React)│
                                          └──────────────────────┘
```

## Rules

1. **Local PostgreSQL is the source of truth** for front-desk work (check-ins, walk-ins, payments,
   stock). The gym keeps working when the internet is down.
2. **Supabase is the cloud copy.** The member portal reads only from Supabase; Row Level Security lets
   each member see only their own rows.
3. **UUID primary keys + `created_at` / `updated_at` on every table**, so local and cloud rows share IDs.
4. **Outbox sync.** A database trigger on every business table writes each insert/update/delete into
   `sync_outbox` in the same transaction, so no change can be missed. The sync service pushes those rows
   to Supabase and pulls back the few member-made changes (profile edits, notification read flags).
5. **Conflicts:** money and attendance are only ever written locally (local wins). Member profile fields
   use last-write-wins by `updated_at`.
6. **QR codes hold only a random 32-character token** (`ICG:<token>`) with no personal data. It is
   stored in `qr_tokens` so the admin can print it and the member portal can show it. Only one active
   token per member; revoking/reissuing never changes the Member ID, and renewals keep the same token.
7. **Nothing financial is deleted.** Voids and refunds change status and record who and why.
8. **Stock quantity changes only through `stock_movements`.**

## Offline staff login (to build in milestone 2)

Supabase Auth needs internet. After a successful online sign-in, the API stores a signed, expiring
session for that staff member so the front desk can keep signing in during an outage.
