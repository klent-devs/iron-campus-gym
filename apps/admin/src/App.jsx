import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { DashboardPage } from './features/dashboard/DashboardPage.jsx';
import { WalkInRecordsPage } from './features/walkins/WalkInRecordsPage.jsx';
import { ComingSoonPage } from './features/placeholders/ComingSoonPage.jsx';
import { NotFoundPage } from './features/placeholders/NotFoundPage.jsx';

/** Pages not built yet, with the milestone that builds them (see docs/PROGRESS.md). */
const COMING_SOON = [
  { path: 'members/*', title: 'Members', icon: 'users', milestone: 'milestone 3' },
  { path: 'attendance/*', title: 'Attendance', icon: 'qr', milestone: 'milestone 4' },
  { path: 'payments/*', title: 'Payments', icon: 'wallet', milestone: 'milestone 5' },
  { path: 'inventory/*', title: 'Inventory', icon: 'box', milestone: 'milestone 6' },
  { path: 'reports/*', title: 'Reports', icon: 'reports', milestone: 'milestone 7' },
  { path: 'settings/*', title: 'Settings', icon: 'settings', milestone: 'milestone 7' },
  { path: 'help', title: 'Help', icon: 'help', milestone: 'a later milestone' },
];

// TODO(auth): wrap the AppLayout routes in a "signed-in staff only" guard that sends visitors to
// /login. The login page is built with a demo sign-in (features/auth/api.js).
export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="walk-ins" element={<WalkInRecordsPage />} />
        {COMING_SOON.map(({ path, ...page }) => (
          <Route key={path} path={path} element={<ComingSoonPage {...page} />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
