import { formatDate, formatPeso, formatTime } from '@icg/shared';
import { dayOf } from '@icg/demo-data';
import { LogoMark } from '../../assets/Logo.jsx';
import { Button, Icon } from '../../components/ui/index.js';
import { useDemoData } from '../../lib/demo.js';

/** Status line on a receipt that is not (or no longer) proof of payment (Payments.dc.html). */
const NOTES = {
  pending: {
    text: 'NOT PAID YET · receipt can be printed once paid',
    cls: 'bg-[#FFF4E0] text-[#7A4F0A]',
  },
  voided: { text: 'VOIDED · not valid as proof of payment', cls: 'bg-[#FCEBEB] text-[#8A2424]' },
  refunded: {
    text: 'REFUNDED · money given back to the customer',
    cls: 'bg-[#F1F1F3] text-[#3F3F46]',
  },
};
const AMOUNT_LABEL = {
  paid: 'AMOUNT PAID',
  pending: 'AMOUNT DUE',
  refunded: 'AMOUNT REFUNDED',
  voided: 'AMOUNT (VOIDED)',
};

/** What the receipt shows, from a payment row (demo-data `paymentInfo`). */
export function receiptLines(p) {
  const lines = p.items?.length
    ? p.items.map((i) => ({
        what: `${i.name} × ${i.quantity}`,
        detail: '',
        amount: i.price * i.quantity,
      }))
    : [{ what: p.description, detail: p.detail, amount: p.amount }];
  let method = p.methodLabel;
  if (!p.method) method = 'Not paid yet';
  else if (p.referenceNo) method = `${p.methodLabel} · Ref ${p.referenceNo}`;
  else if (p.method === 'bank_transfer') method = 'Bank Transfer · Ref awaiting check';
  return {
    when: `${formatDate(dayOf(p.at))} · ${formatTime(p.at)}`,
    customer: p.customerId ? `${p.customerName} · ${p.customerId}` : p.customerName,
    lines,
    method,
    note: NOTES[p.status] ?? null,
    amountLabel: AMOUNT_LABEL[p.status],
  };
}

function useGym() {
  const { gymName, address, contactNumber } = useDemoData().settings;
  return {
    name: gymName,
    address: address || '[GYM ADDRESS]',
    contact: contactNumber || '[CONTACT NO.]',
  };
}

/**
 * The white receipt panel next to Transaction History (Payments.dc.html). Print and Send by SMS
 * only work for a paid payment.
 */
