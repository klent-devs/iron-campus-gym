import { formatPeso, formatTime } from '@icg/shared';
import { actions, memberMatches, membersView } from '@icg/demo-data';
import { useEffect, useId, useState } from 'react';
import {
  Button,
  Icon,
  Label,
  Modal,
  OptionGroup,
  TextField,
} from '../../../components/ui/index.js';
import { runAction, useDemoData } from '../../../lib/demo.js';
import { shake } from '../../../lib/motion.js';
import { useToday } from '../../../lib/useToday.js';
import { errorFields, formatPhone } from '../../members/helpers.js';
import { RECEIPT_PAGE, ReceiptPrint } from '../Receipt.jsx';
import { PaymentFields, emptyPayment, paymentInput, useEnabledMethods } from './PaymentFields.jsx';

const footer = (children) => (
  <div className="flex flex-wrap justify-end gap-2.5 border-t border-line bg-sidebar/60 px-6 pb-[22px] pt-4">
    {children}
  </div>
);

// ── Record Payment ───────────────────────────────────────────────────────────────────────

/**
 * Record Payment: sell a product, collect money still owed (unpaid walk-in, balance), or go to
 * Renew / Add Member for membership payments (those have their own steps).
 * `onSaved(payment)` opens the receipt.
 */
export function RecordPaymentModal({ onClose, onSaved, initialOwedId = null }) {
  const data = useDemoData();
  const today = useToday();
  const methods = useEnabledMethods();
  const ids = { kind: useId(), item: useId(), qty: useId(), who: useId(), owed: useId() };
  const [kind, setKind] = useState(initialOwedId ? 'owed' : 'product');
  const sellable = data.items.filter((i) => i.sellingPrice !== null);
  const [itemId, setItemId] = useState(sellable.find((i) => i.quantity > 0)?.id ?? '');
  const [qty, setQty] = useState('1');
  const [who, setWho] = useState('');
  const [memberId, setMemberId] = useState(null);
  const owed = data.payments
    .filter((p) => p.status === 'pending' && !p.method)
    .sort((a, b) => b.at.localeCompare(a.at));
  const [owedId, setOwedId] = useState(initialOwedId ?? owed[0]?.id ?? '');
  const [payment, setPayment] = useState(() => emptyPayment(methods[0]?.code));
  const [errors, setErrors] = useState({});

  const item = sellable.find((i) => i.id === itemId);
  const quantity = Math.max(0, Math.floor(Number(qty) || 0));
  const owedPayment = owed.find((p) => p.id === owedId);
  const amount =
    kind === 'product' ? (item ? item.sellingPrice * quantity : 0) : (owedPayment?.amount ?? 0);
  const memberMatchesList =
    !memberId && who.trim().length >= 2
      ? membersView(data, today)
          .filter((m) => memberMatches(m, who))
          .slice(0, 3)
      : [];

  function save() {
    try {
      let result;
      if (kind === 'product') {
        result = runAction(actions.sellProduct, {
          itemId,
          quantity,
          memberId,
          customerName: who,
          method: payment.method,
          ...paymentInput(payment, amount),
        });
      } else {
        const input = paymentInput(payment, amount);
        result = runAction(actions.collectPayment, {
          paymentId: owedId,
          method: payment.method,
          referenceNo: input.referenceNo,
        });
      }
      onSaved(result.payment);
    } catch (err) {
      setErrors(errorFields(err));
      shake(document.querySelector('[role="dialog"]'));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Record Payment"
      subtitle="Money received at the front desk. A receipt is made right away."
      size="lg"
      headerDivider
      footer={
        kind !== 'membership' &&
        footer(
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              onClick={save}
              disabled={kind === 'product' ? !item : !owedPayment}
              className="min-w-[200px]"
            >
              Record Payment · {formatPeso(amount)}
            </Button>
          </>,
        )
      }
    >
      <div className="flex flex-col gap-5 px-6 py-5">
        <div>
          <Label id={ids.kind}>What is it for?</Label>
          <OptionGroup
            labelId={ids.kind}
            value={kind}
            onChange={(k) => {
              setKind(k);
              setErrors({});
            }}
            options={[
              { value: 'product', label: 'Product', icon: 'box' },
              { value: 'owed', label: `Unpaid (${owed.length})`, icon: 'clock' },
              { value: 'membership', label: 'Membership', icon: 'card' },
            ]}
          />
        </div>

        {kind === 'membership' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <p className="text-sm text-ink-muted sm:col-span-2">
              Membership payments are recorded with the member’s new dates:
            </p>
            <Button to="/members/renew" variant="primary" icon="refresh" className="h-14">
              Renew Membership
            </Button>
            <Button to="/members/new" icon="userAdd" className="h-14">
              Add Member
            </Button>
          </div>
        )}

        {kind === 'product' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_150px]">
              <TextField
                id={ids.item}
                as="select"
                label="Item"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                error={errors.itemId}
              >
                {sellable.map((i) => (
                  <option key={i.id} value={i.id} disabled={i.quantity === 0}>
                    {i.name} — {formatPeso(i.sellingPrice)}
                    {i.quantity === 0 ? ' (out of stock)' : ` (${i.quantity} left)`}
                  </option>
                ))}
              </TextField>
              <TextField
                id={ids.qty}
                label="Quantity"
                type="number"
                min="1"
                max={item?.quantity}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                error={errors.quantity}
              />
            </div>
            <div className="relative">
              <TextField
                id={ids.who}
                label="Customer"
                hint="(optional: member name or ID)"
                placeholder="Counter sale"
                autoComplete="off"
                value={who}
                onChange={(e) => {
                  setWho(e.target.value);
                  setMemberId(null);
                }}
              />
              {memberId && (
                <p className="mt-1.5 text-[13px] text-success-text">
                  ✓ Linked to the member’s payment history
                </p>
              )}
              {memberMatchesList.length > 0 && (
                <ul className="mt-2 overflow-hidden rounded-btn border border-line">
                  {memberMatchesList.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setWho(m.name);
                          setMemberId(m.id);
                        }}
                        className="flex w-full items-center justify-between gap-3 border-t border-line px-3.5 py-2.5 text-left text-sm first:border-t-0 hover:bg-brand/[0.08]"
                      >
                        <b>{m.name}</b>
                        <span className="font-mono text-[12px] text-ink-muted">{m.code}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {kind === 'owed' &&
          (owed.length ? (
            <TextField
              id={ids.owed}
              as="select"
              label="Payment to collect"
              value={owedId}
              onChange={(e) => setOwedId(e.target.value)}
            >
              {owed.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.customerName} · {p.description} · {formatPeso(p.amount)} ({p.txnNo})
                </option>
              ))}
            </TextField>
          ) : (
            <p className="rounded-btn bg-card-2 p-3.5 text-sm text-ink-soft">
              Nothing unpaid. Everyone has paid.
            </p>
          ))}

        {kind !== 'membership' && (kind === 'product' || owed.length > 0) && (
          <PaymentFields value={payment} onChange={setPayment} amount={amount} errors={errors} />
        )}
        {(errors._ || errors.method) && (
          <p role="alert" className="text-sm text-danger-text">
            {errors._ ?? errors.method}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ── Void / Refund (Owner) ────────────────────────────────────────────────────────────────

const REASONS = {
  void: ['Entered twice', 'Wrong amount', 'Wrong member', 'Payment did not go through'],
  refund: ['Left early', 'Charged by mistake', 'Membership cancelled', 'Product returned'],
};

export function CorrectPaymentModal({ payment, action, onClose, onDone }) {
  const id = useId();
  const [reason, setReason] = useState(REASONS[action][0]);
  const [other, setOther] = useState('');
  const [error, setError] = useState('');
  const word = action === 'void' ? 'Void' : 'Refund';
  function save() {
    const text = reason === 'Other' ? other : reason;
    try {
      runAction(actions.correctPayment, { paymentId: payment.id, action, reason: text });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={`${word} ${payment.txnNo}?`}
      subtitle={`${payment.customerName} · ${formatPeso(payment.amount)}`}
      footer={footer(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={save}>
            {word} Payment
          </Button>
        </>,
      )}
    >
      <div className="flex flex-col gap-3.5 px-6 py-5">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          {action === 'void'
            ? 'Use this when the payment was entered by mistake. It stays in the list, crossed out, and no longer counts.'
            : 'Use this when money was given back to the customer. It stays in the list as Refunded.'}{' '}
          {payment.subscriptionId && 'The membership period it paid for is cancelled. '}
          {payment.type === 'product' && 'The items go back into stock. '}
          This is written to the audit history with your name.
        </p>
        <TextField
          id={id}
          as="select"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {[...REASONS[action], 'Other'].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </TextField>
        {reason === 'Other' && (
          <TextField
            id={`${id}-other`}
            label="Write the reason"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            autoFocus
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-text">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ── Print choice ─────────────────────────────────────────────────────────────────────────

/** Pick the printer, then the browser's print window opens (ReceiptPrint.dc.html "paper"). */
export function PrintReceiptModal({ payment, onClose, print }) {
  const go = (paper) => {
    print(<ReceiptPrint payment={payment} paper={paper} />, RECEIPT_PAGE[paper]);
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Print Receipt"
      subtitle={`${payment.txnNo} · ${payment.customerName}`}
    >
      <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-2">
        <Button variant="primary" icon="receipt" className="h-16" onClick={() => go('80mm')}>
          Receipt printer (80 mm)
        </Button>
        <Button icon="printer" className="h-16" onClick={() => go('A4')}>
          Normal printer (A4)
        </Button>
        <p className="text-[13px] text-ink-muted sm:col-span-2">
          The browser’s print window opens next. Pick the printer, or “Save as PDF” to keep a file.
        </p>
      </div>
    </Modal>
  );
}

// ── Send by SMS ──────────────────────────────────────────────────────────────────────────

/** "IRON CAMPUS GYM receipt TXN-…: PHP 1,200.00 via GCash for Monthly membership, …" (≤ 160). */
export function smsText(payment, gymName) {
  const amount = formatPeso(payment.amount).replace('₱', 'PHP ');
  const what = payment.detail
    ? `${payment.description}, ${payment.detail.replace(/ – /g, '-').replace(/ \d{4}-/, '-')}`
    : payment.description;
  return `${gymName} receipt ${payment.txnNo}: ${amount} via ${payment.methodLabel} for ${what}. Thank you!`;
}

/**
 * Send Receipt by SMS (ReceiptSms.dc.html): Ready → Sending… → Sent, or No internet.
 * SAMPLE: nothing is really sent (SMS needs the cloud service, milestone 8); the payment notes it.
 */
export function SendReceiptSmsModal({ payment, onClose, onPrintInstead }) {
  const data = useDemoData();
  const id = useId();
  const [num, setNum] = useState(
    formatPhone(payment.phone ?? '') === '—' ? '' : formatPhone(payment.phone),
  );
  const [state, setState] = useState('ready');
  const [error, setError] = useState('');
  const [sentAt, setSentAt] = useState(null);
  const msg = smsText(payment, data.settings.gymName);

  useEffect(() => {
    if (state !== 'sending') return undefined;
    const t = setTimeout(() => {
      try {
        runAction(actions.markReceiptSent, { paymentId: payment.id, to: num });
        setSentAt(new Date().toISOString());
        setState('sent');
      } catch (err) {
        setError(err.message);
        setState('ready');
      }
    }, 1400);
    return () => clearTimeout(t);
  }, [state, payment.id, num]);

  function send() {
    if (!/^09\d{9}$/.test(num.replace(/\D/g, ''))) {
      setError('Enter 11 digits, like 0917 123 4567');
      shake(document.getElementById(id));
      return;
    }
    setError('');
    setState(navigator.onLine === false ? 'offline' : 'sending');
  }

  return (
    <Modal
      open
      onClose={state === 'sending' ? () => {} : onClose}
      title="Send Receipt by SMS"
      subtitle={`${payment.txnNo} · ${payment.customerName} · ${formatPeso(payment.amount)}`}
      headerDivider
      size="lg"
      footer={
        state === 'sent'
          ? footer(
              <Button variant="primary" onClick={onClose} className="h-12 flex-1 text-[16px]">
                Done
              </Button>,
            )
          : state === 'offline'
            ? footer(
                <>
                  <Button onClick={onPrintInstead} className="flex-1">
                    Print Receipt Instead
                  </Button>
                  <Button variant="primary" onClick={send} className="flex-1 text-[16px]">
                    Try Again
                  </Button>
                </>,
              )
            : footer(
                <>
                  <Button onClick={onClose} disabled={state === 'sending'} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={send}
                    busy={state === 'sending'}
                    className="flex-[2] text-[16px]"
                  >
                    {state === 'sending' ? 'Sending…' : 'Send SMS'}
                  </Button>
                </>,
              )
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <TextField
            id={id}
            label="Mobile Number"
            inputMode="numeric"
            value={num}
            disabled={state === 'sending'}
            onChange={(e) => {
              setNum(e.target.value);
              setError('');
            }}
            error={error}
          />
          {!error && (
            <p className="mt-1.5 text-[13px] text-ink-muted">
              {payment.phone
                ? `Filled in from ${payment.customerName.split(' ')[0]}’s record. You can change it.`
                : 'Type the customer’s mobile number.'}
            </p>
          )}
        </div>
        <div>
          <Label>Message Preview</Label>
          <div className="rounded-[16px_16px_16px_4px] bg-card-2 p-3.5 text-sm leading-normal text-ink-soft">
            {msg}
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            {msg.length <= 160 ? '1 SMS' : '2 SMS'} · {msg.length} of 160 characters
          </p>
        </div>
        {state === 'sent' && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-btn border border-success/40 bg-success/[0.12] p-3.5"
          >
            <Icon name="check" className="text-success-text" />
            <div>
              <b className="text-success-text">Receipt sent</b>
              <div className="mt-0.5 text-sm text-ink-soft">
                Sent to {num} at {formatTime(sentAt)}. This is noted on the payment. (Sample: no
                real SMS goes out until the SMS service is connected.)
              </div>
            </div>
          </div>
        )}
        {state === 'offline' && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-btn border border-danger/40 bg-danger/10 p-3.5"
          >
            <Icon name="alert" className="text-danger-text" />
            <div>
              <b className="text-danger-text">No internet. SMS not sent.</b>
              <div className="mt-0.5 text-sm text-ink-soft">
                The payment is saved. Print the receipt instead, or try again when the internet is
                back.
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
