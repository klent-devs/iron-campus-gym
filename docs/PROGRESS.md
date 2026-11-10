# Progress log

Update this file at the end of every work session: what was finished, what is waiting, what is next.

## Current status (10 Nov 2026, session 2)

**Milestone 1 — Setup: ✅ done (code), ⏳ database not yet created on this PC**
**Milestone 2 — Admin app shell: 🟡 in progress** (app, layout and UI components done; login not started)
**Dashboard (from milestone 7): ✅ built early** — real data from the local database

Next up: finish the setup steps under "Waiting on you", then **staff login (Supabase Auth)** to
complete milestone 2.

## Done

### Session 2 (10 Nov 2026) — Admin website + Dashboard

- `apps/admin`: React 19 + Vite 8 + React Router 7 + Tailwind 3.4 with `@icg/tailwind-preset`
  (Tailwind 3, not 4, because the preset is a v3 JS preset). Fonts bundled locally (`@fontsource`)
  so it works offline. Vite proxies `/api` → `http://127.0.0.1:4000`.
- Root `npm run dev` now starts **both** the API and the admin site (`concurrently`);
  `dev:api`, `dev:admin`, `build:admin` added. ESLint now has React + React Hooks rules.
- Layout from the designs: Sidebar (logo, 8 pages, Help, Logout), Topbar (search, bell, user),
  slide-in menu below 1024 px. Other pages show "Coming soon" with their milestone; unknown URLs get
  a 404 page.
- UI components: Button, Card, StatCard, StatusBadge, EmptyState, Skeleton, Icon.
- API `GET /api/dashboard?range=12m|6m|ytd` (`apps/api/src/modules/dashboard/`): members,
  month-to-date revenue vs the same days last month, today's attendance and walk-ins vs the same time
  last week, monthly revenue chart (expenses = 0), gym capacity, recent activities, alerts.
  Documented in `docs/api.md`.
- Dashboard page matching `Main.dc.html`: summary cards, Revenue Analytics (Recharts, date filter),
  Gym Capacity gauge (refreshes every 30 s), Recent Activities, Alerts, plus loading skeletons,
  empty states, a "can't reach the server" error with Try Again, and a "couldn't refresh" banner.
- New shared helpers (with tests): `capacityLevel`, `stockStatus`, `formatPesoCompact`,
  `dashboardQuerySchema`, `REVENUE_RANGES`, `CAPACITY_LEVEL_LABELS`, `STOCK_STATUS_LABELS`.
  Preset colour `ink-faint` (#52525B) for expense bars.
- API fixes along the way:
  - PostgreSQL DATE columns now stay `'YYYY-MM-DD'` strings (`config/pgTypes.js`); before, pg
    turned them into JS Dates, which can shift the day.
  - 503 "database isn't set up yet" messages now reach the screen instead of a generic error.
  - Async errors are forwarded to the error handler (`lib/asyncHandler.js`).
  - The API now listens on 127.0.0.1 only (`API_HOST`).
- Tests: 72 pass, plus 5 database tests in `apps/api/tests/dashboard.db.test.js` that run only with
  `TEST_DATABASE_URL`. These passed against a throwaway PostgreSQL 18. **The schema migration and seeds
  were run there successfully for the first time** (on a temporary database, not yours). Lint clean.
- Checked in a browser: dashboard at 1440 px with seeded data, the "Coming soon" page, and the
  "server not running" error.

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

- [x] `.env` created; `postgres` password reset (10 Nov) and stored in `DATABASE_URL`
- [x] `iron_campus_gym` database created and migrated (10 Nov). It now holds **only the setup data**
      (plans, payment methods, gym settings, owner account), with no demo members, so the Dashboard
      shows all zeros. To load the demo data again: `npm run db:seed`. To start empty again, run from
      `apps/api`: `npx knex migrate:rollback --all && npx knex migrate:latest && npx knex seed:run --specific=01_reference.js`
      (this wipes everything).
- [x] `npm run dev` → http://localhost:5173 works; `/api/health` shows `"database": "up"`.
- [ ] Optional: create a second database `iron_campus_gym_test` and set
      `TEST_DATABASE_URL` to run the database tests (`npm test`)
- [ ] Create the GitHub repository and push (the initial commit already exists on `main`;
      session 2's work is **not committed yet**)
- [ ] Before login: create a free Supabase project and put its URL and keys in `.env`

## Next: finish Milestone 2 — staff login

Supabase Auth login (`AdminLogin.dc.html`), offline staff login (`docs/architecture.md`), staff
roles. Replace the placeholder `apps/api/src/middleware/staffContext.js` with real token checks,
add a sign-in guard around the admin routes, fill in the Topbar user and Logout. Search for
`TODO(auth)`.

## Known gaps / follow-ups

- **No login yet:** every API request is treated as the owner. This is safe only because the API
  listens on 127.0.0.1. Don't set `API_HOST=0.0.0.0` before login exists.
- **Expenses** aren't recorded anywhere, so the chart shows ₱0 expenses with a note. Adding expense
  tracking is not in the brief; decide later.
- `member_status_view` reads `expiring_soon_days` from `gym_settings`. If that row is missing, no one
  is ever "Expiring Soon". The reference seed creates it, but a future migration could add a
  `COALESCE(…, 7)` fallback.
- `packages/shared` `membershipStatus()` uses the fixed `EXPIRING_SOON_DAYS = 7`, while the database
  view uses the Settings value. They'll disagree if the owner changes it. Align them when Settings is
  built.
- The demo seed creates everything in one transaction, so all demo activities share the same time.
- The admin JS bundle is about 720 kB (Recharts + zod). That's fine on the local PC; split it later if
  needed.

## Decisions made along the way

- QR token stored as-is (random, no personal data) rather than hashed, so the admin can print it and the
  member portal can show it. Revocable; one active per member.
- Cloud sync queue is filled by database triggers, so no change can be missed.
- Durable gym equipment is not tracked in inventory (consumables only), per the brief.
- Sample prices and capacity are starting values; the owner changes them in Settings.
- Dashboard "Monthly Revenue" compares **this month so far with the same days last month**
  ("vs 1–10 Oct"), not the whole of last month, which would always look like a big drop early in the
  month.
- Attendance and walk-ins compare with the **same weekday last week, up to the same time of day**.
- "Inside now" counts only check-ins and walk-in visits that started **today**. Older open
  check-ins are missed check-outs, fixed on the Attendance page.
- Receptionists get no revenue from the API at all (`revenue`, `revenueChart`,
  `walkIns.collectedToday` are null), not just hidden in the screen.
- Revenue = payments with status `paid`; voided, refunded and pending payments are left out.
- Small wording changes from the design so the screen tells the truth: capacity says "Updates every
  30 seconds", and the expired alert says "N expired in the past 7 days" (instead of "this week").
  The stat cards' "⋮" menus were left out because the design gives them no action.
