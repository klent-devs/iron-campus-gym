# Progress log

Update this file at the end of every work session: what was finished, what is waiting, what is next.

## Current status (10 Nov 2026)

**Milestone 1 — Setup: ✅ done (code), ⏳ database not yet created on this PC**

Next up: finish the setup steps below, then start **Milestone 2 — Admin app shell**.

## Done

### Design (on the canvas: https://claude.ai/artifact/LEFM75kDEgWyt3LiFYdCpi)
- Brand: IRON CAMPUS GYM logo (weight-plate "C" + barbell "I"), full and icon versions, colour palette,
  typography — `docs/design/Brand.dc.html`
- Design system and every UI state (loading, empty, success, errors, confirmations, low/out of stock,
  invalid QR) — `docs/design/Components.dc.html`
- 22 admin screens: login, dashboard, member list, add member, member profile, plans and monitoring,
  5-step renewal, QR scanner, attendance records, walk-in registration, walk-in records, walk-in quick
  pop-up, payments + receipt, inventory, add/edit item + stock in/out, reports, settings, staff accounts
- 8 member portal screens: login, home, membership, my QR, attendance, payments, profile, notifications
- All designs copied into `docs/design/` with an index (`docs/design/README.md`)

### Planning
- Tech stack confirmed: JavaScript, React + Vite + Tailwind, Node.js + Express, PostgreSQL,
  Supabase (Postgres + Auth), custom Node sync service, React member portal (PWA), Git + GitHub
- Architecture and folder structure agreed — `docs/architecture.md`

### Milestone 1 — Setup (code)
- npm workspaces monorepo; ESLint, Prettier, Vitest; `.env.example`; VS Code recommended extensions
- `packages/shared`: roles, membership/payment/stock status names; ₱ and Manila date helpers;
  Member ID `ICG-2026-0643` and transaction no. `TXN-2026-11-0391` formats; membership rules
  (end dates, days left, status, who may enter, renewal start); form validation with friendly messages
- `packages/tailwind-preset`: brand colours, fonts and radii from the design system
- `apps/api`: Express app, `/api/health`, friendly error handling, env checking, Knex config,
  Member ID / transaction counters, QR token helpers
- Database schema (`apps/api/src/db/migrations/20261109000001_core_schema.js`): 18 tables with gym rules
  enforced by PostgreSQL — one open check-in per member, one open walk-in visit, one active QR per member,
  payments can't be deleted and voids/refunds need a reason, stock only via movements and never below 0,
  automatic sync queue (`sync_outbox`) for the cloud
- Seeds: plans (Monthly ₱1,200, Student ₱900, Quarterly ₱3,300, Annual ₱12,000), payment methods
  (Cash, GCash, Bank Transfer), gym settings (capacity 60), owner account, demo members/walk-ins/stock
- Placeholders for `apps/admin`, `apps/member-portal`, `apps/sync`, `supabase/`
- `CLAUDE.md` with project rules for the Claude agent in VS Code
- Checks: 28 tests pass, lint clean, API starts

## Waiting on you
- [ ] Copy `.env.example` → `.env` and put your PostgreSQL password in `DATABASE_URL`
- [ ] `createdb -U postgres iron_campus_gym`, then `npm run db:migrate` and `npm run db:seed`
      (the schema has not been run against a real database yet — report any error)
- [ ] `npm run dev` and check http://localhost:4000/api/health shows `"database": "up"`
- [ ] Create the GitHub repository, then make the first commit and push
      (Git is initialised on `main` with **no commits yet**, by choice)
- [ ] Before Milestone 2: create a free Supabase project and put its URL and keys in `.env`

## Next: Milestone 2 — Admin app shell
Set up `apps/admin` (Vite + React + Tailwind with `@icg/tailwind-preset`), Supabase Auth login
(`AdminLogin.dc.html`), staff roles, `Sidebar` / `Topbar` layout, and the shared UI components from
`Components.dc.html`.

## Decisions made along the way
- QR token stored as-is (random, no personal data) rather than hashed, so the admin can print it and the
  member portal can show it. Revocable; one active per member.
- Cloud sync queue is filled by database triggers, so no change can be missed.
- Durable gym equipment is not tracked in inventory (consumables only), per the brief.
- Sample prices and capacity are starting values; the owner changes them in Settings.
