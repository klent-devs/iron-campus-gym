/** Small form pieces shared by the walk-in pop-ups (styles from docs/design/WalkIn.dc.html). */

export const INPUT =
  'h-[50px] w-full rounded-btn border bg-sidebar px-3.5 text-[16px] text-ink outline-none ' +
  'transition-colors placeholder:text-ink-dim focus-visible:ring-0 focus-visible:ring-offset-0';

export const inputBorder = (error) => (error ? 'border-danger' : 'border-line focus:border-brand');

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

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-[13px] text-danger-text">
      {children}
    </p>
  );
}

/**
 * Row of large choice buttons where exactly one is picked (Walk-in Fee, Payment Method).
 * Arrow keys move between them, like radio buttons.
 * @param {{ label: string, labelId: string, value: string, onChange: (v: string) => void,
 *           options: { value: string, label: React.ReactNode }[] }} props
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
              'h-[50px] min-w-0 flex-1 rounded-btn border px-2 text-[15px] font-semibold transition-colors ' +
              (on
                ? 'border-brand bg-brand/[0.12] text-ink'
                : 'border-line bg-sidebar text-ink-soft hover:bg-card-2 hover:text-ink')
            }
          >
            {option.label}
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
