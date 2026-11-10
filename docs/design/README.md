# Screen designs

These are the approved UI designs for IRON CAMPUS GYM, copied from the design canvas:
https://claude.ai/artifact/LEFM75kDEgWyt3LiFYdCpi

Each `.dc.html` file is one screen. Layout, colours, copy, sample data and interactions are in the
markup (inline styles) and the `renderVals()` script at the bottom. **Use them as the visual and
behaviour spec when building the React pages** — match the layout, labels and states, but build with
Tailwind classes and the `@icg/tailwind-preset` tokens, not inline styles.

## Admin website

| Screen | Design file | Build in |
|---|---|---|
| Login | `AdminLogin.dc.html` | `apps/admin/src/features/auth/LoginPage.jsx` |
| Dashboard | `Main.dc.html` | `features/dashboard/DashboardPage.jsx` |
| Member list | `Members.dc.html` | `features/members/MemberListPage.jsx` |
| Add new member | `AddMember.dc.html` | `features/members/AddMemberPage.jsx` |
| Member profile | `MemberProfile.dc.html` | `features/members/MemberProfilePage.jsx` |
| Plans + monitoring | `Memberships.dc.html` | `features/memberships/PlansPage.jsx`, `MonitoringPage.jsx` |
| Renewal (5 steps) | `Renewal.dc.html` | `features/memberships/RenewalPage.jsx` |
| QR scanner | `Attendance.dc.html` | `features/attendance/ScannerPage.jsx` |
| Attendance records | `AttendanceRecords.dc.html` | `features/attendance/AttendanceRecordsPage.jsx` |
| Walk-in registration | `WalkInRegister.dc.html` | `features/walkins/RegisterWalkInPage.jsx` |
| Walk-in records | `WalkInRecords.dc.html` | `features/walkins/WalkInRecordsPage.jsx` |
| Walk-in quick pop-up | `WalkIn.dc.html` | `features/walkins/QuickWalkInModal.jsx` |
| Payments + receipt | `Payments.dc.html` | `features/payments/PaymentsPage.jsx`, `Receipt.jsx` |
| Inventory | `Inventory.dc.html` | `features/inventory/InventoryPage.jsx` |
| Add/edit item + stock in/out | `StockMovement.dc.html` | `features/inventory/ItemFormPage.jsx`, `StockMovementPage.jsx` |
| Reports | `Reports.dc.html` | `features/reports/ReportsPage.jsx` |
| Settings | `Settings.dc.html` | `features/settings/SettingsPage.jsx` |
| Staff accounts | `Staff.dc.html` | `features/settings/StaffAccountsPage.jsx` |

Shared: `Sidebar.dc.html`, `Topbar.dc.html` → `components/layout/`; `Components.dc.html` (buttons,
inputs, badges, tables, modals, toasts, loading/empty states) → `components/ui/`;
`Brand.dc.html` → logo SVGs in `src/assets/`.

## Member portal

`MLogin`, `MHome`, `MMembership`, `MQR`, `MAttendance`, `MPayments`, `MProfile`, `MNotifications`
→ `apps/member-portal/src/features/*`. `TabBar.dc.html` → `components/BottomNav.jsx`.
