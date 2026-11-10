import { Link, NavLink } from 'react-router-dom';
import { LogoFull } from '../../assets/Logo.jsx';
import { Icon } from '../ui/Icon.jsx';
import { NAV_ITEMS } from './navItems.js';

const ITEM =
  'mx-4 my-0.5 flex h-12 items-center gap-3.5 rounded-btn px-4 text-[15px] transition-colors';
const IDLE = 'font-medium text-ink-soft hover:bg-card-2 hover:text-ink';
const ACTIVE = 'bg-brand font-bold text-ink';

/** Main navigation (docs/design/Sidebar.dc.html). `onNavigate` closes the mobile drawer. */
export function Sidebar({ onNavigate }) {
  return (
    <nav
      aria-label="Main"
      className="flex h-full min-h-full flex-col border-r border-card-2 bg-sidebar pb-5 pt-6"
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

      <div className="min-h-6 flex-1" />
      <div className="mx-4 mb-3 border-t border-card-2" />

      <NavLink
        to="/help"
        onClick={onNavigate}
        className={({ isActive }) => `${ITEM} ${isActive ? ACTIVE : IDLE}`}
      >
        <Icon name="help" strokeWidth={1.9} />
        <span>Help</span>
      </NavLink>
      {/* TODO(auth): sign out of Supabase once staff login is built. */}
      <button
        type="button"
        disabled
        title="Staff login comes in the next step"
        className={`${ITEM} ${IDLE} cursor-not-allowed text-left opacity-50 hover:bg-transparent hover:text-ink-soft`}
      >
        <Icon name="logout" strokeWidth={1.9} />
        <span>Logout</span>
      </button>
    </nav>
  );
}
