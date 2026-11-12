# Progress log

Update this file at the end of every work session: what was finished, what is waiting, what is next.

## Current status (12 Nov 2026)

**Milestone 1 — Setup: ✅ done** (local database created, migrated and working on this PC)
**Milestone 2 — Admin app shell: 🟡 in progress** (app, layout, UI components and the **login
screen (demo)** done; real Supabase sign-in, sign-in guard and staff roles still to do)
**Dashboard (from milestone 7): ✅ built early** — real data from the local database
**Walk-ins (from milestone 5): 🟡 screens built on sample data** — Walk-in Records page and the
Register Walk-in pop-up; not connected to the database yet
**Attendance (milestone 4): 🟡 screens built on sample data** — QR scanner page and Attendance
Records with Fix missed check-out; not connected to the database yet

Next up: **connect the login screen to Supabase Auth** (a teammate is doing this) to complete
milestone 2. It needs a Supabase project first (see "Waiting on you").

## Done

### 12 Nov 2026 — Attendance: scanner + records (UI + sample data, no database)

- **`/attendance`** (`features/attendance/ScannerPage.jsx`) from `Attendance.dc.html`: summary
  cards (Today's Attendance, Currently Inside x / 60 incl. walk-ins, Checked Out with average stay,
  Rejected Today), QR Code Scanner card, big result panel, Currently Inside list with Check Out.
  - Three ways to scan: **camera** (live picture; reads codes where the browser has a built-in QR
    reader, `BarcodeDetector`, otherwise it says so), **USB QR scanner** (it types `ICG:…` + Enter;
    caught anywhere on the page), or **typing** a Member ID / name (matching members are listed
    with their status and a Check In / Check Out button).
  - Result panel states from the design's `result` tweak: Access Granted (amber "Expires" when
    expiring soon), Checked Out, Membership Expired (Renew Membership → /members for now,
    Register Walk-in opens the walk-in pop-up with the name filled in), Membership Suspended,
    Invalid QR Code, plus a "Ready to scan" state. Check In on someone inside / Check Out on someone
    not inside shows a message under the box instead.
  - "Try a sample scan" buttons (demo only) to see every state without a phone.
  - Walk-ins in Currently Inside open the walk-in Complete Visit pop-up.
- **`/attendance/records`** (`AttendanceRecordsPage.jsx`) from `AttendanceRecords.dc.html`: amber
  banner for missed check-outs, search, date filter (Today, Yesterday, This week, Pick a date…),
  table, footer totals. Missed check-outs stay at the top in any date until fixed.
  **Fix missed check-out** pop-up (`components/FixTimeOutModal.jsx`): time out on the check-in day
  (suggested: time in + 1h 30m, max 10 PM), reason required, must be after time in and not in the
  future; the row then shows a "Fixed" badge (reason on hover).
- Rules and helpers in `features/attendance/demoData.js` (uses the shared `membershipStatus` /
  `canEnter` / `parseQrPayload`), store in `demoStore.js`, tests in
  `apps/admin/tests/attendance-demo.test.js`.
- **Missed check-out rule used in the demo:** a check-in left open from an earlier day does **not**
  turn the next scan into a check-out. The member is checked in for today and the old visit shows as
  "No time out" until staff fix it. The database rule "one open check-in per member" will need to
  allow this (or auto-close old ones) when the API is built — confirm with the owner.
- Not done yet: the signed-in staff name in the fix pop-up, the 48-hour limit for receptionists, the
  audit log entry, and sound on scan (all need the API / sign-in).

### 12 Nov 2026 — Walk-in summary cards match the Dashboard

- Walk-in Records' four summary boxes now use the shared `StatCard` (same size, icon and note line as
  the Dashboard). `StatCard` gained `tone` (`brand` / `danger`), `className` and `style`.
- Fixed: the Unpaid red border never showed (`border-line` beat `border-danger/50`). Unpaid now shows
  the amount (₱100.00) with "1 visit to collect" underneath, instead of "1 · ₱100.00".

### 12 Nov 2026 — Register Walk-in pop-up redesign (owner asked for a better design)

- Icons inside Customer Name / Contact Number, soft orange glow on the field being typed in.
- **"Been here before?"**: typing 2+ letters of a name lists up to 3 past walk-in customers (number,
  visits, last visit); picking one fills the name and number so no duplicate person is made.
- Visit Date and Time In are shown as two read-only boxes (no fake text box); the old grey "Time in
  is recorded…" note is folded into the Time In box.
- Fee buttons show the type and a large price; payment buttons have icons; the picked button has a
  tick. "Pay later" shows an amber "Saved as Unpaid" warning. Same buttons in Record Payment.
- Differs from `docs/design/WalkIn.dc.html` in these points; labels and button wording unchanged.

### 12 Nov 2026 — Walk-in page transitions

- Pop-ups fade and scale in and out; the View History panel slides in and out from the right
  (`components/ui/Presence.jsx` keeps a pop-up on screen for 200 ms after closing so it can leave).
  Messages (`Toast`) slide in, show a countdown bar, and slide out.
- Walk-in Records: the page blocks rise in one after another; rows fade in when the date/status filter
  changes; the row that was just registered, paid or completed glows orange and scrolls into view;
  summary numbers slide up when they change.
- Register Walk-in: fields with a mistake give a small shake and the error message slides in.
- All buttons shrink slightly when pressed. Everything is off when "reduce motion" is turned on
  (`motion-safe:`, `lib/motion.js`). Animations live in `apps/admin/tailwind.config.js`.

### 12 Nov 2026 — Walk-in Records + Register Walk-in pop-up (UI + sample data, no database)

