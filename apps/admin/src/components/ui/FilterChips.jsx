/**
 * Round filter buttons with an optional count (Members, Monitoring, Inventory categories).
 * The picked one is orange; the others are outlined.
 * @param {{ label: string, value: string, onChange: (v: string) => void,
 *           options: { value: string, label: string, count?: number }[] }} props
 */
export function FilterChips({ label, value, onChange, options }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition-colors ${
              on
                ? 'border-brand bg-brand text-ink'
                : 'border-line bg-transparent text-ink-soft hover:bg-card-2 hover:text-ink'
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className="opacity-75">{o.count.toLocaleString('en-PH')}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
