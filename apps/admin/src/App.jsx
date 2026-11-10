import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { DashboardPage } from './features/dashboard/DashboardPage.jsx';
import { ComingSoonPage } from './features/placeholders/ComingSoonPage.jsx';
import { NotFoundPage } from './features/placeholders/NotFoundPage.jsx';

/** Pages not built yet, with the milestone that builds them (see docs/PROGRESS.md). */
const COMING_SOON = [
  { path: 'members/*', title: 'Members', icon: 'users', milestone: 'milestone 3' },
  { path: 'attendance/*', title: 'Attendance', icon: 'qr', milestone: 'milestone 4' },
  { path: 'walk-ins/*', title: 'Walk-ins', icon: 'walk', milestone: 'milestone 5' },
  { path: 'payments/*', title: 'Payments', icon: 'wallet', milestone: 'milestone 5' },
  { path: 'inventory/*', title: 'Inventory', icon: 'box', milestone: 'milestone 6' },
  { path: 'reports/*', title: 'Reports', icon: 'reports', milestone: 'milestone 7' },
  { path: 'settings/*', title: 'Settings', icon: 'settings', milestone: 'milestone 7' },
  { path: 'help', title: 'Help', icon: 'help', milestone: 'a later milestone' },
];

// TODO(auth): wrap these routes in a "signed-in staff only" guard and add /login (milestone 2).
export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        {COMING_SOON.map(({ path, ...page }) => (
          <Route key={path} path={path} element={<ComingSoonPage {...page} />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
