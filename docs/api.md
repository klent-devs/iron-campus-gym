# API

Base URL: `http://localhost:4000/api` (the admin website reaches it through the Vite proxy at
`http://localhost:5173/api`). The API listens on `127.0.0.1` only (`API_HOST`), so other devices on
the gym network can't reach it.

| Method | Path | Status |
|---|---|---|
| GET | `/health` | ✅ milestone 1 — API + database status |
| GET | `/dashboard` | ✅ Dashboard data (summary cards, revenue chart, capacity, activities, alerts) |

Endpoints for each module are added here as they are built (milestones 2–7).

## Errors

Every error is JSON with a message that is safe to show to staff:

```json
{ "error": "Please check the form.", "fields": [{ "field": "range", "message": "Choose a valid date range" }] }
```

| Status | When |
|---|---|
| 400 | Invalid input (`fields` lists what to fix) |
| 404 | Unknown route |
| 409 / 422 | A database rule was broken (duplicate, linked record, gym rule) |
| 500 | Unexpected error — the message is generic, details are only in the server log |
| 503 | `DATABASE_URL` is not set yet |

## Roles

Login is not built yet. **Until then every request is treated as the owner**
(`apps/api/src/middleware/staffContext.js`, `TODO(auth)`), which is only acceptable because the
API listens on this PC only. Role rules are already enforced on the API, so they will apply as soon
as login sets `req.staff`.

## GET /dashboard

Query: `range` = `12m` (default, last 12 months) | `6m` | `ytd` (this year) — for the revenue chart.

All days and months use gym time (Asia/Manila). Money is in pesos as numbers (format with
`formatPeso`). Dates are `YYYY-MM-DD`; timestamps are ISO strings in UTC.

**Receptionists:** `revenue`, `revenueChart` and `walkIns.collectedToday` are `null`
(gym rule: no revenue for receptionists), and `includesRevenue` is `false`.

```jsonc
{
  "generatedAt": "2026-11-10T02:30:00.000Z",
  "today": "2026-11-10",
  "timeZone": "Asia/Manila",
  "includesRevenue": true,
  "members": {
    "total": 460,          // every member
    "active": 418,         // may enter: Active + Expiring Soon (canEnter)
    "expiringSoon": 21, "expired": 37, "suspended": 4
  },
  "revenue": {             // paid payments only (voided/refunded/pending excluded)
    "thisPeriod": 486300,  // 1st of this month → today
    "comparePeriodTotal": 448600,  // same days last month
    "changePct": 8.4,      // null when last month's same days had ₱0
    "period": { "from": "2026-11-01", "to": "2026-11-10" },
    "comparePeriod": { "from": "2026-10-01", "to": "2026-10-10" }
  },
  "attendance": {          // members who checked in (each counted once)
    "today": 124, "sameDayLastWeek": 113, "change": 11,
    "compareDate": "2026-11-03"   // same weekday last week, up to the same time of day
  },
  "walkIns": {
    "today": 17, "sameDayLastWeek": 20, "change": -3, "compareDate": "2026-11-03",
    "collectedToday": 1620  // walk-in fees paid today
  },
  "revenueChart": {
    "range": "12m",
    "months": [{ "month": "2025-12", "revenue": 0, "expenses": 0 }, "… one row per month, oldest first"],
    "totals": { "revenue": 958300, "expenses": 0, "net": 958300 },
    "expensesTracked": false // expenses are not recorded yet, so always 0
  },
  "capacity": {
    "insideNow": 34,        // open check-ins + open walk-in visits that started today
    "membersInside": 30, "walkInsInside": 4,
    "maxCapacity": 60,      // gym_settings.max_capacity (null = not set)
    "warningPct": 90,
    "percent": 56.7,        // null when maxCapacity is not set
    "level": "busy"         // quiet | busy | almost_full | full | not_set (capacityLevel)
  },
  "activities": [           // newest first, up to 8
    {
      "id": "check_in:<uuid>",
      "type": "check_in",   // registration | check_in | check_out | walk_in | payment
      "at": "2026-11-10T02:38:00.000Z",
      "name": "Paolo Reyes",
      "details": { "memberCode": "ICG-2025-0318", "method": "qr" }
    }
  ],
  "alerts": {
    "expiringSoon": { "count": 21, "withinDays": 7, "endingToday": 0, "endingTomorrow": 6 },
    "expired": { "count": 37, "recent": 9, "recentDays": 7 },
    "stock": {
      "lowCount": 3, "outCount": 1,                 // stockStatus(): low = at/below reorder level
      "lowestItem": { "name": "Bottled Water 500ml", "quantity": 8, "unit": "pcs" },
      "outItem": { "name": "Sports Drink 500ml", "quantity": 0, "unit": "btl" }
    }
  }
}
```

Activity `details` by type:

| type | details |
|---|---|
| `registration` | `memberCode`, `planName`, `staffName`, `staffRole` |
| `check_in` | `memberCode`, `method` (`qr` / `manual`) |
| `check_out` | `memberCode`, `checkInAt` |
| `walk_in` | `feeType` (`regular` / `student`), `fee`, `paymentMethod` (null if unpaid) |
| `payment` | `amount`, `paymentType`, `transactionNo`, `paymentMethod` |
