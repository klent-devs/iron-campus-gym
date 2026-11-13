/**
 * Sidebar pages, in the order of docs/design/Sidebar.dc.html.
 * `ownerOnly` pages are hidden for the Receptionist (her password change is in the menu under her
 * name in the top bar instead).
 */
export const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: 'overview', end: true },
  { to: '/members', label: 'Members', icon: 'users' },
  { to: '/attendance', label: 'Attendance', icon: 'qr' },
  { to: '/walk-ins', label: 'Walk-in', icon: 'walk' },
  { to: '/payments', label: 'Payments', icon: 'wallet' },
  { to: '/inventory', label: 'Inventory', icon: 'box' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
  { to: '/settings', label: 'Settings', icon: 'settings', ownerOnly: true },
];
