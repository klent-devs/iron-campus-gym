import {
  formatDate,
  formatDuration,
  formatPeso,
  formatShortDate,
  formatTime,
  todayInGym,
} from '@icg/shared';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Icon,
  STAT_GRID,
  StatusBadge,
  Toast,
  useToast,
} from '../../components/ui/index.js';
import { useNow } from '../../lib/useNow.js';
import {
  CompleteVisitModal,
  RecordPaymentModal,
  WalkInHistoryDrawer,
} from './components/VisitModals.jsx';
import {
  DATE_RANGES,
  STATUS_FILTERS,
  countByStatus,
  matchesSearch,
  matchesStatus,
  methodName,
  paymentLabel,
  summarize,
  visitDate,
  visitMeta,
  visitsInRange,
} from './demoData.js';
import { completeVisit, recordPayment, useWalkinDemo } from './demoStore.js';
import { QuickWalkInModal } from './QuickWalkInModal.jsx';

const EMPTY_WHEN = {
  today: 'today',
  yesterday: 'yesterday',
  week: 'this week',
  month: 'this month',
};

/**
 * Walk-in Records (docs/design/WalkInRecords.dc.html) with the Register Walk-in pop-up
 * (docs/design/WalkIn.dc.html). DEMO: runs on sample data in the browser; nothing is saved.
 */
