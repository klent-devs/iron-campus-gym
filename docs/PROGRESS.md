# Progress log

Update this file at the end of every work session: what was finished, what is waiting, what is next.

## Current status (10 Nov 2026, end of session 2)

**Milestone 1 — Setup: ✅ done** (local database created, migrated and working on this PC)
**Milestone 2 — Admin app shell: 🟡 in progress** (app, layout and UI components done; login not started)
**Dashboard (from milestone 7): ✅ built early** — real data from the local database

Next up: **staff login (Supabase Auth)** to complete milestone 2. It needs a Supabase project first
(see "Waiting on you").

## Done

### 11 Nov 2026 — live clock and spacing (committed and pushed to `main`)

- **Clock in the top bar, on every page** (moved there on 11 Nov from under the sidebar logo, which
  hid it on tablets and used a different date style). Same icon-circle + two-line layout as the staff
  block: "2:48 PM" with "Wed, 11 Nov 2026" underneath, updated each minute. Icon and date show at
  every width (owner's choice); the icon is grey like the staff icon, since orange means "click
  this". Added to the spec in `docs/design/Topbar.dc.html` (note in `docs/design/README.md`). To keep the top bar on one row from 1024 px up, the search box may
  shrink to 180 px (its placeholder is cut to "Search member" at 1024 px); on tablets the staff block
  moves to a second row. Always Manila time, even if the PC's own time zone is wrong (it trusts the PC's
  clock). Code: `components/layout/TopbarClock.jsx`, `lib/useNow.js`, and `formatClock` /
  `formatShortDate` in `packages/shared/src/utils/gymClock.js` (tests:
  `packages/shared/tests/gym-clock.test.js`).
- The Overview subtitle greets by time of day: Good morning / afternoon / evening.
- **Dashboard title is the gym name and motto (12 Nov):** "IRON CAMPUS GYM"
  with "STRONGER EVERY DAY." and a dumbbell icon, replacing "Manage Your Gym Business" and the
  Good morning/afternoon/evening greeting (`greetingFor` in `@icg/shared` is now unused but kept,
  with its tests). Rule noted in `docs/design/README.md`.
- **Sidebar stays still (12 Nov):** the sidebar never scrolls and shows no
  scrollbar (`overflow-hidden` on the `<aside>` in `AppLayout.jsx`), and with the pointer over it
  the mouse wheel doesn't scroll the page either (`data-scroll-lock`, handled in
  `lib/smoothScroll.js`). Help and Logout sit higher (`pb-8`), and the empty space above them
  shrinks first on short windows, so they stay fully visible down to about 650 px tall. Item sizes
  and spacing are unchanged. The phone menu (drawer) still scrolls itself if needed, without a
  visible bar. Checked in Chrome at 900, 768, 720, 680 and 650 px tall.
- **Dashboard header buttons have no fill until hovered (11 Nov):** "+ Add
  Member" turns orange and "Check In Member" grey when the pointer is on them (new `Button` variants
  `plainPrimary` and `plain`). Rule for all page-header buttons is in `docs/design/README.md`.
- **New Payments designs on the canvas and in `docs/design` (11 Nov):**
  `PaymentsEmpty`, `PaymentsNoReceipt`, `ReceiptPrint`, `ReceiptSms`; the canvas Top bar now has
  the clock too.
