import { ROLE_LABELS, addDays } from '@icg/shared';
import { STATUS_TONE, dayOf, memberMatches, membersView } from '@icg/demo-data';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from '../../features/auth/api.js';
import { isOwner, useDemoData, useStaff } from '../../lib/demo.js';
import { useToday } from '../../lib/useToday.js';
import { Avatar } from '../ui/Avatar.jsx';
import { Icon } from '../ui/Icon.jsx';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { TopbarClock } from './TopbarClock.jsx';

/** Top bar (docs/design/Topbar.dc.html): member search, clock, alerts, signed-in staff. */
export function Topbar({ onOpenMenu }) {
  const staff = useStaff();
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

      <MemberSearch />

      <div className="flex-1" />

      <TopbarClock />

      <AlertsBell />

      {/* TODO(auth): the signed-in staff member comes from Supabase Auth. */}
      <StaffMenu staff={staff} />
    </header>
  );
}

/**
 * The signed-in staff member, as a menu: Change Password and Log Out. This is where the
 * Receptionist changes her password, since Settings is not in her sidebar.
 */
function StaffMenu({ staff }) {
  const navigate = useNavigate();
  const menuId = useId();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const role = staff ? (isOwner(staff) ? 'Owner' : ROLE_LABELS[staff.role]) : '';
  const go = (to) => {
    setOpen(false);
    navigate(to);
  };
  const item =
    'flex min-h-touch w-full items-center gap-3 rounded-[10px] px-3 text-left text-[15px] text-ink-soft transition-colors hover:bg-card-2 hover:text-ink';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={staff ? `${staff.name}, ${role}. Account menu` : 'Account menu'}
        className="flex h-[52px] items-center gap-3 rounded-btn pl-1 pr-2 transition-colors hover:bg-card-2"
      >
        <Avatar name={staff?.name ?? '?'} size="lg" className="!border-line" />
        <span className="text-left leading-tight">
          <b className="block text-[15px]">{staff?.name ?? 'Not signed in'}</b>
          <span className="text-[13px] text-ink-muted">{role}</span>
        </span>
        <Icon name="chevronDown" size={18} className="text-ink-muted" />
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-40 mt-2 w-56 rounded-btn border border-line bg-sidebar p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.45)] motion-safe:animate-drop-in"
        >
          <button type="button" className={item} onClick={() => go('/settings')}>
            <Icon name="lock" size={18} />
            Change Password
          </button>
          <button
            type="button"
            className={item}
            onClick={() => {
              signOut();
              go('/login');
            }}
          >
            <Icon name="logout" size={18} />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

