# IRON CAMPUS GYM — notes for Claude

Gym management system for one real gym in the Philippines. It has an admin website for the owner and
front desk, a local API and database that keep working offline, a sync service to Supabase, and a
mobile-friendly member portal. This is production software for real staff and paying members, not a
demo.

## Stack (do not change without asking)
- JavaScript only (ES modules, no TypeScript). npm workspaces monorepo.
- Admin website: React + Vite + Tailwind CSS (`apps/admin`)
- Local backend: Node.js + Express + Knex + PostgreSQL (`apps/api`)
- Cloud: Supabase Postgres + Supabase Auth (`supabase/`), custom Node sync service (`apps/sync`)
- Member portal: React + Vite + Tailwind, mobile-first PWA (`apps/member-portal`)
- Tests: Vitest (+ Supertest for the API). Lint: ESLint. Format: Prettier.

## Commands (run from the repo root)
- `npm run dev` — start the API (http://localhost:4000, health at `/api/health`)
- `npm run db:migrate` / `npm run db:seed` / `npm run db:reset`
- `npm test` — all tests; `npm run lint`; `npm run format`
- Always run `npm test` and `npm run lint` before saying a task is done.

## Where things go
- `packages/shared` — status names, roles, ₱/date helpers, Member ID and transaction number formats,
  membership rules (`computeEndDate`, `membershipStatus`, `canEnter`, `renewalStartDate`) and zod
  validation. **Reuse these; never duplicate business rules in an app.**
- `packages/tailwind-preset` — brand colours/fonts. Use classes like `bg-base`, `bg-card`, `border-line`,
  `bg-brand`, `text-brand-text`, `text-ink-muted`, `font-heading`. Don't hard-code hex colours.
- `apps/api/src/modules/<area>/` — one folder per business area, with `<area>.routes.js`,
  `.controller.js`, `.service.js`, `.repo.js`. Mount new routes in `apps/api/src/app.js`.
  Add a test file per module in `apps/api/tests/`.
- `apps/admin/src/features/<area>/` — pages, components and one `api.js` per area.
  Shared UI in `src/components/ui`, layout in `src/components/layout`.
- Database changes: **new Knex migration file** in `apps/api/src/db/migrations/`. Never edit a migration
  that has already been run.

## Designs = the spec
Approved screens are in `docs/design/*.dc.html` (index: `docs/design/README.md`). Match their layout,
labels, button wording, states and sample data when building pages. Read the relevant design file
before building a screen.

## Gym rules (enforced in the database — keep them)
- One open check-in per member; scanning again checks out. Expired or suspended members are rejected.
- Renewing adds a new `subscriptions` row. The member keeps the same Member ID and QR token.
  Renewal starts the day after the current period ends (or today if already expired).
- Walk-ins are separate from members. Converting a walk-in sets `walkin_customers.member_id`.
  Never create a duplicate person.
- Payments are never deleted. Voids and refunds are Owner-only, need a reason, and keep history.
- Inventory quantity changes only by inserting into `stock_movements`. Stock can't go below 0.
- Important changes (voids, refunds, fixing check-outs, price changes, suspensions) write to `audit_logs`.
- The QR code contains only `ICG:<random token>`, never personal data.
- Roles: `owner` (full access) and `receptionist` (no settings, prices, voids/refunds or revenue reports).
  Check roles on the API, not only in the UI.

## UX rules (from the client brief)
- Staff have mixed computer skills: simple words, labels next to icons, large buttons (≥ 44 px),
  short forms, auto-fill where possible, clear success/error messages, confirm important actions.
- Button labels like "Add Member", "Record Payment", "Check In", "Register Walk-in", "Save Changes".
- Money in pesos (₱1,200.00) via `formatPeso`. Dates like "09 Nov 2026" via `formatDate`. Gym time zone
  is Asia/Manila.
- Do not add features outside the brief: no trainers, scheduling, social features, workout programs or
  online shopping.

## Build milestones (update the ✅ as they finish)
**Read `docs/PROGRESS.md` first** — it says what is done, what is waiting on the user, and what is next.
Update it at the end of every work session.

1. ✅ Setup: workspaces, shared package, Tailwind preset, schema, seeds (database not yet migrated on this PC)
2. Admin app shell: Vite + Tailwind, Supabase Auth login, staff roles, Sidebar/Topbar, UI components
3. Members & memberships (list, add, profile, plans, monitoring, renewal)
4. Attendance (QR scanner, check-in/out, records, fix missed check-out)
5. Walk-ins & payments (register, records, convert to member, receipts, void/refund)
6. Inventory (items, stock in/out, low/out-of-stock alerts)
7. Dashboard, reports (PDF/Excel/print), settings, staff accounts
8. Supabase schema + RLS, sync service
9. Member portal (PWA)
10. Hardening: tests, backups, deployment to the front-desk PC

More detail: `README.md`, `docs/architecture.md`, `docs/database.md`, `docs/api.md`.
