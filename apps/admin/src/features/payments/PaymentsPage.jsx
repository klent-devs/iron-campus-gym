import {
  PAYMENT_TYPE,
  addDays,
  addMonths,
  dateFormat,
  formatDate,
  formatPeso,
  formatTime,
} from '@icg/shared';
import { PAYMENT_TONE, actions, dayOf, paymentsView } from '@icg/demo-data';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  EmptyState,
  FilterSelect,
  PageHeader,
  Pagination,
  Presence,
  STAT_GRID,
  SearchBox,
  StatCard,
  StatusBadge,
  Toast,
  usePrint,
  useToast,
} from '../../components/ui/index.js';
import { isOwner, runAction, useDemoData, useStaff } from '../../lib/demo.js';
import { useToday } from '../../lib/useToday.js';
import {
  CorrectPaymentModal,
  PrintReceiptModal,
  RecordPaymentModal,
  SendReceiptSmsModal,
} from './components/PaymentModals.jsx';
import { ReceiptPanel } from './Receipt.jsx';

const PAGE_SIZE = 20;
const TYPES = [
  ['all', 'All types'],
  ['membership', 'Membership'],
  ['walkin', 'Walk-in'],
  ['product', 'Product'],
];
const STATUSES = [
  ['all', 'Any status'],
  ['paid', 'Paid'],
  ['pending', 'Pending'],
  ['voided', 'Voided'],
  ['refunded', 'Refunded'],
];
const isMembership = (t) =>
  t === PAYMENT_TYPE.MEMBERSHIP_NEW || t === PAYMENT_TYPE.MEMBERSHIP_RENEWAL;
const sum = (list) => list.reduce((s, p) => s + p.amount, 0);

/**
 * Payments (docs/design/Payments*.dc.html): summary, Transaction History and the receipt panel.
 * The receipt shows only after Record Payment or View / Print Receipt; ✕ closes it.
 * `?txn=TXN-…` opens that payment's receipt (links from member profiles).
 */
