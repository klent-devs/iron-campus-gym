# @icg/member-portal

The member web app (mobile-first, installable PWA): login, home, membership, my QR code,
attendance, payment history with receipts, profile and notifications. Designs: `docs/design/M*.dc.html`.

- `npm run dev:portal` (or `npm run dev:web` for the admin website and the portal together).
- Open **http://localhost:5173/m/** — through the admin dev server, so it shares the sample data
  kept in this browser with the admin website (a payment recorded at the front desk shows here).
  http://localhost:5174/m/ also works, with its own copy of the sample data.
- Sample login: `ICG-2025-0291` / `andrea2026`. Every other member: their Member ID and mobile
  number (e.g. `09982145567`). New members get a password on the "Member registered!" screen.

SAMPLE DATA ONLY: there is no real sign-in or server yet (milestone 8: Supabase + sync).
