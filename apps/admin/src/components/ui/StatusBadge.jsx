const TONES = {
  ok: 'bg-success/15 text-success-text',
  warn: 'bg-warning/15 text-warning-text',
  bad: 'bg-danger/15 text-danger-text',
  mute: 'bg-ink-muted/15 text-ink-soft',
  low: 'bg-brand/15 text-brand-text',
};

/**
 * Coloured pill with a dot and a word — never colour alone.
 * @param {{ tone?: keyof TONES, size?: 'md'|'sm', children: React.ReactNode }} props
 */
export function StatusBadge({ tone = 'mute', size = 'md', children, className = '' }) {
  const sizing = size === 'sm' ? 'h-[22px] px-2.5 text-[11px]' : 'h-[26px] px-2.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${sizing} ${TONES[tone]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
