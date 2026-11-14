import { formatDate, formatShortDate, formatTime, isIsoDate, todayInGym } from '@icg/shared';
import { useEffect, useId, useState } from 'react';
import { LogoMark } from '../../assets/Logo.jsx';
import { Button, Icon, SampleDataBadge, Toast, useToast } from '../../components/ui/index.js';
import { shake } from '../../lib/motion.js';
import { isOwner, useDemoData, useStaff } from '../../lib/demo.js';
import { useNow } from '../../lib/useNow.js';
import { INPUT, inputBorder } from '../../components/ui/formParts.jsx';
import { ExportMenu } from './components/ExportMenu.jsx';
import {
  REPORT_TYPES,
  buildReport,
  formatPeriod,
  periodProblem,
  quickPeriod,
  reportFileName,
  reportToCsv,
} from './demoData.js';

const RISE = 'motion-safe:animate-rise';
const rise = (n) => ({ animationDelay: `${n * 50}ms` });

const QUICK = [
  { key: 'month', label: 'This month' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'lastMonth', label: 'Last month' },
];

const TONES = {
  good: 'text-success-text',
  bad: 'text-danger-text',
  brand: 'text-brand-text',
  quietWarn: 'text-ink-soft',
};
const SIZES = { lg: 'text-[30px]', md: 'text-[24px]', sm: 'text-[19px]' };

const LABEL = 'mb-1.5 block text-[13px] font-semibold text-ink-soft';
const FIELD = `${INPUT} h-[44px] text-[15px]`;

/** 'YYYY-MM-DD' → 'Sun, 01 Nov 2026' (the same format as the top-bar clock). */
const dayWithWeekday = (iso) =>
  isIsoDate(iso) ? formatShortDate(new Date(`${iso}T12:00:00+08:00`)) : '';

/** Save text as a file in the browser's Downloads folder. */
function download(text, fileName, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Reports (docs/design/Reports.dc.html): pick a report, choose the dates, then generate.
 * Layout is compact so the table shows without scrolling on a 1080p screen: report tabs and the
 * filters share one panel; Print / Excel / PDF are in one Export menu.
 * Print and PDF use the browser's print window (only the report is printed, on white, with the
 * logo). Excel saves a .csv file, which opens in Excel.
 * SAMPLE DATA: built from the sample data kept in this browser (features/reports/demoData.js).
 * Receptionists don't get the Payment Report (no revenue for them). TODO(api): check on the API too.
 */