export function PaymentsPage() {
  const data = useDemoData();
  const staff = useStaff();
  const owner = isOwner(staff);
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [method, setMethod] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const [toast, showToast, hideToast] = useToast();
  const [printArea, print] = usePrint();

  useEffect(() => {
    document.title = 'Payments · IRON CAMPUS GYM';
  }, []);

  const all = paymentsView(data);
  const selectedTxn = params.get('txn');
  const selected = selectedTxn ? all.find((p) => p.txnNo === selectedTxn) : null;
  const setSelected = (p) => {
    const next = new URLSearchParams(params);
    if (p) next.set('txn', p.txnNo);
    else next.delete('txn');
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (p) =>
        (type === 'all' || (type === 'membership' ? isMembership(p.type) : p.type === type)) &&
        (method === 'all' || p.method === method) &&
        (status === 'all' || p.status === status) &&
        (!q ||
          p.txnNo.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          p.customerId?.toLowerCase().includes(q)),
    );
  }, [all, query, type, method, status]);

  const stats = useMemo(() => {
    const paid = all.filter((p) => p.status === 'paid');
    const monthStart = `${today.slice(0, 8)}01`;
    const lastFrom = addMonths(monthStart, -1);
    const lastTo = addDays(lastFrom, Number(today.slice(8)) - 1);
    const inMonth = paid.filter((p) => dayOf(p.at) >= monthStart);
    const lastSame = paid.filter(
      (p) => dayOf(p.at) >= lastFrom && dayOf(p.at) <= lastTo && dayOf(p.at) < monthStart,
    );
    const todays = paid.filter((p) => dayOf(p.at) === today);
    const change = sum(lastSame) ? ((sum(inMonth) - sum(lastSame)) / sum(lastSame)) * 100 : null;
    const walkins = inMonth.filter((p) => p.type === 'walkin');
    return {
      today: sum(todays),
      todayCount: todays.length,
      month: sum(inMonth),
      change,
      lastMonthName: dateFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(
        new Date(`${lastFrom}T00:00:00Z`),
      ),
      membership: sum(inMonth.filter((p) => isMembership(p.type))),
      walkin: sum(walkins),
      walkinVisits: data.visits.filter((v) => dayOf(v.timeIn) >= monthStart).length,
    };
  }, [all, data.visits, today]);

  const afterSave = (payment, title) => {
    setDialog(null);
    setSelected(payment);
    setPage(1);
    showToast({
      title,
      body: `${payment.txnNo} · ${payment.customerName} · ${formatPeso(payment.amount)}`,
    });
  };

  const confirm = (p) => {
    try {
      runAction(actions.confirmPayment, { paymentId: p.id });
      showToast({ title: 'Transfer confirmed', body: `${p.txnNo} now counts as paid.` });
    } catch (err) {
      showToast({ tone: 'danger', title: 'Not saved', body: err.message });
    }
  };

  const methods = data.paymentMethods;

  return (
    <>
      {printArea}
      <PageHeader
        title="Payments"
        subtitle="Every peso received, linked to a member or walk-in."
        actions={
          <>
            {owner && (
              <Button to="/reports" variant="plain">
                Export Report
              </Button>
            )}
            <Button variant="plainPrimary" onClick={() => setDialog({ kind: 'record' })}>
              + Record Payment
            </Button>
          </>
        }
      />

      {owner && (
        <div className={STAT_GRID}>
          <StatCard
            label="Today’s Collections"
            icon="cash"
            tone="brand"
            value={formatPeso(stats.today)}
            note={`${stats.todayCount} ${stats.todayCount === 1 ? 'payment' : 'payments'}`}
          />
          <StatCard
            label="Monthly Collections"
            icon="peso"
            value={formatPeso(stats.month)}
            delta={
              stats.change === null
                ? undefined
                : `${stats.change >= 0 ? '▲' : '▼'} ${Math.abs(stats.change).toFixed(1)}%`
            }
            deltaTone={stats.change === null ? 'neutral' : stats.change >= 0 ? 'up' : 'down'}
            note={stats.change === null ? 'Nothing to compare yet' : `vs ${stats.lastMonthName}`}
          />
          <StatCard
            label="Memberships"
            icon="users"
            value={formatPeso(stats.membership)}
            note="This month"
          />
          <StatCard
            label="Walk-in Payments"
            icon="walk"
            value={formatPeso(stats.walkin)}
            note={`This month · ${stats.walkinVisits} visits`}
          />
        </div>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <section className="min-w-0 flex-[2.2_1_600px] overflow-hidden rounded-card border border-line bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <h2 className="text-[18px] font-semibold">Transaction History</h2>
            <div className="flex flex-wrap gap-2.5">
              <SearchBox
                label="Search transactions"
                className="w-[250px]"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Transaction no. or name"
              />
              {[
                ['Type', type, setType, TYPES],
                [
                  'Method',
                  method,
                  setMethod,
                  [['all', 'All methods'], ...methods.map((m) => [m.code, m.name])],
                ],
                ['Status', status, setStatus, STATUSES],
              ].map(([label, value, setter, opts]) => (
                <FilterSelect
                  key={label}
                  label={label}
                  value={value}
                  onChange={(e) => {
                    setter(e.target.value);
                    setPage(1);
                  }}
                >
                  {opts.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </FilterSelect>
              ))}
            </div>
          </div>

          {all.length === 0 ? (
            <div className="border-t border-line py-16">
              <EmptyState
                icon="receipt"
                title="No payments yet"
                message="Payments you record will show up here, with a receipt you can print or send by SMS."
                action={
                  <Button variant="primary" onClick={() => setDialog({ kind: 'record' })}>
                    + Record Payment
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse text-sm">
                <thead>
                  <tr className="bg-card-2 text-left text-[13px] text-ink-muted">
                    <th className="px-4 py-3.5 font-semibold">Transaction No.</th>
                    <th className="px-4 py-3.5 font-semibold">Customer Name</th>
                    <th className="px-4 py-3.5 font-semibold">Type</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3.5 font-semibold">Method</th>
                    <th className="px-4 py-3.5 font-semibold">Date</th>
                    <th className="px-4 py-3.5 font-semibold">Status</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => {
                    const on = selected?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors hover:bg-brand/10 ${on ? 'bg-brand/10' : ''} ${p.status === 'voided' ? 'opacity-60' : ''}`}
                      >
                        <td className="whitespace-nowrap border-t border-line px-4 py-3 font-mono text-[13px] text-ink-soft">
                          {p.txnNo}
                        </td>
                        <td className="whitespace-nowrap border-t border-line px-4 py-3 font-semibold">
                          {p.customerName}
                          {p.note && (
                            <div className="max-w-[200px] whitespace-normal text-xs font-normal text-ink-muted">
                              {p.note}
                            </div>
                          )}
                        </td>
                        {/* Long types (e.g. product names) wrap so the table fits a 1366 px laptop. */}
                        <td className="min-w-[140px] max-w-[200px] border-t border-line px-4 py-3 text-ink-soft">
                          {p.typeLabel}
                        </td>
                        <td
                          className={`whitespace-nowrap border-t border-line px-4 py-3 text-right font-bold ${
                            p.status === 'voided'
                              ? 'text-ink-muted line-through'
                              : p.status === 'refunded'
                                ? 'text-danger-text'
                                : ''
                          }`}
                        >
                          {formatPeso(p.status === 'refunded' ? -p.amount : p.amount)}
                        </td>
                        <td className="whitespace-nowrap border-t border-line px-4 py-3 text-ink-soft">
                          {p.methodLabel}
                        </td>
                        <td className="whitespace-nowrap border-t border-line px-4 py-3 text-ink-soft">
                          {formatDate(dayOf(p.at)).slice(0, 6)}
                          <span className="block text-xs text-ink-muted">{formatTime(p.at)}</span>
                        </td>
                        <td className="border-t border-line px-4 py-3">
                          <StatusBadge tone={PAYMENT_TONE[p.status]}>{p.statusLabel}</StatusBadge>
                        </td>
                        <td className="border-t border-line px-4 py-3 text-right">
                          {/* Short labels so both buttons sit on one line on a 1366 px laptop. */}
                          <span className="flex justify-end gap-1.5 whitespace-nowrap">
                            <Button size="sm" onClick={() => setSelected(p)}>
                              View
                            </Button>
                            <Button
                              size="sm"
                              icon="printer"
                              aria-label={`Print receipt ${p.txnNo}`}
                              disabled={p.status !== 'paid'}
                              title={
                                p.status === 'paid'
                                  ? undefined
                                  : 'Only paid payments can be printed'
                              }
                              onClick={() => {
                                setSelected(p);
                                if (p.status === 'paid') setDialog({ kind: 'print', payment: p });
                              }}
                            >
                              Print
                            </Button>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length === 0 && (
                <EmptyState
                  compact
                  icon="search"
                  title="No payments found"
                  message="Try another search or filter."
                />
              )}
            </div>
          )}
          {rows.length > PAGE_SIZE && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={rows.length}
              onPage={setPage}
              noun="payments"
            />
          )}
          <div className="border-t border-line px-4 py-3.5 text-[13px] text-ink-muted">
            Voided and refunded payments stay in the list with who changed them and why. Only the
            Owner can void or refund.
          </div>
          {!selected && all.length > 0 && (
            <div className="border-t border-line bg-card-2 px-4 py-3 text-sm text-ink-soft">
              Click <b>View</b> or <b>Print Receipt</b> on a payment to open its receipt.
            </div>
          )}
        </section>

        {selected && (
          <div
            className="flex w-full flex-col gap-3 lg:w-auto lg:max-w-[420px] lg:flex-[1_1_320px]"
            key={selected.id}
          >
            <ReceiptPanel
              payment={selected}
              onClose={() => setSelected(null)}
              onPrint={() => setDialog({ kind: 'print', payment: selected })}
              onSms={() => setDialog({ kind: 'sms', payment: selected })}
            />
            <PaymentActions
              payment={selected}
              owner={owner}
              onCollect={() => setDialog({ kind: 'record', owedId: selected.id })}
              onConfirm={() => confirm(selected)}
              onCorrect={(action) => setDialog({ kind: 'correct', action, payment: selected })}
            />
          </div>
        )}
      </div>

      <Presence show={dialog?.kind === 'record'}>
        <RecordPaymentModal
          initialOwedId={dialog?.owedId ?? null}
          onClose={() => setDialog(null)}
          onSaved={(payment) => afterSave(payment, 'Payment recorded')}
        />
      </Presence>
      <Presence show={dialog?.kind === 'print'}>
        {dialog?.payment && (
          <PrintReceiptModal
            payment={dialog.payment}
            onClose={() => setDialog(null)}
            print={print}
          />
        )}
      </Presence>
      <Presence show={dialog?.kind === 'sms'}>
        {dialog?.payment && (
          <SendReceiptSmsModal
            payment={dialog.payment}
            onClose={() => setDialog(null)}
            onPrintInstead={() => setDialog({ kind: 'print', payment: dialog.payment })}
          />
        )}
      </Presence>
      <Presence show={dialog?.kind === 'correct'}>
        {dialog?.payment && (
          <CorrectPaymentModal
            payment={dialog.payment}
            action={dialog.action}
            onClose={() => setDialog(null)}
            onDone={() => {
              setDialog(null);
              showToast({
                tone: 'brand',
                title: dialog.action === 'void' ? 'Payment voided' : 'Payment refunded',
                body: `${dialog.payment.txnNo} stays in the list. The change is in the audit history.`,
              });
            }}
          />
        )}
      </Presence>
      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}

/** Buttons under the receipt: collect, confirm a transfer, void or refund (Owner). */
function PaymentActions({ payment, owner, onCollect, onConfirm, onCorrect }) {
  const owed = payment.status === 'pending' && !payment.method;
  const waiting = payment.status === 'pending' && payment.method;
  const canVoid = owner && ['paid', 'pending'].includes(payment.status);
  const canRefund = owner && payment.status === 'paid';
  if (!owed && !waiting && !canVoid && !canRefund) return null;
  return (
    <div className="flex flex-wrap gap-2 rounded-card border border-line bg-card p-3">
      {owed && (
        <Button variant="primary" icon="cash" className="flex-1" onClick={onCollect}>
          Collect Payment
        </Button>
      )}
      {waiting &&
        (owner ? (
          <Button variant="primary" icon="check" className="flex-1" onClick={onConfirm}>
            Confirm Transfer
          </Button>
        ) : (
          <p className="text-sm text-ink-muted">Waiting for the Owner to confirm this transfer.</p>
        ))}
      {canVoid && (
        <Button variant="outline" className="flex-1" onClick={() => onCorrect('void')}>
          Void
        </Button>
      )}
      {canRefund && (
        <Button variant="outline" className="flex-1" onClick={() => onCorrect('refund')}>
          Refund
        </Button>
      )}
    </div>
  );
}
