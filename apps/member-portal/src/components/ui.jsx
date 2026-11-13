import qrcode from 'qrcode-generator';
import { useEffect, useMemo } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { buildQrPayload } from '@icg/shared';
import { Icon, LogoMark } from './Icon.jsx';

const TABS = [
  ['/', 'home', 'Home'],
  ['/membership', 'membership', 'Membership'],
  ['/qr', 'qr', 'My QR'],
  ['/attendance', 'attendance', 'Attendance'],
  ['/profile', 'profile', 'Profile'],
];

/** Bottom tab bar (docs/design/TabBar.dc.html). My QR is the raised orange button. */
export function BottomNav() {
  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-card-2 bg-sidebar pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex h-[80px] max-w-[480px] items-start justify-around px-1 pt-2">
        {TABS.map(([to, icon, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center gap-1 text-xs ${isActive ? 'font-bold text-brand-text' : 'font-medium text-ink-muted'}`
            }
          >
            {({ isActive }) =>
              icon === 'qr' ? (
                <>
                  <span className="-mt-7 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand text-ink shadow-[0_0_0_6px_#0D0E10]">
                    <Icon name="qr" />
                  </span>
                  <span>{label}</span>
                </>
              ) : (
                <>
                  <span
                    className={`inline-flex h-[30px] w-[46px] items-center justify-center rounded-[10px] ${isActive ? 'bg-brand/[0.14]' : ''}`}
                  >
                    <Icon name={icon} />
                  </span>
                  <span>{label}</span>
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** One app screen: phone-width column with room for the tab bar. */
export function Screen({ title, back, action, children, tabs = true }) {
  useEffect(() => {
    if (typeof title === 'string') document.title = `${title} · IRON CAMPUS GYM`;
  }, [title]);
  return (
    <div
      className={`mx-auto min-h-screen w-full max-w-[480px] px-5 ${tabs ? 'pb-[110px]' : 'pb-8'} pt-12`}
    >
      {(title || back) && (
        <div className={`flex items-center gap-1 ${back ? '-ml-2.5' : ''}`}>
          {back && (
            <Link
              to={back}
              aria-label="Back"
              className="inline-flex h-12 w-12 items-center justify-center text-ink"
            >
              <Icon name="back" size={24} />
            </Link>
          )}
          {title && (
            <h1 className={`flex-1 font-heading font-bold ${back ? 'text-[24px]' : 'text-[26px]'}`}>
              {title}
            </h1>
          )}
          {action}
        </div>
      )}
      <div className="motion-safe:animate-rise">{children}</div>
    </div>
  );
}

export function Box({ className = '', children, ...rest }) {
  return (
    <section className={`rounded-[18px] border border-line bg-card ${className}`} {...rest}>
      {children}
    </section>
  );
}

const PILL = {
  active: 'bg-success/15 text-success-text',
  expiring_soon: 'bg-warning/15 text-warning-text',
  expired: 'bg-danger/15 text-danger-text',
  suspended: 'bg-ink-muted/15 text-ink-soft',
  pending: 'bg-ink-muted/15 text-ink-soft',
  paid: 'bg-success/15 text-success-text',
  refunded: 'bg-ink-muted/15 text-[#C4C4CC]',
  voided: 'bg-danger/15 text-danger-text',
};

export function Pill({ tone, children, className = '' }) {
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-bold ${PILL[tone] ?? PILL.pending} ${className}`}
    >
      <i className="h-[7px] w-[7px] rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

/** "Label → value" row inside a Box (MMembership.dc.html .kv). */
export function KV({ label, children, first = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-3.5 text-[15px] ${first ? '' : 'border-t border-line'}`}
    >
      <span className="text-ink-muted">{label}</span>
      <b className="text-right">{children}</b>
    </div>
  );
}

export function PrimaryButton({ className = '', children, ...rest }) {
  return (
    <button
      type="button"
      className={`flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand font-heading text-[16px] font-bold text-ink transition active:scale-[0.98] disabled:opacity-60 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Bottom sheet with a dark backdrop (MMembership.dc.html "How to renew"). */
export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 motion-safe:animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border-t border-line bg-card px-5 pb-8 pt-3 motion-safe:animate-sheet-in"
      >
        <div className="mx-auto mb-4 h-[5px] w-11 rounded-full bg-ink-faint" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-[20px] font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-card-2"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ id, label, error, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        className={`h-[54px] w-full rounded-[14px] border bg-card px-4 text-[16px] text-ink outline-none placeholder:text-ink-dim focus-visible:ring-0 focus-visible:ring-offset-0 ${
          error ? 'border-danger' : 'border-line focus:border-brand'
        }`}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && <p className="mt-1.5 text-[13px] text-danger-text">{error}</p>}
    </div>
  );
}

/** The member's QR code with the logo in the middle (high error correction keeps it readable). */
export function MemberQr({ token, size = 236 }) {
  const { d, n } = useMemo(() => {
    const qr = qrcode(0, 'H');
    qr.addData(buildQrPayload(token));
    qr.make();
    const count = qr.getModuleCount();
    let path = '';
    for (let r = 0; r < count; r++)
      for (let c = 0; c < count; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    return { d: path, n: count };
  }, [token]);
  return (
    <div className="relative rounded-[20px] bg-white p-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${n} ${n}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label="Your QR code"
      >
        <path d={d} fill="#090A0C" />
      </svg>
      <span className="absolute left-1/2 top-1/2 flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[14px] border-4 border-white bg-base">
        <LogoMark size={30} />
      </span>
    </div>
  );
}

export function SectionTitle({ title, to, link }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center justify-between">
      <h2 className="font-heading text-[17px] font-semibold">{title}</h2>
      {to && (
        <Link to={to} className="py-2.5 text-sm font-semibold text-brand-text">
          {link}
        </Link>
      )}
    </div>
  );
}
