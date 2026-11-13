# Sample data (no database or API)

Until the API and Supabase are connected, the admin website and the member portal run on
**sample data kept in the browser** (`packages/demo-data`). Everything staff add or change is
saved in that browser's `localStorage` (key `icg-sample-data`), survives a reload, and is shared
by every tab of the same address. Another browser or computer has its own copy.

## Running it

```bash
npm run dev:web     # admin website + member portal (no API or database needed)
npm run dev         # the same, plus the local API (needs PostgreSQL)
```

- Admin website: http://localhost:5173 — sign in with `marco.owner` / `owner1234` (Owner) or
  `joy.frontdesk` / `frontdesk1` (Receptionist).
- Member portal: **http://localhost:5173/m/** (the admin dev server forwards `/m/` to the portal
  on port 5174, so both share the same sample data). Sign in with `ICG-2025-0291` / `andrea2026`;
  other members use their Member ID and mobile number (e.g. `09982145567`).
- Settings → Sample Data → **Start Over with Fresh Sample Data** (Owner) throws away every change.

## What is in it

`createSeed(now)` (`src/seed.js`) builds, repeatably for the same day:

- about 300 members (the people from the designs plus made-up ones), their membership periods,
  and a payment for each period;
- check-ins, walk-in visits, product sales, deliveries and stock use from the **1st of last month**
  until now (`meta.historyStart`); stock on hand matches `Inventory.dc.html`;
- plans, payment methods, gym settings, 4 staff accounts and a short audit history.

Before `historyStart` there are no records. Reports and the dashboard's 12-month chart use
made-up but repeatable numbers of about the same size for those days (`src/records.js`
`syntheticDay`), so long periods still look real.

## How the screens use it

| Piece | File |
|---|---|
| Store (save/load, tabs stay in sync, reset) | `packages/demo-data/src/store.js` |
| Every change, with the gym rules and Owner checks | `packages/demo-data/src/actions.js` |
| Member status, payment rows, walk-in/attendance views | `packages/demo-data/src/selectors.js` |
| Dashboard numbers (same shape as `GET /api/dashboard`) | `packages/demo-data/src/dashboard.js` |
| One day's records for reports | `packages/demo-data/src/records.js` |
| Member portal notifications | `packages/demo-data/src/notifications.js` |
| Admin connection + staff sign-in session | `apps/admin/src/lib/demo.js` |
| Portal connection + member session | `apps/member-portal/src/lib/demo.js` |

Actions throw a `DemoError` whose `message` is shown to staff as-is and whose `fields` map form
boxes to their errors. Gym rules applied here (the API must apply the same ones): one open
check-in per member, expired/suspended members rejected, renewals keep the Member ID and QR and
start the day after the current period (or today), walk-ins are linked instead of duplicated,
payments are never deleted, voids/refunds are Owner-only with a reason, bank transfers by a
receptionist wait for the Owner, stock never goes below 0, important changes go to the audit history.

## Records (shapes)

```text
member        { id, code, name, phone, email, address, memberSince, qrToken, suspended,
                suspendedOn, suspendReason, walkinCustomerId, portalPassword, readNotifications }
subscription  { id, memberId, planId, planName, price, startDate, endDate,
                status: active|cancelled, paymentId }
payment       { id, txnNo, at, type: membership_new|membership_renewal|walkin|product, memberId,
                walkinVisitId, subscriptionId, customerName, description, detail, amount,
                method|null, referenceNo, status: paid|pending|voided|refunded, staffId, items,
                correction: { action, reason, by, at }, sms, pendingRenewal, note }
checkIn       { id, memberId, timeIn, timeOut|null, fix: { reason, at }|null }
customer      { id, name, phone|null, memberId|null }            (walk-in customer)
visit         { id, customerId, feeType, fee, timeIn, timeOut|null, paymentId }
item          { id, name, category, unit, costPrice, sellingPrice|null, reorderLevel, quantity }
movement      { id, itemId, type, quantity (+ in / − out), date, at, remarks, staffId }
auditLog      { id, at, staffId, action, text, reason }
```

## Replacing it with the API

Search for `TODO(api)` and `SAMPLE DATA`. Each page reads through one place (its `demoStore.js`,
`lib/demo.js` or `features/dashboard/api.js`), so pages can move to the API one at a time. Remove
the "Sample data · saved in this browser" badge (`SampleDataBadge`) from a page when it is connected,
and remove the sample accounts box from both login pages when Supabase Auth is in.
**Passwords in the sample data are plain text — sample only, never for real accounts.**
