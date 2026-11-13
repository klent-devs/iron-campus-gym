import { StatusBadge } from './StatusBadge.jsx';

/**
 * Next to page titles while the screens run on SAMPLE DATA (kept in this browser, no database).
 * TODO(api): remove from each page when that page is connected to the API.
 */
export function SampleDataBadge() {
  return (
    <StatusBadge
      tone="warn"
      size="sm"
      className="print:hidden"
      title="Saved only in this browser. Settings → Sample Data can start it over."
    >
      Sample data · saved in this browser
    </StatusBadge>
  );
}
