# @icg/admin

React + Vite + Tailwind admin website for the owner and front desk.

```bash
npm run dev          # from the repo root: API + this site → http://localhost:5173
npm run dev:admin    # this site only (expects the API on http://127.0.0.1:4000)
npm run build:admin  # production build → apps/admin/dist
```

The Vite dev server forwards `/api/*` to the local API, so the browser only ever talks to
`localhost:5173`.

## Layout

```
src/
  assets/Logo.jsx            IRON CAMPUS GYM logo (docs/design/Brand.dc.html)
  components/layout/         AppLayout, Sidebar, Topbar (docs/design/Sidebar|Topbar.dc.html)
  components/ui/             Button, Card, StatCard, StatusBadge, EmptyState, Skeleton, Icon
  features/dashboard/        Dashboard page (docs/design/Main.dc.html), api.js, format.js
  features/placeholders/     "Coming soon" and 404 pages for screens not built yet
  lib/apiClient.js           fetch wrapper with friendly error messages
  lib/useApi.js              loading / error / refresh state for a request
  lib/theme.js               brand colours as hex (for charts/SVG), read from @icg/tailwind-preset
```

- Colours, fonts and radii come from `@icg/tailwind-preset` — use classes like `bg-card`,
  `border-line`, `text-brand-text`; don't hard-code hex values.
- Fonts are bundled with `@fontsource` so the site works without internet.
- Business rules and ₱/date formatting come from `@icg/shared`.

## Not built yet

- **Login (Supabase Auth)** — the top bar shows "Not signed in" and Logout is disabled.
  The API treats every request as the owner until then (see `apps/api/src/middleware/staffContext.js`).
  Search for `TODO(auth)`.
- Every sidebar page except Overview is a "Coming soon" placeholder.
