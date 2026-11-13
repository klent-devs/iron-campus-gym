import { Button } from './Button.jsx';

/** "Showing 1–25 of 642 members" with ‹ Prev, page numbers and Next ›. */
export function Pagination({ page, pageSize, total, onPage, noun = 'items' }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(total, page * pageSize);
  // At most 5 page buttons around the current page.
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  const n = (x) => x.toLocaleString('en-PH');
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3.5 text-sm text-ink-muted">
      <span>
        Showing {n(first)}–{n(last)} of {n(total)} {noun}
      </span>
      {pages > 1 && (
        <nav aria-label="Pages" className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            disabled={page === 1}
            onClick={() => onPage(page - 1)}
            aria-label="Previous page"
          >
            ‹ Prev
          </Button>
          {numbers.map((x) => (
            <Button
              key={x}
              size="sm"
              variant={x === page ? 'primary' : 'secondary'}
              aria-current={x === page ? 'page' : undefined}
              onClick={() => onPage(x)}
              className="min-w-9"
            >
              {x}
            </Button>
          ))}
          <Button
            size="sm"
            disabled={page === pages}
            onClick={() => onPage(page + 1)}
            aria-label="Next page"
          >
            Next ›
          </Button>
        </nav>
      )}
    </div>
  );
}
