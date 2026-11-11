import { Icon } from '../ui/Icon.jsx';
import { TopbarClock } from './TopbarClock.jsx';

/** Top bar (docs/design/Topbar.dc.html): member search, clock, notifications, signed-in staff. */
export function Topbar({ onOpenMenu }) {
  return (
    <header className="flex min-h-20 flex-wrap items-center gap-3.5 rounded-card border border-line bg-card px-[18px] py-3.5">
      <button
        type="button"
        onClick={onOpenMenu}
        className="inline-flex h-12 w-12 items-center justify-center rounded-btn border border-line bg-card-2 lg:hidden"
        aria-label="Open menu"
      >
        <Icon name="menu" />
      </button>

      {/* Member search is wired up with the Members page (milestone 3). */}
      <label
        className="flex h-12 min-w-0 max-w-[420px] flex-[1_1_180px] items-center gap-2.5 rounded-full border border-line bg-sidebar px-4 text-ink-muted"
        title="Member search comes with the Members page"
      >
        <Icon name="search" size={18} />
        <input
          type="search"
          disabled
          aria-label="Search members"
          placeholder="Search member name or ID…"
          className="min-w-0 flex-1 cursor-not-allowed border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
        />
      </label>

      <div className="flex-1" />

      <TopbarClock />

      <button
        type="button"
        disabled
        aria-label="Notifications"
        title="Notifications come in a later step"
        className="inline-flex h-12 w-12 cursor-not-allowed items-center justify-center rounded-full border border-line bg-card-2 text-ink opacity-70"
      >
        <Icon name="bell" />
      </button>

      {/* TODO(auth): show the signed-in staff member's name and role from Supabase Auth. */}
      <div className="flex h-[52px] items-center gap-3 pl-1 pr-2">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-line bg-card-2 text-ink-muted">
          <Icon name="user" />
        </span>
        <span className="text-left leading-tight">
          <b className="block text-[15px]">Not signed in</b>
          <span className="text-[13px] text-ink-muted">Staff login comes next</span>
        </span>
      </div>
    </header>
  );
}
