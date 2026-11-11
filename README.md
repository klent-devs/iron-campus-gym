# IRON CAMPUS GYM

Gym management system for a single gym location: an admin website for the owner and front desk, a local
API and database that keep working offline, a sync service that mirrors data to Supabase, and a
mobile-friendly member portal.

**Stronger every day.**

## Project layout

```
packages/shared            Status names, ₱/date helpers, Member ID format, validation (used everywhere)
packages/tailwind-preset   Brand colours, fonts and radii for both React apps
apps/api                   Node.js + Express local backend, Knex migrations and seeds
apps/sync                  Local ⇄ Supabase sync service           (milestone 8)
apps/admin                 React + Vite + Tailwind admin website   (milestone 2)
apps/member-portal         React member web app / PWA              (milestone 9)
supabase/                  Cloud schema + Row Level Security       (milestone 8)
docs/                      Architecture, database, API, deployment
```

## First-time setup

**New to the project? Follow the step-by-step [developer setup guide](docs/SETUP.md)** (what to
install, creating your own local database, troubleshooting, and how we work with branches).

Requirements: Node.js 20+, PostgreSQL 14+ running locally. Every developer needs their own local
database and their own `.env` (never share or commit it).

```bash
npm install
cp .env.example .env          # then set DATABASE_URL to your local Postgres
createdb -U postgres iron_campus_gym
npm run db:migrate
npm run db:seed
npm run dev                   # API on :4000 + admin website on http://localhost:5173
```

Open the admin website at **http://localhost:5173** (the Dashboard). The API health check is at
http://localhost:4000/api/health — it reports the API and database status.

## Scripts

| Command                                 | What it does                                                            |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                           | Start the local API and the admin website together, with auto-reload    |
| `npm run dev:api` / `npm run dev:admin` | Start just one of them                                                  |
| `npm run build:admin`                   | Build the admin website for production (`apps/admin/dist`)              |
| `npm run db:migrate`                    | Create / update the database tables                                     |
| `npm run db:seed`                       | Load plans, payment methods, settings and demo data                     |
| `npm run db:reset`                      | Drop everything and rebuild with demo data (development only)           |
| `npm test`                              | Run all tests (database tests run only when `TEST_DATABASE_URL` is set) |
| `npm run lint` / `npm run format`       | Check / format code                                                     |

## Build milestones

1. Setup — workspaces, shared package, Tailwind preset, database schema and seeds ✅
2. Login and admin layout
3. Members and memberships
4. Attendance (QR check-in / check-out)
5. Walk-ins and payments
6. Inventory
7. Dashboard, reports, settings, staff
8. Supabase cloud + sync service
9. Member portal
10. Testing, backups and deployment

Current status and next steps: `docs/PROGRESS.md`. See `docs/` for architecture and database details.
