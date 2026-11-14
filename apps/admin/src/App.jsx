import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { Card, EmptyState } from './components/ui/index.js';
import { Button } from './components/ui/Button.jsx';
import { AttendanceRecordsPage } from './features/attendance/AttendanceRecordsPage.jsx';
import { ScannerPage } from './features/attendance/ScannerPage.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { DashboardPage } from './features/dashboard/DashboardPage.jsx';
import { HelpPage } from './features/help/HelpPage.jsx';
import { InventoryPage } from './features/inventory/InventoryPage.jsx';
import { StockPage } from './features/inventory/StockPage.jsx';
import { AddMemberPage } from './features/members/AddMemberPage.jsx';
import { MemberListPage } from './features/members/MemberListPage.jsx';
import { MemberProfilePage } from './features/members/MemberProfilePage.jsx';
import { PlansPage } from './features/memberships/PlansPage.jsx';
import { RenewalPage } from './features/memberships/RenewalPage.jsx';
import { PaymentsPage } from './features/payments/PaymentsPage.jsx';
import { NotFoundPage } from './features/placeholders/NotFoundPage.jsx';
import { ReportsPage } from './features/reports/ReportsPage.jsx';
import { SettingsPage } from './features/settings/SettingsPage.jsx';
import { StaffAccountsPage } from './features/settings/StaffAccountsPage.jsx';
import { WalkInRecordsPage } from './features/walkins/WalkInRecordsPage.jsx';
import { isOwner, useStaff } from './lib/demo.js';

/**
 * Signed-in staff only: anyone else goes to /login, then comes back here.
 * TODO(auth): the Supabase session replaces the sample sign-in (lib/demo.js).
 */
function RequireStaff() {
  const staff = useStaff();
  const location = useLocation();
  if (!staff)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Owner-only pages. The sample data's actions check the role as well, like the API will. */
function OwnerOnly() {
  const staff = useStaff();
  if (isOwner(staff)) return <Outlet />;
  return (
    // Same look as "Page not found": a card with the message and an orange button.
    <Card>
      <EmptyState
        icon="lock"
        title="Only the Owner can open this page"
        message="Ask the gym owner if something here needs to change."
        action={
          <Button to="/" variant="primary">
            Go to Overview
          </Button>
        }
      />
    </Card>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireStaff />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="members" element={<MemberListPage />} />
          <Route path="members/new" element={<AddMemberPage />} />
          <Route path="members/plans" element={<PlansPage />} />
          <Route path="members/renew" element={<RenewalPage />} />
          <Route path="members/:memberId" element={<MemberProfilePage />} />
          <Route path="attendance" element={<ScannerPage />} />
          <Route path="attendance/records" element={<AttendanceRecordsPage />} />
          <Route path="walk-ins" element={<WalkInRecordsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/stock" element={<StockPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route element={<OwnerOnly />}>
            <Route path="settings/staff" element={<StaffAccountsPage />} />
          </Route>
          <Route path="help" element={<HelpPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
