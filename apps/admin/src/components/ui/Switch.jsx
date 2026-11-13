/** On/off switch (Settings: payment methods, capacity). 52 × 30 px, with a 44 px tap area. */
export function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex h-11 flex-none items-center disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`relative inline-block h-[30px] w-[52px] rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-ink-faint'
        }`}
      >
        <span
          className={`absolute top-1 h-[22px] w-[22px] rounded-full bg-white transition-all ${
            checked ? 'left-[26px]' : 'left-1'
          }`}
        />
      </span>
    </button>
  );
}
