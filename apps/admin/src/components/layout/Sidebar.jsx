import { Link, NavLink } from 'react-router-dom';
import { LogoFull } from '../../assets/Logo.jsx';
import { Icon } from '../ui/Icon.jsx';
import { signOut } from '../../features/auth/api.js';
import { NAV_ITEMS } from './navItems.js';

const ITEM =
  'mx-4 my-0.5 flex h-12 shrink-0 items-center gap-3.5 rounded-btn px-4 text-[15px] transition-colors';
const IDLE = 'font-medium text-ink-soft hover:bg-card-2 hover:text-ink';
const ACTIVE = 'bg-brand font-bold text-ink';

/** Main navigation (docs/design/Sidebar.dc.html). `onNavigate` closes the mobile drawer. */
export function Sidebar({ onNavigate }) {
  return (
    <nav
      aria-label="Main"
      className="flex h-full min-h-full flex-col border-r border-card-2 bg-sidebar pb-8 pt-6"
    >
      <Link to="/" onClick={onNavigate} aria-label="IRON CAMPUS GYM home" className="px-6 pb-7">
        <LogoFull />
      </Link>

      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) => `${ITEM} ${isActive ? ACTIVE : IDLE}`}
        >
          <Icon name={item.icon} strokeWidth={1.9} />
          <span>{item.label}</span>
        </NavLink>
      ))}

      {/* Empty space above Help/Logout; it shrinks first on short windows so they stay on screen. */}
      <div className="min-h-0 flex-1" />
      <div className="mx-4 mb-3 border-t border-card-2" />

      <NavLink
        to="/help"
        onClick={onNavigate}
        className={({ isActive }) => `${ITEM} ${isActive ? ACTIVE : IDLE}`}
      >
        <Icon name="help" strokeWidth={1.9} />
        <span>Help</span>
      </NavLink>
      {/* Sample sign-in: forget who is signed in, then the sign-in page. TODO(auth): Supabase. */}
      <Link
        to="/login"
        onClick={() => {
          signOut();
          onNavigate?.();
        }}
        className={`${ITEM} ${IDLE}`}
      >
        <Icon name="logout" strokeWidth={1.9} />
        <span>Logout</span>
      </Link>
    </nav>
  );
}