- **`/walk-ins`** (`features/walkins/WalkInRecordsPage.jsx`) from `WalkInRecords.dc.html`: summary
  boxes (Walk-ins Today, Still Inside, Collected Today, Unpaid with a red border when > 0), search by
  name or number, date filter (Today · Thu, 12 Nov / Yesterday / This week / This month; weeks start
  Monday), All / Inside / Completed / Unpaid chips with counts, the table, footer totals, and the
  "Nothing here" empty state. Row buttons: **Record Payment** (unpaid), **Complete Visit** (still
  inside), **View History** (side panel with visits, spent this month, first visit, the Monthly-plan
  hint from the 4th visit in a month, and **Make Member**, which opens the Members placeholder).
- **Register Walk-in pop-up** (`QuickWalkInModal.jsx`) from `WalkIn.dc.html`, opened by "+ REGISTER
  WALK-IN": Customer Name, Contact Number (optional), Visit Date (today, read-only), Walk-in Fee
  (Regular ₱100.00 / Student ₱80.00), Payment Method (Cash / GCash / Pay later), the live "Time in
  is recorded automatically…" note, Cancel / "Confirm Visit · ₱100.00" ("· Pay Later" when paying
  later). Checked by the shared `walkinVisitCreateSchema` (blank name, bad number → message under
  the field). A returning customer (same number, or same name with no number) is reused, never
  duplicated.
- Success messages after each action (new `Toast` / `useToast` in `components/ui`), and a reusable
  `Modal` (pop-up and side panel; Esc, ✕ and backdrop close it, Tab stays inside, the cursor goes to
  the first field). Use these for the other pages' pop-ups.
- **Sample data only.** `demoData.js` has the 8 visits from the design (times set back from "now" by
  the design's gaps) plus 3 earlier visits for Ryan; `demoStore.js` keeps changes while moving between
  pages and loses them on reload. The page title shows a "Sample data · not saved yet" badge; remove
  it when the API is connected. `TODO(api)` marks what to replace (fees and the Monthly price come
  from settings/plans later).
- Differences from the designs: header buttons follow the owner's "no fill until hovered" rule;
  amounts use `formatPeso` (₱100.00, not ₱100); "Pick dates…" is left out of the date filter for
  now; GCash has no reference-number box yet (the shared method list says GCash needs one; decide when
  connecting payments); the table padding is tighter (12 px) so all three row buttons fit at 1440 px
  (in the design the last column is cut off).
- Checked in Chrome at 1440 px and 390 px: register (empty → errors → filled → saved), Record
  Payment, Complete Visit, View History, the Unpaid filter, no console errors, no sideways scroll on
  phones. Tests: `apps/admin/tests/walkins-demo.test.js`.

### 12 Nov 2026 — Login screen (UI + demo only, no authentication)

- **`/login` page built from `AdminLogin.dc.html`** (`apps/admin/src/features/auth/LoginPage.jsx`),
  shown without the sidebar/top bar. Same layout, wording and sizes as the design: brand panel with
  the logo, "STRONGER EVERY DAY." and the faded weight plate; "Welcome Back" form with Username or
  email, Password with Show/Hide, Remember Me, Forgot Password?, Sign In. Stacks (brand panel on top)
  below about 1000 px; the motto shrinks to 44 px on phones. Checked at 1440, 820 and 390 px.
- Additions the design implies but doesn't draw: plain error under a blank field ("Enter your
  username or email", "Enter your password") with a red border and the cursor moved there; orange
  border on the field being typed in; "Signing In…" with a spinner; a "Couldn't sign in" message box
  (style from the notifications in `Components.dc.html`). **Forgot Password?** shows a note: "Ask the
  gym owner to set a new one for you in Settings → Staff Accounts" (staff accounts are made by the
  owner). **Remember Me** keeps only the username/email on this PC (`rememberedLogin.js`), never
  the password, and puts the cursor straight in Password next time.
- **Demo sign-in, no authentication:** `features/auth/api.js` `signIn()` accepts anything after
  0.6 s and opens the Dashboard. **Logout** in the sidebar now just goes to `/login`. The rest of the
  app is still open without signing in.
- **For the teammate connecting Supabase:** replace the body of `signIn()` in
  `features/auth/api.js` (keep its shape: resolve with the staff member, or throw an `ApiError` whose
  message is shown to staff as-is; the page needs no other change), make Logout really sign out
  (`Sidebar.jsx`), and add the sign-in guard in `App.jsx`. Search for `TODO(auth)`. The form is
  checked by the shared `staffLoginSchema` (`packages/shared/src/validation/auth.js`), which the API
  should reuse.
- New: icons `account` and `lock`; preset colour `ink-dim` (#71717A, used for the field placeholders).
  **Footnote is white** ("Staff accounts are created by the gym owner."), not the design's grey: owner's choice, 12 Nov.
  **Restart `npm run dev`** after pulling (Tailwind reads the preset only at start-up).
- Tests: `packages/shared/tests/auth-validation.test.js`, `apps/admin/tests/remembered-login.test.js`.

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
- **Dropdown polish (12 Nov):** the "Last 12 months" arrow sits 16 px in from
  the edge (own chevron icon, `appearance-none`), and dropdowns no longer keep the orange focus ring
  after a mouse click. `lib/inputModality.js` sets `<html data-input="mouse|keyboard">`; `index.css`
  hides the ring on `<select>` in mouse mode, so keyboard (Tab) users still see it.
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

## Next: finish Milestone 2 — connect staff login (login screen already built, demo only)

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
