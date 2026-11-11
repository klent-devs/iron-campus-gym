/** Dark rounded panel used for every dashboard section. */
export function Card({ as: Tag = 'section', className = '', children, ...rest }) {
  return (
    <Tag className={`rounded-card border border-line bg-card p-5 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Card heading: title with optional actions on the same row, subtitle underneath.
 * The title row is always 44 px tall (the height of a button), so titles of cards side by side
 * line up whether or not a card has a button or dropdown next to its title.
 */
export function CardHeader({ title, subtitle, actions, id }) {
  return (
    <div>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="text-[17px] font-semibold">
          {title}
        </h2>
        {actions && <div className="flex flex-wrap items-center gap-4">{actions}</div>}
      </div>
      {subtitle && <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p>}
    </div>
  );
}