- **Smoother, slower page scrolling (11 Nov):** the mouse wheel / touchpad now
  moves the page 60% as far per step and glides there (about half a second) instead of jumping.
  `apps/admin/src/lib/smoothScroll.js` (`useSmoothWheelScroll`, used in `AppLayout`), tests in
  `apps/admin/tests/smooth-scroll.test.js`. Tune with `SCROLL_SPEED` (lower = slower) and
  `SCROLL_EASE` (lower = longer glide). Left to the browser: Ctrl+wheel zoom, sideways scrolling,
  boxes that scroll on their own (they'll scroll normally while they can), keyboard, scrollbar,
  touch screens, and Windows "reduce motion". Owner confirmed it feels good (11 Nov).
- **Developer setup guide in the repository:** `docs/SETUP.md` (install list, 7 setup steps with
  checks, troubleshooting, daily git workflow with branches and pull requests, common pitfalls),
  linked from `README.md` and `CLAUDE.md`. Update it when setup steps change.
- **Dashboard consistency pass (11 Nov):** card title rows are always 44 px
  (`CardHeader` `min-h-11`), so titles side by side line up even when one has a button or dropdown;
  empty messages are centred in their card (`EmptyState className="flex-1"` in a `flex-col` card);
  good-news empty states use `tone="success"` (green "All clear"); the page title starts at the same
  edge as the cards (no 4 px indent); empty-state text uses balanced line breaks, with non-breaking
  hyphens in "check-ins"/"walk-ins" so they never split.
- **Opening hours are calculated but not shown.** The owner removed the "Open now · Closes at
  10:00 PM" badge for a cleaner look. `GET /api/dashboard` still returns `gymHours` and the shared
  `gymOpenStatus()` helper is still tested, so it can come back (for example on the Attendance page)
  without new work.
- **Fixed: September showed as "Sept".** Newer Node/browser versions write "Sept" in en-GB, older
  ones "Sep", so dates differed between PCs. `formatDate` now uses fixed 3-letter month names, and the
  clock dates reuse it.
- **Spacing is now one size everywhere: 16 px** around the page and between every block (`gap-4` /
  `p-4` in `AppLayout.jsx` and the dashboard rows). Before, rows were 20 px apart, cards 16 px, and
  the page edges 20 / 16 / 40 px. Keep new pages on `gap-4`.

### Session 2, later the same day — polish, database, co-developer guide

- Local database set up on this PC (see "Waiting on you" for its current contents). The code is on
  GitHub: `klent-devs/iron-campus-gym`, branch `main`.
- Dashboard summary cards now always fill the row: 4 across from 900 px, 2×2 below, 1 on phones
  (`STAT_GRID` in `components/ui/StatCard.jsx`); big numbers shrink to fit narrow cards. Gym Capacity
  and Revenue Analytics share a row on laptop widths.
- Fixed near-invisible headings in empty states: the class `text-base` picks up the preset colour
  named `base`. **Don't use `text-base` in the admin app**; use `text-[16px]`.
- Page no longer "bounces" past the top or bottom (`overscroll-behavior: none` in `index.css`).
  **Committed; not yet confirmed by the owner on their touchpad.**
- **Bug scan (11 Nov):** tests, lint, production build, live API, browser console on every page type,
  the 5 database tests on a throwaway PostgreSQL, a secrets scan and a code read-through. Fixed:
  - the "Couldn't refresh" banner flickered on every 30-second retry (`useApi.js` cleared the error
    too early);
  - amounts of ₱1,000,000.00 or more could overflow a summary card near 1024 px (`StatCard.jsx`);
  - the admin dev proxy ignored `API_PORT` from `.env` (`apps/admin/vite.config.js`);
  - `docs/design` is now in `.prettierignore`, so `npm run format` can't rewrite the approved designs.
    Checked on real SQL: Manila-midnight month boundaries, day-old open sessions are not counted as
    "inside now", payments can't be deleted, one open check-in per member. No secrets in Git.
- **zod upgraded 3.25 → 4.6.7 (11 Nov, merged into `main` and pushed)** to clear the
  high-severity advisory; `npm audit --omit=dev` now reports 0 vulnerabilities.
  - Added `packages/shared/tests/validation-schemas.test.js` (33 tests) first, to pin down every
    schema's behaviour and messages; they pass on both versions.
  - Code changes: `error:` replaces `invalid_type_error` / `errorMap`; `optionalPhMobile` is now
    explicitly `.optional()` (zod 4 rejects a left-out field unless it is optional, which broke
    walk-ins without a contact number); `z.flattenError` in `config/env.js`; new
    `validation/messages.js` keeps the plain "Required" wording for blank fields.
  - **After pulling this, run `npm install` and restart `npm run dev`.** A dev server that was
    already running keeps a cached zod 3 and the Dashboard fails with "z.config is not a function".
  - Cost: the admin bundle grew from about 720 kB to about 1 MB.
- Wrote a 10-page "Tech Stack & Developer Setup Guide" PDF for a co-developer (install list, 7 setup
  steps, troubleshooting, workflow, rules). A copy is in the owner's Windows Downloads folder. Superseded
  on 11 Nov by `docs/SETUP.md` in the repository, which is kept up to date.

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
- [x] GitHub repository created and pushed (`klent-devs/iron-campus-gym`). Everything up to the
      sidebar clock is on `main` (11 Nov).
- [ ] Confirm the page no longer bounces at the bottom when scrolling with the touchpad
- [x] Co-developers added as collaborators (11 Nov). Their setup steps are in `docs/SETUP.md`
      (linked from the README): each needs their own PostgreSQL database and `.env`.
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
- **Test-tool advisories (found 11 Nov):** `npm audit` still lists issues in `vitest` 2 and its
  helpers (`tinypool`, `esbuild`, an older `vite` it bundles). They are development tools only and
  never run on the front-desk PC in production. The fix is vitest 5, a breaking upgrade; do it as its
  own task.
- zod 4's default wording for other problems is technical ("Too big: expected string to have <=120
  characters", "Invalid option: expected one of …"). Add friendly messages to each schema, or extend
  `validation/messages.js`, when the forms are built.
- An empty amount (`''` or `null`) is read as ₱0 by the shared `money` rule, because of number
  conversion. `paymentCreateSchema` rejects ₱0, but member and walk-in payments would accept it.
  Decide when the payment forms are built.
- `errorHandler.js` returns PostgreSQL's `detail` text on duplicate/linked-record errors, which can
  include column values. Replace with friendly wording when the first write endpoints are built.
- **Attendance (milestone 4) must handle missed check-outs:** a check-in left open from a previous day
  still blocks the "one open check-in" rule, so the next scan would check the member _out_ instead of
  in. Decide the rule (auto-close at closing time, or ask staff) when building the scanner.
- About 12 older files (README, CLAUDE.md, seeds, the migration) are not Prettier-formatted. Harmless.
  Don't reformat the migration file.
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
