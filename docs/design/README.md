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
| Payments: no payments yet | `PaymentsEmpty.dc.html` | empty state of `PaymentsPage.jsx` (no receipt panel) |
| Payments: no receipt open | `PaymentsNoReceipt.dc.html` | `PaymentsPage.jsx`: table full width; View / Print Receipt opens the receipt, ✕ closes it |
| Print Receipt | `ReceiptPrint.dc.html` | `Receipt.jsx` print layout (browser print window; 80 mm and A4 versions via the `paper` tweak) |
| Send receipt by SMS | `ReceiptSms.dc.html` | `features/payments/SendReceiptSmsModal.jsx` (states: Ready, Sending, Sent, No internet) |
| Inventory | `Inventory.dc.html` | `features/inventory/InventoryPage.jsx` |
| Add/edit item + stock in/out | `StockMovement.dc.html` | `features/inventory/ItemFormPage.jsx`, `StockMovementPage.jsx` |
| Reports | `Reports.dc.html` | `features/reports/ReportsPage.jsx` |
| Settings | `Settings.dc.html` | `features/settings/SettingsPage.jsx` |
| Staff accounts | `Staff.dc.html` | `features/settings/StaffAccountsPage.jsx` |

Shared: `Sidebar.dc.html`, `Topbar.dc.html` → `components/layout/`; `Components.dc.html` (buttons,
inputs, badges, tables, modals, toasts, loading/empty states) → `components/ui/`;
`Brand.dc.html` → logo SVGs in `src/assets/`.

**Top bar clock (added 11 Nov 2026, owner-approved):** `Topbar.dc.html` shows a clock between the
search box and the notification bell: grey clock icon in a round frame, time ("2:43 PM") with the
date ("Wed, 11 Nov 2026") underneath, always Philippine time. Built in
`components/layout/TopbarClock.jsx`. Keep the icon grey: orange is only for actions and the active
page. There is no clock in the sidebar.

**Page-header action buttons (owner's choice, 11 Nov 2026):** buttons in a page's header (like
"Check In Member" and "+ Add Member" on the Dashboard, "+ Record Payment" on Payments) have **no
fill** until the pointer is on them: the main action fills **orange** on hover (`Button
variant="plainPrimary"`), the others fill **grey** (`variant="plain"`). This replaces the filled
orange/grey header buttons in the designs. Buttons inside cards, forms and pop-ups keep the
designs' filled styles.

**Payments receipt rules (designs added 11 Nov 2026 at the owner's request):** the receipt panel shows only
when there is a payment to show: right after Record Payment, or after View / Print Receipt on a row.
With no payments, Transaction History shows an empty state and the table uses the full width.
Pending, voided and refunded payments show a status note on the receipt, and Print / Send by SMS are
disabled until a payment is Paid. The SMS text uses "PHP" instead of "₱" so it fits in one 160-character
SMS. "OFFICIAL RECEIPT" wording is pending the gym accountant's advice (BIR rules).

## Member portal

`MLogin`, `MHome`, `MMembership`, `MQR`, `MAttendance`, `MPayments`, `MProfile`, `MNotifications`
→ `apps/member-portal/src/features/*`. `TabBar.dc.html` → `components/BottomNav.jsx`.
