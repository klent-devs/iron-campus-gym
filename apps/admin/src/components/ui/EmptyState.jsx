import { Icon } from './Icon.jsx';

/**
 * Friendly message when there is nothing to show (or something went wrong).
 * @param {{ icon?: string, title: string, message?: React.ReactNode, action?: React.ReactNode,
 *           tone?: 'brand'|'danger', compact?: boolean }} props
 */
export function EmptyState({
  icon = 'overview',
  title,
  message,
  action,
  tone = 'brand',
  compact = false,
}) {
  const iconTone = tone === 'danger' ? 'text-danger-text' : 'text-brand-text';
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2.5 text-center ${compact ? 'py-6' : 'py-10'}`}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <span
        className={`inline-flex items-center justify-center rounded-[20px] bg-card-2 ${iconTone} ${compact ? 'h-14 w-14' : 'h-[72px] w-[72px]'}`}
      >
        <Icon name={icon} size={compact ? 26 : 34} strokeWidth={1.8} />
      </span>
      {/* Not `text-base`: the preset has a colour named "base", so that class would also turn the text near-black. */}
      <h3 className={`text-ink ${compact ? 'text-[16px]' : 'text-[19px]'} font-semibold`}>
        {title}
      </h3>
      {message && <p className="m-0 max-w-xs text-sm text-ink-muted">{message}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
