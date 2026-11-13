import { Link } from 'react-router-dom';
import { SampleDataBadge } from './SampleDataBadge.jsx';

/**
 * Page title row: optional breadcrumb, title (with the sample-data badge), a line underneath and
 * the page's buttons on the right (they wrap under the title on phones).
 * Same spacing and alignment as the Dashboard header: room above and below the title, the title
 * indented 6 px, and the buttons centred against the title block (owner's choice, 13 Nov 2026).
 * @param {{ title: React.ReactNode, subtitle?: React.ReactNode, actions?: React.ReactNode,
 *           crumbs?: { to?: string, label: string }[], sample?: boolean, className?: string }} props
 */
export function PageHeader({ title, subtitle, actions, crumbs, sample = true, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 pb-2 pt-3 ${className}`}>
      <div className="min-w-0 pl-1.5">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1.5 text-sm text-ink-muted">
            {crumbs.map((c, i) => (
              <span key={c.label}>
                {i > 0 && <span aria-hidden="true"> / </span>}
                {c.to ? (
                  <Link to={c.to} className="font-medium text-brand-text hover:text-ink">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="flex flex-wrap items-center gap-3 text-[26px] font-bold">
          {title}
          {sample && <SampleDataBadge />}
        </h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}