export function ReceiptPanel({ payment, onClose, onPrint, onSms }) {
  const gym = useGym();
  const r = receiptLines(payment);
  const paid = payment.status === 'paid';
  return (
    <section
      aria-label="Receipt preview"
      className="relative w-full self-start rounded-card bg-white p-6 font-sans text-[#090A0C] motion-safe:animate-rise lg:max-w-[420px] lg:flex-[1_1_320px]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close receipt"
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-btn bg-[#F4F4F5] text-[#090A0C] transition hover:bg-[#E4E4E7]"
      >
        <Icon name="close" size={16} />
      </button>
      <div className="flex items-center gap-2.5 pr-12">
        <LogoMark size={36} bar="#090A0C" />
        <div className="leading-[1.1]">
          <b className="block font-heading text-[16px] font-extrabold tracking-[0.03em]">
            {gym.name}
          </b>
          <span className="text-[11px] text-[#52525B]">
            {gym.address} · {gym.contact}
          </span>
        </div>
      </div>
      <div className="mb-2.5 mt-4 text-center text-[13px] font-bold tracking-[0.18em] text-[#52525B]">
        OFFICIAL RECEIPT
      </div>
      {r.note && (
        <div className={`mb-2.5 rounded-lg p-2 text-center text-xs font-bold ${r.note.cls}`}>
          {r.note.text}
        </div>
      )}
      <div className="border-t border-dashed border-[#A1A1AA] pt-2.5 text-[13px]">
        <Row label="Transaction No.">
          <b>{payment.txnNo}</b>
        </Row>
        <Row label="Date & Time">{r.when}</Row>
        <Row label="Customer">{r.customer}</Row>
        <Row label="Processed By">{payment.staffName}</Row>
      </div>
      <div className="mt-2.5 border-t border-dashed border-[#A1A1AA] pt-2.5 text-[13px]">
        {r.lines.map((l) => (
          <div key={l.what} className="flex justify-between gap-3 py-1">
            <span>
              {l.what}
              {l.detail && <span className="block text-[#52525B]">{l.detail}</span>}
            </span>
            <b>{formatPeso(l.amount)}</b>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-baseline justify-between border-t-2 border-[#090A0C] pt-2.5">
        <b>{r.amountLabel}</b>
        <b
          className={`font-heading text-[24px] font-extrabold ${
            payment.status === 'voided'
              ? 'text-[#71717A] line-through'
              : payment.status === 'refunded'
                ? 'text-[#B42318]'
                : ''
          }`}
        >
          {formatPeso(payment.status === 'refunded' ? -payment.amount : payment.amount)}
        </b>
      </div>
      <div className="text-[13px]">
        <Row label="Payment Method">{r.method}</Row>
        {payment.sms && (
          <Row label="Sent by SMS">
            {payment.sms.to} · {formatTime(payment.sms.at)}
          </Row>
        )}
      </div>
      <p className="mt-3.5 text-center font-heading text-xs font-extrabold tracking-[0.14em] text-brand-light">
        STRONGER EVERY DAY.
      </p>
      <div className="mt-4 flex gap-2">
        <Button
          icon="printer"
          disabled={!paid}
          onClick={onPrint}
          className="flex-1 !border-[#090A0C] !bg-[#090A0C] !text-white hover:!bg-[#27272A]"
        >
          Print Receipt
        </Button>
        <Button
          icon="message"
          disabled={!paid}
          onClick={onSms}
          className="flex-1 !border-[#E4E4E7] !bg-[#F4F4F5] !text-[#090A0C] hover:!bg-[#E4E4E7]"
        >
          Send by SMS
        </Button>
      </div>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-[#52525B]">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/**
 * Printed receipt (ReceiptPrint.dc.html): `paper="80mm"` for the front-desk receipt printer, or
 * `paper="A4"` (half a page, with a cut line) for a normal printer.
 */
export function ReceiptPrint({ payment, paper = '80mm' }) {
  const gym = useGym();
  const r = receiptLines(payment);
  if (paper === '80mm') {
    return (
      <div
        style={{
          width: '72mm',
          font: '12px/1.5 "Courier New", ui-monospace, monospace',
          color: '#111',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            font: '800 14px Poppins, sans-serif',
            letterSpacing: '0.03em',
          }}
        >
          {gym.name}
        </div>
        <div style={{ textAlign: 'center' }}>
          {gym.address}
          <br />
          {gym.contact}
        </div>
        <Dash />
        <div style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.12em' }}>
          OFFICIAL RECEIPT
        </div>
        <Dash />
        <P label="No.">
          <b>{payment.txnNo}</b>
        </P>
        <P label="Date">{`${formatDate(dayOf(payment.at))} ${formatTime(payment.at)}`}</P>
        <P label="Customer">{payment.customerName}</P>
        {payment.customerId && payment.customerId !== 'Walk-in' && (
          <P label="Member ID">{payment.customerId}</P>
        )}
        <P label="Cashier">{payment.staffName}</P>
        <Dash />
        {r.lines.map((l) => (
          <div key={l.what}>
            <div>{l.what}</div>
            <P label={l.detail || ''}>{formatPeso(l.amount)}</P>
          </div>
        ))}
        <div style={{ borderTop: '2px solid #111', margin: '8px 0' }} />
        <P label={<b>{r.amountLabel}</b>}>
          <b>{formatPeso(payment.amount)}</b>
        </P>
        <P label="Paid by">{r.method}</P>
        <Dash />
        <div style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.1em' }}>
          STRONGER EVERY DAY.
        </div>
        <div style={{ textAlign: 'center' }}>Thank you!</div>
      </div>
    );
  }
  return (
    <div
      style={{
        width: '120mm',
        padding: '6mm 8mm',
        fontFamily: 'Inter, sans-serif',
        color: '#090A0C',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogoMark size={30} bar="#090A0C" />
        <div style={{ lineHeight: 1.1 }}>
          <b style={{ display: 'block', font: '800 14px Poppins, sans-serif' }}>{gym.name}</b>
          <span style={{ fontSize: 10, color: '#52525B' }}>
            {gym.address} · {gym.contact}
          </span>
        </div>
      </div>
      <div
        style={{
          textAlign: 'center',
          margin: '12px 0 8px',
          font: '700 11px Inter',
          letterSpacing: '0.18em',
          color: '#52525B',
        }}
      >
        OFFICIAL RECEIPT
      </div>
      <div style={{ borderTop: '1px dashed #A1A1AA', paddingTop: 6, fontSize: 11 }}>
        <P label="Transaction No.">
          <b>{payment.txnNo}</b>
        </P>
        <P label="Date & Time">{r.when}</P>
        <P label="Customer">{r.customer}</P>
        <P label="Processed By">{payment.staffName}</P>
      </div>
      <div style={{ borderTop: '1px dashed #A1A1AA', marginTop: 6, paddingTop: 6, fontSize: 11 }}>
        {r.lines.map((l) => (
          <P key={l.what} label={`${l.what}${l.detail ? ` · ${l.detail}` : ''}`}>
            <b>{formatPeso(l.amount)}</b>
          </P>
        ))}
      </div>
      <div
        style={{
          borderTop: '2px solid #090A0C',
          marginTop: 6,
          paddingTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <b style={{ fontSize: 12 }}>{r.amountLabel}</b>
        <b style={{ font: '800 18px Poppins, sans-serif' }}>{formatPeso(payment.amount)}</b>
      </div>
      <div style={{ fontSize: 11 }}>
        <P label="Payment Method">{r.method}</P>
      </div>
      <p
        style={{
          margin: '8px 0 0',
          textAlign: 'center',
          font: '800 10px Poppins, sans-serif',
          letterSpacing: '0.14em',
          color: '#D93208',
        }}
      >
        STRONGER EVERY DAY.
      </p>
      <div
        style={{
          marginTop: 14,
          borderTop: '1px dashed #A1A1AA',
          textAlign: 'center',
          fontSize: 10,
          color: '#71717A',
          paddingTop: 4,
        }}
      >
        ✂ cut here: one receipt per half page
      </div>
    </div>
  );
}

const Dash = () => <div style={{ borderTop: '1px dashed #555', margin: '8px 0' }} />;

function P({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span>{label}</span>
      <span style={{ textAlign: 'right' }}>{children}</span>
    </div>
  );
}

/** Page size for each paper, for usePrint(). */
export const RECEIPT_PAGE = {
  '80mm': { page: '80mm auto', margin: '4mm' },
  A4: { page: 'A4', margin: '12mm' },
};
