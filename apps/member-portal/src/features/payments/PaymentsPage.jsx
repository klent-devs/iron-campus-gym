import { formatDate, formatPeso, formatTime } from '@icg/shared';
import { dayOf, indexes, methodName, staffName } from '@icg/demo-data';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, LogoMark } from '../../components/Icon.jsx';
import { Box, Screen, Sheet } from '../../components/ui.jsx';
import { useMemberInfo } from '../../lib/useMemberInfo.js';

const PILL = {
  paid: ['Paid', 'text-success-text bg-success/15'],
  refunded: ['Refunded', 'text-[#C4C4CC] bg-ink-muted/15'],
  voided: ['Voided', 'text-danger-text bg-danger/15'],
  pending: ['Pending', 'text-warning-text bg-warning/15'],
};

/** Payment History (docs/design/MPayments.dc.html) with View Receipt and Download (PDF). */
export function PaymentsPage() {
  const { state, info } = useMemberInfo();
  const [open, setOpen] = useState(null);
  const [printing, setPrinting] = useState(null);
  const payments = [...(indexes(state).paymentsByMember.get(info.id) ?? [])].sort((a, b) =>
    b.at.localeCompare(a.at),
  );

  // Download = the browser's print window, where "Save as PDF" keeps a file.
  useEffect(() => {
    if (!printing) return undefined;
    document.documentElement.classList.add('print-area-active');
    const done = () => setPrinting(null);
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', done);
      document.documentElement.classList.remove('print-area-active');
    };
  }, [printing]);

  return (
    <Screen title="Payment History" back="/profile">
      <div className="mt-3.5 flex flex-col gap-3">
        {payments.length === 0 && (
          <Box className="p-4 text-sm text-ink-muted">No payments yet.</Box>
        )}
        {payments.map((p) => {
          const [label, tone] = PILL[p.status];
          return (
            <Box key={p.id} className="p-4">
              <div className="flex justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="text-[16px] font-semibold">{p.description}</div>
                  <div className="mt-0.5 text-[13px] text-ink-muted">
                    {formatDate(dayOf(p.at))} · {methodName(state, p.method)}
                  </div>
                </div>
                <b
                  className={`whitespace-nowrap font-heading text-[18px] ${p.status === 'refunded' || p.status === 'voided' ? 'text-ink-muted line-through' : ''}`}
                >
                  {formatPeso(p.amount)}
                </b>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[13px] text-ink-soft">{p.txnNo}</span>
                <span
                  className={`inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-bold ${tone}`}
                >
                  {label}
                </span>
              </div>
              {p.status === 'paid' && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(p)}
                    className="h-[46px] flex-1 rounded-xl border border-line bg-card-2 text-sm font-semibold"
                  >
                    View Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinting(p)}
                    aria-label={`Download receipt ${p.txnNo}`}
                    className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-card-2 text-sm font-semibold"
                  >
                    <Icon name="download" size={18} />
                    Download
                  </button>
                </div>
              )}
            </Box>
          );
        })}
      </div>
      {open && (
        <Sheet title="Receipt" onClose={() => setOpen(null)}>
          <div className="mt-4 rounded-2xl bg-white p-5 text-[#090A0C]">
            <Receipt payment={open} state={state} member={info} />
          </div>
          <button
            type="button"
            onClick={() => {
              setPrinting(open);
              setOpen(null);
            }}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-heading font-bold"
          >
            <Icon name="download" size={20} />
            Download (Save as PDF)
          </button>
        </Sheet>
      )}
      {printing &&
        createPortal(
          <div
            id="print-area"
            style={{ width: '120mm', padding: '8mm', fontFamily: 'Inter, sans-serif' }}
          >
            <Receipt payment={printing} state={state} member={info} />
          </div>,
          document.body,
        )}
    </Screen>
  );
}

function Receipt({ payment: p, state, member }) {
  const { gymName, address, contactNumber } = state.settings;
  const row = (label, value) => (
    <div className="flex justify-between gap-3 py-1 text-[13px]">
      <span className="text-[#52525B]">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
  return (
    <>
      <div className="flex items-center gap-2.5">
        <LogoMark size={32} bar="#090A0C" />
        <div className="leading-tight">
          <b className="block font-heading text-[15px] font-extrabold">{gymName}</b>
          <span className="text-[11px] text-[#52525B]">
            {address || '[GYM ADDRESS]'} · {contactNumber || '[CONTACT NO.]'}
          </span>
        </div>
      </div>
      <div className="my-3 text-center text-xs font-bold tracking-[0.18em] text-[#52525B]">
        OFFICIAL RECEIPT
      </div>
      <div className="border-t border-dashed border-[#A1A1AA] pt-2">
        {row('Transaction No.', <b>{p.txnNo}</b>)}
        {row('Date & Time', `${formatDate(dayOf(p.at))} · ${formatTime(p.at)}`)}
        {row('Member', `${member.name} · ${member.code}`)}
        {row('Processed By', staffName(state, p.staffId))}
      </div>
      <div className="mt-2 border-t border-dashed border-[#A1A1AA] pt-2">
        {row(
          <span className="text-[#090A0C]">
            {p.description}
            {p.detail && <span className="block text-[#52525B]">{p.detail}</span>}
          </span>,
          <b>{formatPeso(p.amount)}</b>,
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t-2 border-[#090A0C] pt-2">
        <b>AMOUNT PAID</b>
        <b className="font-heading text-[22px] font-extrabold">{formatPeso(p.amount)}</b>
      </div>
      {row(
        'Payment Method',
        p.referenceNo
          ? `${methodName(state, p.method)} · Ref ${p.referenceNo}`
          : methodName(state, p.method),
      )}
      <p className="mt-3 text-center font-heading text-xs font-extrabold tracking-[0.14em] text-brand-light">
        STRONGER EVERY DAY.
      </p>
    </>
  );
}