export function WalkInRecordsPage() {
  const { customers, visits } = useWalkinDemo();
  const now = useNow(60_000);
  const today = todayInGym(now);
  const [range, setRange] = useState('today');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // { kind: 'pay'|'out'|'history', visitId }
  const [toast, showToast, hideToast] = useToast();

  useEffect(() => {
    document.title = 'Walk-in Records · IRON CAMPUS GYM';
  }, []);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const todays = useMemo(() => visitsInRange(visits, 'today', today), [visits, today]);
  const stats = summarize(todays);
  const inRange = useMemo(() => visitsInRange(visits, range, today), [visits, range, today]);
  const counts = countByStatus(inRange);
  const shown = inRange
    .filter(
      (v) => matchesStatus(v, status) && matchesSearch(customerById.get(v.customerId), search),
    )
    .sort((a, b) => b.timeIn.localeCompare(a.timeIn));

  const selected = dialog && visits.find((v) => v.id === dialog.visitId);
  const selectedCustomer = selected && customerById.get(selected.customerId);
  const close = () => setDialog(null);

  const rangeLabel = (key) =>
    key === 'today' ? `Today · ${formatShortDate(now).replace(/ \d{4}$/, '')}` : DATE_RANGES[key];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 px-1 pt-1">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-[26px] font-bold">
            Walk-in Records
            <StatusBadge tone="warn" size="sm">
              Sample data · not saved yet
            </StatusBadge>
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">
            Every day-pass visit. Kept separate from member attendance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button to="/reports" variant="plain">
            Export Report
          </Button>
          <Button
            variant="plainPrimary"
            onClick={() => setRegisterOpen(true)}
            className="h-[52px] px-6 font-heading text-[15px] tracking-[0.03em]"
          >
            + REGISTER WALK-IN
          </Button>
        </div>
      </div>

      <div className={STAT_GRID}>
        <StatBox label="Walk-ins Today">{stats.total}</StatBox>
        <StatBox label="Still Inside" valueClassName="text-brand-text">
          {stats.inside}
        </StatBox>
        <StatBox label="Collected Today">{formatPeso(stats.collected)}</StatBox>
        <StatBox
          label="Unpaid"
          valueClassName="text-danger-text"
          className={stats.unpaidCount ? 'border-danger/50' : ''}
        >
          {stats.unpaidCount ? `${stats.unpaidCount} · ${formatPeso(stats.unpaidAmount)}` : '0'}
        </StatBox>
      </div>

      <section
        aria-label="Walk-in records"
        className="overflow-hidden rounded-card border border-line bg-card"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <label className="flex h-[46px] max-w-[320px] flex-[1_1_240px] items-center gap-2.5 rounded-btn border border-line bg-sidebar px-3.5 text-ink-muted focus-within:border-brand">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search walk-in customer"
              placeholder="Search customer name or number"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </label>
          <span className="relative inline-flex">
            <select
              aria-label="Date"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-[46px] appearance-none rounded-btn border border-line bg-sidebar pl-3.5 pr-10 text-[15px] text-ink"
            >
              {Object.keys(DATE_RANGES).map((key) => (
                <option key={key} value={key}>
                  {rangeLabel(key)}
                </option>
              ))}
            </select>
            <Icon
              name="chevronDown"
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft"
            />
          </span>
          <div className="flex-1" />
          <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((key) => {
              const on = key === status;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setStatus(key)}
                  className={
                    'h-10 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ' +
                    (on
                      ? 'border-brand bg-brand text-ink'
                      : 'border-line bg-transparent text-ink-soft hover:bg-card-2 hover:text-ink')
                  }
                >
                  {key} <span className="opacity-75">{counts[key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
            <thead>
              <tr className="bg-card-2 text-left text-[13px] text-ink-muted">
                {['Customer Name', 'Date', 'Time In', 'Time Out', 'Duration'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-3.5 font-semibold">
                    {h}
                  </th>
                ))}
                <th className="px-3 py-3.5 text-right font-semibold">Fee</th>
                <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Payment Status</th>
                <th className="px-3 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => {
                const customer = customerById.get(v.customerId);
                const pay = paymentLabel(v);
                return (
                  <tr key={v.id} className="whitespace-nowrap hover:bg-card-2/50">
                    <td className="border-t border-line px-3 py-3">
                      <b className="font-semibold">{customer?.name}</b>
                      <div className="max-w-[150px] whitespace-normal text-xs text-ink-muted">
                        {visitMeta(v, visits)}
                      </div>
                    </td>
                    <td className="border-t border-line px-3 py-3 text-ink-soft">
                      {formatDate(visitDate(v))}
                    </td>
                    <td className="border-t border-line px-3 py-3 text-success-text">
                      <span aria-hidden="true">↘ </span>
                      {formatTime(v.timeIn)}
                    </td>
                    <td
                      className={`border-t border-line px-3 py-3 ${
                        v.timeOut ? 'text-danger-text' : 'font-semibold text-brand-text'
                      }`}
                    >
                      {v.timeOut ? (
                        <>
                          <span aria-hidden="true">↗ </span>
                          {formatTime(v.timeOut)}
                        </>
                      ) : (
                        'Inside'
                      )}
                    </td>
                    <td className="border-t border-line px-3 py-3">
                      {v.timeOut ? formatDuration(v.timeIn, v.timeOut) : '—'}
                    </td>
                    <td className="border-t border-line px-3 py-3 text-right font-bold">
                      {formatPeso(v.fee)}
                    </td>
                    <td className="border-t border-line px-3 py-3">
                      <StatusBadge tone={pay.tone}>{pay.text}</StatusBadge>
                    </td>
                    <td className="border-t border-line px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        {v.paymentStatus === 'unpaid' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setDialog({ kind: 'pay', visitId: v.id })}
                          >
                            Record Payment
                          </Button>
                        )}
                        {!v.timeOut && (
                          <Button
                            size="sm"
                            onClick={() => setDialog({ kind: 'out', visitId: v.id })}
                          >
                            Complete Visit
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => setDialog({ kind: 'history', visitId: v.id })}
                        >
                          View History
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length === 0 && (
            <div className="px-5 py-12 text-center">
              <b className="font-heading text-[17px] font-semibold">Nothing here</b>
              <p className="mt-1.5 text-ink-muted">
                {search.trim()
                  ? `No walk-ins match “${search.trim()}” ${EMPTY_WHEN[range]}.`
                  : `No walk-ins match this filter ${EMPTY_WHEN[range]}.`}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-3 border-t border-line px-4 py-3.5 text-sm text-ink-muted">
          <span>
            {stats.total} {stats.total === 1 ? 'walk-in' : 'walk-ins'} today ·{' '}
            {formatPeso(stats.collected)} collected
            {stats.unpaidAmount > 0 && ` · ${formatPeso(stats.unpaidAmount)} unpaid`}
          </span>
          <span>
            Regular visitor? Open <b className="text-ink">View History</b> →{' '}
            <b className="text-ink">Make Member</b>. No duplicate record is created.
          </span>
        </div>
      </section>

      {registerOpen && (
        <QuickWalkInModal
          onClose={() => setRegisterOpen(false)}
          onRegistered={({ visit, customer, returning }) => {
            setRange('today');
            setStatus('All');
            setSearch('');
            showToast({
              title: `Walk-in registered · ${formatTime(visit.timeIn)}`,
              body:
                `${customer.name} · ` +
                (visit.paymentStatus === 'paid'
                  ? `${formatPeso(visit.fee)} paid by ${methodName(visit.paymentMethod)}`
                  : `${formatPeso(visit.fee)} unpaid`) +
                (returning ? ' · returning customer' : ''),
            });
          }}
        />
      )}

      {selected && dialog.kind === 'pay' && (
        <RecordPaymentModal
          visit={selected}
          customer={selectedCustomer}
          onClose={close}
          onConfirm={(method) => {
            recordPayment(selected.id, method);
            close();
            showToast({
              title: 'Payment recorded',
              body: `${formatPeso(selected.fee)} · ${methodName(method)} · ${selectedCustomer.name}`,
            });
          }}
        />
      )}

      {selected && dialog.kind === 'out' && (
        <CompleteVisitModal
          visit={selected}
          customer={selectedCustomer}
          onClose={close}
          onConfirm={(at) => {
            completeVisit(selected.id, at);
            close();
            showToast({
              tone: 'brand',
              title: `Visit completed · ${formatTime(at)}`,
              body: `${selectedCustomer.name} stayed ${formatDuration(selected.timeIn, at)}`,
            });
          }}
        />
      )}

      {selected && dialog.kind === 'history' && (
        <WalkInHistoryDrawer customer={selectedCustomer} visits={visits} onClose={close} />
      )}

      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}

/** Plain summary box from the design (no icon, unlike the Dashboard's StatCard). */
function StatBox({ label, valueClassName = '', className = '', children }) {
  return (
    <div className={`min-w-0 rounded-card border border-line bg-card px-5 py-[18px] ${className}`}>
      <span className="text-sm text-ink-muted">{label}</span>
      <b className={`mt-1 block truncate font-heading text-[28px] font-bold ${valueClassName}`}>
        {children}
      </b>
    </div>
  );
}
