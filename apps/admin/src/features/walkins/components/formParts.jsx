/** Small form pieces shared by the walk-in pop-ups (styles from docs/design/WalkIn.dc.html). */
import { Icon } from '../../../components/ui/Icon.jsx';

export const INPUT =
  'h-[50px] w-full rounded-btn border bg-sidebar px-3.5 text-[16px] text-ink outline-none ' +
  'transition placeholder:text-ink-dim focus-visible:ring-0 focus-visible:ring-offset-0';

// Orange border plus a soft orange glow while typing; red when there is a mistake.
export const inputBorder = (error) =>
  error
    ? 'border-danger shadow-[0_0_0_4px_rgb(227_77_77/0.14)]'
    : 'border-line hover:border-ink-faint focus:border-brand focus:shadow-[0_0_0_4px_rgb(255_61_10/0.14)]';

/** Label with an optional grey hint, e.g. "Contact Number (optional)". */
export function Label({ htmlFor, id, hint, children }) {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <Tag htmlFor={htmlFor} id={id} className="mb-2 block text-sm font-semibold text-ink-soft">
      {children}
      {hint && <span className="font-medium text-ink-muted"> {hint}</span>}
    </Tag>
  );
}

/** Text box with an icon on the left, e.g. a person next to Customer Name. */
export function IconInput({ icon, error, className = '', ...props }) {
  return (
    <div className="group relative">
      <Icon
        name={icon}
        size={18}
        className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
          error ? 'text-danger-text' : 'text-ink-dim group-focus-within:text-brand-text'
        }`}
      />
      <input {...props} className={`${INPUT} ${inputBorder(error)} pl-11 ${className}`} />
    </div>
  );
}

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p
      id={id}
      className="mt-1.5 flex items-center gap-1.5 text-[13px] text-danger-text motion-safe:animate-drop-in"
    >
      <Icon name="alert" size={14} />
      {children}
    </p>
  );
}

/**
 * Row of large choice buttons where exactly one is picked (Walk-in Fee, Payment Method).
 * Arrow keys move between them, like radio buttons. The picked one is orange with a tick.
 * Each option can have an `icon` on the left, or a `detail` (e.g. the price) on a second line.
 * @param {{ labelId: string, value: string, onChange: (v: string) => void,
 *           options: { value: string, label: React.ReactNode, detail?: React.ReactNode,
 *                      icon?: string }[] }} props
 */
export function OptionGroup({ labelId, value, onChange, options }) {
  const move = (e, index) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    e.currentTarget.parentElement.querySelector(`[data-value="${next.value}"]`)?.focus();
  };
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex gap-2">
      {options.map((option, index) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            data-value={option.value}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => move(e, index)}
            className={
              'relative flex min-w-0 flex-1 items-center justify-center gap-2 rounded-btn border px-2 ' +
              'font-semibold transition duration-150 motion-safe:active:scale-[0.97] ' +
              (option.detail ? 'h-[68px] flex-col gap-0.5 ' : 'h-[50px] text-[15px] ') +
              (on
                ? 'border-brand bg-brand/[0.12] text-ink shadow-[inset_0_0_0_1px_rgb(255_61_10)]'
                : 'border-line bg-sidebar text-ink-soft hover:border-ink-faint hover:bg-card-2 hover:text-ink')
            }
          >
            {option.icon && (
              <Icon
                name={option.icon}
                size={18}
                className={`flex-none transition-colors ${on ? 'text-brand-text' : 'text-ink-muted'}`}
              />
            )}
            {option.detail ? (
              <>
                <span className={`text-[13px] ${on ? 'text-ink-soft' : 'text-ink-muted'}`}>
                  {option.label}
                </span>
                <span className="font-heading text-[19px] font-bold leading-tight">
                  {option.detail}
                </span>
              </>
            ) : (
              <span className="truncate">{option.label}</span>
            )}
            <span
              aria-hidden="true"
              className={`absolute right-2 top-2 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand text-ink transition duration-200 ${
                on ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
              }`}
            >
              <Icon name="check" size={11} strokeWidth={3.5} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Small grey box with a label and a value (Time In / Time Out / Duration, history totals). */
export function InfoBox({ label, children, valueClassName = '' }) {
  return (
    <div className="min-w-0 rounded-btn bg-card-2 p-3">
      <div className="text-[13px] text-ink-muted">{label}</div>
      <b className={`block ${valueClassName}`}>{children}</b>
    </div>
  );
}
