import { Icon } from './Icon.jsx';

const DELTA_TONES = {
  up: 'text-success-text',
  down: 'text-danger-text',
  neutral: 'text-ink-muted',
};

/**
 * Summary number card from the Dashboard design.
 * @param {{ label: string, value: React.ReactNode, icon: string,
 *           delta?: React.ReactNode, deltaTone?: 'up'|'down'|'neutral', note?: React.ReactNode,
 *           title?: string }} props
 */
/** Layout for a row of StatCards: 4 across from 900 px, 2×2 on smaller screens, 1 on phones. */
export const STAT_GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 min-[900px]:grid-cols-4';

const VALUE_TONES = {
  default: '',
  brand: 'text-brand-text',
  danger: 'text-danger-text',
};

/**
 * `tone="danger"` gives a red border and red number (e.g. money still unpaid).
 * `className` / `style` are for page animations; the size never changes, so every page matches.
 */
export function StatCard({
  label,
  value,
  icon,
  delta,
  deltaTone = 'neutral',
  note,
  title,
  tone = 'default',
  className = '',
  style,
}) {
  return (
    <section
      // The card is a size container so the big number can shrink with the card (cqi units).
      className={`flex min-w-0 flex-col gap-3 rounded-card border bg-card px-5 py-[18px] transition-colors duration-500 [container-type:inline-size] ${
        tone === 'danger'
          ? 'border-danger/50'
          : tone === 'brand'
            ? 'border-brand/45'
            : 'border-line'
      } ${className}`}
      title={title}
      style={style}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] ${
            tone === 'danger' ? 'bg-danger/15 text-danger-text' : 'bg-card-2 text-brand-text'
          }`}
        >
          <Icon name={icon} size={18} />
        </span>
        <h2 className="flex-1 text-[15px] font-semibold">{label}</h2>
      </div>
      <div
        className={`whitespace-nowrap font-heading text-[length:clamp(16px,14cqi,32px)] font-bold leading-tight tracking-tight ${VALUE_TONES[tone]}`}
      >
        {value}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
        {delta !== undefined && delta !== null && <b className={DELTA_TONES[deltaTone]}>{delta}</b>}
        {note && <span>{note}</span>}
      </div>
    </section>
  );
}
