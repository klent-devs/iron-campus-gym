/** Small form pieces shared by every form (styles from docs/design/WalkIn.dc.html). */
import { Icon } from './Icon.jsx';

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

/**
 * Label + text box + error message in one, for the longer forms (members, plans, stock, settings).
 * Pass `as="select"` for a dropdown (with <option> children). Extra props go to the input.
 * @param {{ id: string, label: React.ReactNode, hint?: string, error?: string,
 *           as?: 'input'|'select', className?: string }} props
 */
export function TextField({
  id,
  label,
  hint,
  error,
  as: Tag = 'input',
  className = '',
  children,
  ...props
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <Tag
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${INPUT} ${inputBorder(error)} ${Tag === 'select' ? 'cursor-pointer pr-9' : ''} ${
          props.readOnly ? 'cursor-default bg-card-2 text-ink-muted' : ''
        }`}
        {...props}
      >
        {children}
      </Tag>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

/** Pick-one cards with a name and a second line (plans in Add Member and Renewal). */
export function ChoiceCards({ labelId, value, onChange, options, columns = 4 }) {
  const grid =
    columns === 2
      ? 'grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2'
      : 'grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 xl:grid-cols-4';
  return (
    <div role="radiogroup" aria-labelledby={labelId} className={grid}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`relative min-h-[68px] rounded-btn border px-3.5 py-2.5 pr-8 text-left text-[15px] font-semibold transition duration-150 motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
              on
                ? 'border-brand bg-brand/[0.1] text-ink shadow-[inset_0_0_0_1px_rgb(255_61_10)]'
                : 'border-line bg-sidebar text-ink-soft hover:border-ink-faint hover:text-ink'
            }`}
          >
            {o.label}
            {o.detail && (
              <span className="mt-0.5 block text-[13px] font-medium text-ink-muted">
                {o.detail}
              </span>
            )}
            {on && (
              <span
                aria-hidden="true"
                className="absolute right-2.5 top-2.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand text-ink"
              >
                <Icon name="check" size={11} strokeWidth={3.5} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Row of label → value (summaries, receipts, profile details).
 * @param {{ label: React.ReactNode, children: React.ReactNode, strong?: boolean }} props
 */
export function SummaryRow({ label, children, className = '' }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-t border-line py-2.5 text-[15px] text-ink-soft ${className}`}
    >
      <span>{label}</span>
      <b className="text-right text-ink">{children}</b>
    </div>
  );
}
