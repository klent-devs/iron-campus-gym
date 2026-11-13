import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/ui.jsx';
import { AttendancePage } from './features/attendance/AttendancePage.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { HomePage } from './features/home/HomePage.jsx';
import { MembershipPage } from './features/membership/MembershipPage.jsx';
import { NotificationsPage } from './features/notifications/NotificationsPage.jsx';
import { PaymentsPage } from './features/payments/PaymentsPage.jsx';
import { ProfilePage } from './features/profile/ProfilePage.jsx';
import { QrPage } from './features/qr/QrPage.jsx';
import { useMember } from './lib/demo.js';

/** Signed-in members only; the tab bar shows on every page inside. */
function SignedIn() {
  const member = useMember();
  if (!member) return <Navigate to="/login" replace />;
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<SignedIn />}>
        <Route index element={<HomePage />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="qr" element={<QrPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
