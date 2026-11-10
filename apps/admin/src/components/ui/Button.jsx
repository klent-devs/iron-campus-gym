import { Link } from 'react-router-dom';
import { Icon } from './Icon.jsx';

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn border font-semibold ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-40';

const VARIANTS = {
  // One orange button per screen, for the main action.
  primary: 'border-brand bg-brand font-bold text-ink hover:border-brand-hover hover:bg-brand-hover',
  secondary: 'border-line bg-card-2 text-ink hover:bg-line',
  danger: 'border-danger bg-danger font-bold text-ink hover:opacity-90',
  outline: 'border-danger/40 bg-transparent text-danger-text hover:bg-danger/10',
};

const SIZES = {
  md: 'h-11 min-w-touch px-[18px] text-sm', // 44 px
  sm: 'h-9 px-3.5 text-[13px]',
};

/**
 * Button or link styled as a button.
 * Pass `to` for in-app navigation (renders a router Link), otherwise renders a <button>.
 * @param {{ variant?: keyof VARIANTS, size?: keyof SIZES, to?: string, icon?: string,
 *           busy?: boolean, className?: string } & Record<string, any>} props
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  to,
  icon,
  busy = false,
  className = '',
  children,
  type = 'button',
  disabled,
  ...rest
}) {
  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {busy ? (
        <svg width="18" height="18" viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
          <path
            d="M12 3a9 9 0 1 0 9 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />
      )}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}