/** Type a name, Member ID or mobile number: up to 6 members show; Enter opens the full list. */
function MemberSearch() {
  const data = useDemoData();
  const today = useToday();
  const navigate = useNavigate();
  const listId = useId();
  const wrapRef = useRef(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(
    () =>
      q.trim().length >= 2
        ? membersView(data, today)
            .filter((m) => memberMatches(m, q))
            .slice(0, 6)
        : [],
    [data, today, q],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const go = (to) => {
    setOpen(false);
    setQ('');
    navigate(to);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (results.length ? (i + step + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active] && open) go(`/members/${results[active].id}`);
      else if (q.trim()) go(`/members?q=${encodeURIComponent(q.trim())}`);
    } else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative min-w-0 max-w-[420px] flex-[1_1_180px]">
      <label className="flex h-12 items-center gap-2.5 rounded-full border border-line bg-sidebar px-4 text-ink-muted focus-within:border-brand">
        <Icon name="search" size={18} />
        <input
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-label="Search members"
          placeholder="Search member name or ID…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </label>
      {open && q.trim().length >= 2 && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[54px] z-40 overflow-hidden rounded-[14px] border border-line bg-sidebar shadow-[0_20px_40px_rgba(0,0,0,0.5)] motion-safe:animate-drop-in"
        >
          {results.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(`/members/${m.id}`)}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${i === active ? 'bg-card-2' : ''}`}
            >
              <Avatar name={m.name} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{m.name}</b>
                <span className="font-mono text-[12px] text-ink-muted">{m.code}</span>
              </span>
              <StatusBadge tone={STATUS_TONE[m.status]} size="sm">
                {m.statusLabel}
              </StatusBadge>
            </button>
          ))}
          {results.length === 0 && (
            <p className="px-4 py-3 text-sm text-ink-muted">No member matches “{q}”.</p>
          )}
          <button
            type="button"
            onClick={() => go(`/members?q=${encodeURIComponent(q.trim())}`)}
            className="w-full border-t border-line px-4 py-2.5 text-left text-sm font-semibold text-brand-text hover:bg-card-2"
          >
            See all results on the Members page →
          </button>
        </div>
      )}
    </div>
  );
}

/** Things the front desk should act on: missed check-outs, plans ending, stock, transfers. */
function useAlerts() {
  const data = useDemoData();
  const today = useToday();
  const owner = isOwner(useStaff());
  return useMemo(() => {
    const list = [];
    const missed = data.checkIns.filter((c) => !c.timeOut && dayOf(c.timeIn) < today).length;
    if (missed)
      list.push({
        icon: 'clock',
        tone: 'text-warning-text',
        text: `${missed} missed check-out${missed > 1 ? 's' : ''} to fix`,
        to: '/attendance/records',
      });
    const members = membersView(data, today);
    const ending = members.filter(
      (m) =>
        m.status === 'expiring_soon' && (m.endDate === today || m.endDate === addDays(today, 1)),
    ).length;
    if (ending)
      list.push({
        icon: 'calendar',
        tone: 'text-warning-text',
        text: `${ending} membership${ending > 1 ? 's' : ''} ending today or tomorrow`,
        to: '/members?status=expiring_soon',
      });
    const out = data.items.filter((i) => i.quantity <= 0).length;
    const low = data.items.filter((i) => i.quantity > 0 && i.quantity <= i.reorderLevel).length;
    if (out || low)
      list.push({
        icon: 'box',
        tone: out ? 'text-danger-text' : 'text-brand-text',
        text: `${out ? `${out} out of stock` : ''}${out && low ? ', ' : ''}${low ? `${low} running low` : ''}`,
        to: '/inventory',
      });
    const unpaid = data.payments.filter((p) => p.status === 'pending' && !p.method).length;
    if (unpaid)
      list.push({
        icon: 'cash',
        tone: 'text-danger-text',
        text: `${unpaid} unpaid payment${unpaid > 1 ? 's' : ''} to collect`,
        to: '/payments',
      });
    if (owner) {
      const waiting = data.payments.filter((p) => p.status === 'pending' && p.method).length;
      if (waiting)
        list.push({
          icon: 'bank',
          tone: 'text-warning-text',
          text: `${waiting} bank transfer${waiting > 1 ? 's' : ''} to confirm`,
          to: '/payments',
        });
    }
    return list;
  }, [data, today, owner]);
}

function AlertsBell() {
  const alerts = useAlerts();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label={`Alerts, ${alerts.length} to look at`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-card-2 text-ink transition hover:bg-line"
      >
        <Icon name="bell" />
        {alerts.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold">
            {alerts.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-[56px] z-40 w-[320px] max-w-[85vw] overflow-hidden rounded-[14px] border border-line bg-sidebar shadow-[0_20px_40px_rgba(0,0,0,0.5)] motion-safe:animate-drop-in">
          <b className="block border-b border-line px-4 py-3 text-[15px]">Needs attention</b>
          {alerts.length === 0 && (
            <p className="px-4 py-4 text-sm text-ink-muted">All clear. Nothing to do right now.</p>
          )}
          {alerts.map((a) => (
            <Link
              key={a.text}
              to={a.to}
              onClick={() => setOpen(false)}
              className="flex min-h-touch items-center gap-3 border-t border-line px-4 py-3 text-sm first:border-t-0 hover:bg-card-2"
            >
              <Icon name={a.icon} size={18} className={a.tone} />
              <span className="flex-1">{a.text}</span>
              <span aria-hidden="true" className="text-ink-muted">
                ›
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
