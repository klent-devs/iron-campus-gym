import {
  formatDate,
  formatDuration,
  formatPeso,
  formatShortDate,
  formatTime,
  todayInGym,
} from '@icg/shared';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  FilterChips,
  FilterSelect,
  Pagination,
  Presence,
  SearchBox,
  STAT_GRID,
  StatCard,
  SampleDataBadge,
  StatusBadge,
  Toast,
  useToast,
} from '../../components/ui/index.js';
import { prefersReducedMotion } from '../../lib/motion.js';
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

/** Page blocks come in one after another; `rise(n)` is the n-th block's delay. */
const RISE = 'motion-safe:animate-rise';
const rise = (n) => ({ animationDelay: `${n * 50}ms` });
const FLASH_MS = 1600;

const EMPTY_WHEN = {
  today: 'today',
  yesterday: 'yesterday',
  week: 'this week',
  month: 'this month',
};

const PAGE_SIZE = 25;

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
  const [page, setPage] = useState(1);
  // /walk-ins?register=1 (the Receptionist's "Register Walk-in" button) opens the pop-up straight away.
  const [params, setParams] = useSearchParams();
  const [registerOpen, setRegisterOpen] = useState(() => params.get('register') === '1');
  useEffect(() => {
    if (params.has('register')) setParams({}, { replace: true });
  }, [params, setParams]);
  const [dialog, setDialog] = useState(null); // { kind: 'pay'|'out'|'history', visitId }
  const [toast, showToast, hideToast] = useToast();
  // The row that just changed glows orange for a moment so staff see where it went.
  const [flash, setFlash] = useState(null); // { id, n }
  const flashRow = (id) => setFlash((f) => ({ id, n: (f?.n ?? 0) + 1 }));

  useEffect(() => {
    if (!flash) return undefined;
    const raf = requestAnimationFrame(() => {
      document.querySelector(`[data-visit="${flash.id}"]`)?.scrollIntoView({
        block: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    });
    const timer = setTimeout(() => setFlash(null), FLASH_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [flash]);

  useEffect(() => {
    document.title = 'Walk-in Records · IRON CAMPUS GYM';
  }, []);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const todays = useMemo(() => visitsInRange(visits, 'today', today), [visits, today]);
  const stats = summarize(todays);
  const inRange = useMemo(() => visitsInRange(visits, range, today), [visits, range, today]);
  const counts = countByStatus(inRange);
  const all = inRange
    .filter(
      (v) => matchesStatus(v, status) && matchesSearch(customerById.get(v.customerId), search),
    )
    .sort((a, b) => b.timeIn.localeCompare(a.timeIn));
  // 25 a page, like Members, Payments and Attendance Records.
  const current = Math.min(page, Math.max(1, Math.ceil(all.length / PAGE_SIZE)));
  const shown = all.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const selected = dialog && visits.find((v) => v.id === dialog.visitId);
  const selectedCustomer = selected && customerById.get(selected.customerId);
  const close = () => setDialog(null);

  const rangeLabel = (key) =>
    key === 'today' ? `Today · ${formatShortDate(now).replace(/ \d{4}$/, '')}` : DATE_RANGES[key];

  return (
    <>
      {/* Same header spacing and alignment as every other page (components/ui/PageHeader.jsx). */}
      <div className={`flex flex-wrap items-center justify-between gap-4 pb-2 pt-3 ${RISE}`}>
        <div className="min-w-0 pl-1.5">
          <h1 className="flex flex-wrap items-center gap-3 text-[26px] font-bold">
            Walk-in Records
            <SampleDataBadge />
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">
            Every day-pass visit. Kept separate from member attendance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button to="/reports" variant="plain">
            Export Report
          </Button>
          {/* Same size as Export Report and the Dashboard's header buttons. */}
          <Button variant="plainPrimary" onClick={() => setRegisterOpen(true)}>
            + Register Walk-in
          </Button>
        </div>
      </div>

      {/* Same cards as the Dashboard, so the numbers are the same size on both pages. */}
      <div className={STAT_GRID}>
        <StatCard
          label="Walk-ins Today"
          icon="walk"
          className={RISE}
          style={rise(1)}
          value={<Pop>{stats.total}</Pop>}
          note={`${stats.total - stats.inside} completed`}
        />
        <StatCard
          label="Still Inside"
          icon="checkIn"
          tone="brand"
          className={RISE}
          style={rise(2)}
          value={<Pop>{stats.inside}</Pop>}
          note={stats.inside ? 'Complete their visit when they leave' : 'Nobody inside'}
        />
        <StatCard
          label="Collected Today"
          icon="peso"
          className={RISE}
          style={rise(3)}
          value={<Pop>{formatPeso(stats.collected)}</Pop>}
          note="Paid walk-in fees"
        />
        <StatCard
          label="Unpaid"
          icon="alert"
          tone={stats.unpaidCount ? 'danger' : 'default'}
          className={RISE}
          style={rise(4)}
          value={<Pop>{formatPeso(stats.unpaidAmount)}</Pop>}
          delta={
            stats.unpaidCount
              ? `${stats.unpaidCount} ${stats.unpaidCount === 1 ? 'visit' : 'visits'}`
              : undefined
          }
          deltaTone="down"
          note={stats.unpaidCount ? 'to collect' : 'Everyone has paid'}
        />
      </div>

      <section
        aria-label="Walk-in records"
        className={`overflow-hidden rounded-card border border-line bg-card ${RISE}`}
        style={rise(5)}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchBox
            label="Search walk-in customer"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search customer name or number"
          />
          <FilterSelect
            label="Date"
            value={range}
            onChange={(e) => {
              setRange(e.target.value);
              setPage(1);
            }}
          >
            {Object.keys(DATE_RANGES).map((key) => (
              <option key={key} value={key}>
                {rangeLabel(key)}
              </option>
            ))}
          </FilterSelect>
          <div className="flex-1" />
          <FilterChips
            label="Show"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={STATUS_FILTERS.map((key) => ({ value: key, label: key, count: counts[key] }))}
          />
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
            {/* A new date or status filter fades the rows in (typing a search does not). */}
            <tbody key={`${range}|${status}`} className="motion-safe:animate-fade-in">
              {shown.map((v) => {
                const customer = customerById.get(v.customerId);
                const pay = paymentLabel(v);
                const flashing = flash?.id === v.id;
                return (
                  <tr
                    key={flashing ? `${v.id}-${flash.n}` : v.id}
                    data-visit={v.id}
                    className={`whitespace-nowrap transition-colors hover:bg-card-2/50 ${
                      flashing ? 'motion-safe:animate-row-flash' : ''
                    }`}
                  >
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
                        v.timeOut ? 'text-ink-soft' : 'font-semibold text-brand-text'
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
                      {/* At most two buttons: an unpaid walk-in pays first (Record Payment takes the
                          place of Complete Visit, like Who's Inside Now on the Dashboard). */}
                      <div className="flex justify-end gap-1.5 whitespace-nowrap">
                        {v.paymentStatus === 'unpaid' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setDialog({ kind: 'pay', visitId: v.id })}
                          >
                            Record Payment
                          </Button>
                        )}
                        {!v.timeOut && v.paymentStatus !== 'unpaid' && (
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
          {all.length === 0 && (
            <div className="px-5 py-12 text-center motion-safe:animate-fade-in">
              <b className="font-heading text-[17px] font-semibold">Nothing here</b>
              <p className="mt-1.5 text-ink-muted">
                {search.trim()
                  ? `No walk-ins match “${search.trim()}” ${EMPTY_WHEN[range]}.`
                  : `No walk-ins match this filter ${EMPTY_WHEN[range]}.`}
              </p>
            </div>
          )}
        </div>

        {all.length > PAGE_SIZE && (
          <Pagination
            page={current}
            pageSize={PAGE_SIZE}
            total={all.length}
            onPage={setPage}
            noun="walk-ins"
          />
        )}
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

      <Presence show={registerOpen}>
        <QuickWalkInModal
          onClose={() => setRegisterOpen(false)}
          onRegistered={({ visit, customer, returning }) => {
            setRange('today');
            setStatus('All');
            setSearch('');
            setPage(1);
            flashRow(visit.id);
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
      </Presence>

      {/* Presence keeps each pop-up on screen for a moment after it closes, so it can fade out. */}
      <Presence show={selected && dialog.kind === 'pay'}>
        <RecordPaymentModal
          visit={selected}
          customer={selectedCustomer}
          onClose={close}
          onConfirm={(method) => {
            recordPayment(selected.id, method);
            close();
            flashRow(selected.id);
            showToast({
              title: 'Payment recorded',
              body: `${formatPeso(selected.fee)} · ${methodName(method)} · ${selectedCustomer.name}`,
            });
          }}
        />
      </Presence>

      <Presence show={selected && dialog.kind === 'out'}>
        <CompleteVisitModal
          visit={selected}
          customer={selectedCustomer}
          onClose={close}
          onConfirm={(at) => {
            completeVisit(selected.id, at);
            close();
            flashRow(selected.id);
            showToast({
              tone: 'brand',
              title: `Visit completed · ${formatTime(at)}`,
              body: `${selectedCustomer.name} stayed ${formatDuration(selected.timeIn, at)}`,
            });
          }}
        />
      </Presence>

      <Presence show={selected && dialog.kind === 'history'}>
        <WalkInHistoryDrawer customer={selectedCustomer} visits={visits} onClose={close} />
      </Presence>

      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}

/** A summary number that slides up softly whenever it changes (keyed on the value). */
function Pop({ children }) {
  return (
    <span key={String(children)} className="inline-block motion-safe:animate-value-pop">
      {children}
    </span>
  );
}