export function ReportsPage() {
  const now = useNow(60_000);
  const today = todayInGym(now);
  const ids = { from: useId(), to: useId(), search: useId() };
  const data = useDemoData();
  const staff = useStaff();
  const types = REPORT_TYPES.filter((r) => !r.ownerOnly || isOwner(staff));
  const [type, setType] = useState(() => (isOwner(staff) ? 'pay' : 'mem'));
  const [form, setForm] = useState(() => ({ ...quickPeriod('month', today), search: '' }));
  const [applied, setApplied] = useState(form); // what the report on screen was made from
  const [error, setError] = useState('');
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const [toast, showToast, hideToast] = useToast(7000);

  useEffect(() => {
    document.title = 'Reports · IRON CAMPUS GYM';
  }, []);

  const meta = types.find((r) => r.key === type) ?? types[0];
  // Built on every change of the sample data, so new records show at once (days are cached).
  const report = buildReport({ type: meta.key, ...applied }, data, now);

  // The filters on screen no longer match the report (the Search box only counts where shown).
  const changed =
    form.from !== applied.from ||
    form.to !== applied.to ||
    (meta.searchable && form.search.trim() !== applied.search.trim());

  function generate() {
    const problem = periodProblem(form, today);
    setError(problem);
    if (problem) {
      shake(document.getElementById(form.from > form.to || !form.from ? ids.from : ids.to));
      return;
    }
    setApplied(form);
    setGeneratedAt(new Date());
  }

  function printReport(asPdf) {
    if (asPdf) {
      showToast({
        tone: 'brand',
        title: 'Save as PDF',
        body: 'In the print window, choose “Save as PDF” as the printer, then press Save.',
      });
    }
    // Give the message a moment to show before the print window opens.
    setTimeout(() => window.print(), asPdf ? 400 : 0);
  }

  function exportExcel() {
    download(
      reportToCsv(report, generatedAt),
      reportFileName(report, 'csv'),
      'text/csv;charset=utf-8',
    );
    showToast({
      title: 'Report saved',
      body: `${reportFileName(report, 'csv')} is in your Downloads folder. It opens in Excel.`,
    });
  }

  // A tab shows that report for the dates last generated (not the unsaved ones on screen).
  function pickType(key) {
    setType(key);
    setGeneratedAt(new Date());
  }

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  };

  // Tabs: arrow keys move between reports, like other tab bars.
  const onTabKey = (e, index) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = types[(index + step + types.length) % types.length];
    pickType(next.key);
    document.getElementById(`report-tab-${next.key}`)?.focus();
  };

  return (
    <>
      <div className={`pb-2 pl-1.5 pt-3 print:hidden ${RISE}`}>
        <h1 className="flex flex-wrap items-center gap-3 text-[26px] font-bold">
          Reports
          <SampleDataBadge />
        </h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          Pick a report, choose the dates, then generate.
        </p>
      </div>

      {/* Report tabs + filters in one panel. */}
      <div
        className={`rounded-card border border-line bg-card print:hidden ${RISE}`}
        style={rise(1)}
      >
        <div
          role="tablist"
          aria-label="Report type"
          className="scrollbar-none flex gap-1 overflow-x-auto border-b border-line px-2 pt-2"
        >
          {types.map((r, index) => {
            const on = r.key === meta.key;
            return (
              <button
                key={r.key}
                id={`report-tab-${r.key}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="report-print"
                tabIndex={on ? 0 : -1}
                title={r.desc}
                onClick={() => pickType(r.key)}
                onKeyDown={(e) => onTabKey(e, index)}
                // Same tabs as the Member Profile: orange line under the open one.
                className={`relative -mb-px inline-flex h-12 flex-none items-center gap-2.5 whitespace-nowrap border-b-[3px] px-4 text-[15px] font-semibold transition-colors focus-visible:ring-inset focus-visible:ring-offset-0 ${
                  on ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                <Icon name={r.icon} size={20} className={on ? 'text-brand-text' : 'text-ink-dim'} />
                {r.short}
              </button>
            );
          })}
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            generate();
          }}
          className="p-4"
        >
          <div className="flex flex-wrap items-start gap-3">
            <DateField
              id={ids.from}
              label="From"
              value={form.from}
              max={today}
              invalid={Boolean(error) && (form.from > form.to || !form.from)}
              onChange={(v) => setField('from', v)}
            />
            <DateField
              id={ids.to}
              label="To"
              value={form.to}
              max={today}
              invalid={Boolean(error) && !(form.from > form.to || !form.from)}
              onChange={(v) => setField('to', v)}
            />
            {meta.searchable && (
              <div className="min-w-0 flex-[2_1_240px] motion-safe:animate-fade-in">
                <label htmlFor={ids.search} className={LABEL}>
                  Search
                </label>
                <input
                  id={ids.search}
                  type="search"
                  value={form.search}
                  onChange={(e) => setField('search', e.target.value)}
                  placeholder="Member, item or transaction no. (optional)"
                  className={`${FIELD} ${inputBorder(false)}`}
                />
              </div>
            )}
            <div className="flex-none">
              {/* Spacer the height of a label, so the button lines up with the boxes. */}
              <span className={`${LABEL} invisible`} aria-hidden="true">
                &nbsp;
              </span>
              <Button
                type="submit"
                variant="primary"
                icon={changed ? 'refresh' : 'reports'}
                className={`h-[44px] transition-shadow ${
                  changed ? 'shadow-[0_0_0_4px_rgb(255_61_10/0.22)]' : ''
                }`}
              >
                Generate Report
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] font-semibold text-ink-muted">Quick dates:</span>
            {QUICK.map((q) => {
              const p = quickPeriod(q.key, today);
              const on = p.from === form.from && p.to === form.to;
              return (
                <button
                  key={q.key}
                  type="button"
                  aria-pressed={on}
                  // Fills in the dates only; Generate Report makes the report.
                  onClick={() => {
                    setForm((f) => ({ ...f, ...p }));
                    setError('');
                  }}
                  className={`h-11 rounded-full border px-4 text-[13px] font-semibold transition duration-150 motion-safe:active:scale-95 ${
                    on
                      ? 'border-ink-muted/70 bg-line text-ink'
                      : 'border-line text-ink-soft hover:bg-card-2 hover:text-ink'
                  }`}
                >
                  {q.label}
                </button>
              );
            })}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 flex items-center gap-1.5 text-[13px] text-danger-text motion-safe:animate-drop-in"
            >
              <Icon name="alert" size={14} />
              {error}
            </p>
          )}
        </form>
      </div>

      {changed && !error && (
        <p
          role="status"
          className="-my-1.5 flex items-center gap-2 px-1 text-[13px] font-medium text-warning-text motion-safe:animate-drop-in print:hidden"
        >
          <Icon name="refresh" size={14} />
          Filters changed — click Generate to update.
        </p>
      )}

      <section
        id="report-print"
        role="tabpanel"
        aria-labelledby={`report-tab-${meta.key}`}
        // New key per report: it slides in again so staff see it changed.
        key={`${meta.key}|${applied.from}|${applied.to}|${report.search}`}
        className={`overflow-hidden rounded-card border border-line bg-card transition-opacity duration-300 motion-safe:animate-rise ${
          changed ? 'opacity-70' : ''
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[18px] py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            {/* The logo is for paper / PDF only. */}
            <span className="hidden text-ink print:inline-flex">
              <LogoMark size={36} bar="currentColor" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold text-ink-soft print:text-[19px]">
                {report.name}
              </h2>
              <span className="text-[13px] text-ink-muted">
                IRON CAMPUS GYM · {formatPeriod(report)} · generated{' '}
                {formatDate(todayInGym(generatedAt))}, {formatTime(generatedAt)}
                {staff && ` by ${staff.name}`}
                {report.search && ` · matching “${report.search}”`}
              </span>
            </div>
          </div>
          <div className="print:hidden">
            <ExportMenu
              items={[
                {
                  label: 'Print',
                  hint: 'Paper copy',
                  icon: 'printer',
                  onSelect: () => printReport(false),
                },
                {
                  label: 'Excel',
                  hint: '.csv file, opens in Excel',
                  icon: 'download',
                  onSelect: exportExcel,
                },
                {
                  label: 'PDF',
                  hint: 'Save as PDF in the print window',
                  icon: 'download',
                  onSelect: () => printReport(true),
                },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-[18px] sm:grid-cols-3">
          {report.summary.map((s) => (
            <div
              key={s.label}
              className="flex min-h-[92px] min-w-0 flex-col justify-between rounded-btn bg-card-2 px-4 py-3.5"
            >
              <div className="flex items-center gap-2 text-[13px] text-ink-muted">
                {s.tone === 'quietWarn' && s.value !== '₱0.00' && (
                  <span
                    className="h-2 w-2 flex-none rounded-full bg-warning"
                    title="Needs a look"
                    aria-hidden="true"
                  />
                )}
                {s.label}
              </div>
              <div
                className={`mt-1 truncate font-heading font-bold tabular-nums leading-tight ${
                  SIZES[s.size ?? 'md']
                } ${TONES[s.tone] ?? 'text-ink'}`}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          {/* Full card width; scrolls sideways on narrow phones instead of squashing. */}
          <table className="w-full min-w-[560px] border-collapse text-sm [&_td:first-child]:pl-[18px] [&_td:last-child]:pr-4 [&_th:first-child]:pl-[18px] [&_th:last-child]:pr-4">
            <thead>
              <tr className="bg-card-2 text-[13px] text-ink-muted">
                {report.columns.map((c, i) => (
                  <th
                    key={c.label}
                    className={`whitespace-nowrap px-3 py-3 font-semibold ${
                      c.align === 'right' ? 'text-right' : 'text-left'
                    } ${i === 0 ? 'min-w-[140px] sm:min-w-[170px]' : ''}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row[0]} className="transition-colors hover:bg-brand/10">
                  {row.map((cell, i) => (
                    <td
                      key={report.columns[i].label}
                      className={`whitespace-nowrap border-t border-line px-3 py-2.5 ${
                        report.columns[i].align === 'right' ? 'text-right tabular-nums' : ''
                      } ${i === 0 ? 'font-semibold' : ''}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {report.rows.length > 0 && (
                <tr className="bg-card-2">
                  {report.total.map((cell, i) => (
                    <td
                      key={report.columns[i].label}
                      className={`whitespace-nowrap border-t-2 border-line px-3 py-3 font-bold ${
                        report.columns[i].align === 'right' ? 'text-right tabular-nums' : ''
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
          {report.rows.length === 0 && (
            <div className="px-5 py-12 text-center">
              <b className="font-heading text-[17px] font-semibold">Nothing to show</b>
              <p className="mt-1.5 text-ink-muted">
                {report.search
                  ? `Nothing matches “${report.search}” in this period. Check the spelling or clear the search.`
                  : 'There are no records in this period.'}
              </p>
            </div>
          )}
        </div>
      </section>

      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}

/**
 * Date box with the chosen date written underneath as "Sun, 01 Nov 2026", because the browser
 * shows the box itself in the computer's own format (e.g. 11/01/2026).
 */
function DateField({ id, label, value, max, invalid, onChange }) {
  return (
    <div className="min-w-0 flex-[1_1_170px] sm:max-w-[260px]">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-text`}
        className={`${FIELD} ${inputBorder(invalid)} [color-scheme:dark]`}
      />
      <span id={`${id}-text`} className="mt-1 block text-[12px] text-ink-muted">
        {dayWithWeekday(value) || 'Choose a date'}
      </span>
    </div>
  );
}
