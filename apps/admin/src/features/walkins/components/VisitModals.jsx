import { formatDate, formatDuration, formatPeso, formatTime, todayInGym } from '@icg/shared';
import { useId, useState } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { useNow } from '../../../lib/useNow.js';
import { WALKIN_PAYMENT_METHODS, customerHistory, formatPhone, methodName } from '../demoData.js';
import { InfoBox, Label, OptionGroup } from './formParts.jsx';

function Actions({ children }) {
  return <div className="mt-[22px] flex flex-wrap justify-end gap-2.5">{children}</div>;
}

/** Record Payment for an unpaid walk-in (docs/design/WalkInRecords.dc.html). */
export function RecordPaymentModal({ visit, customer, onClose, onConfirm }) {
  const [method, setMethod] = useState('cash');
  const labelId = useId();
  return (
    <Modal
      open
      onClose={onClose}
      showClose={false}
      title="Record Payment"
      subtitle={`${customer.name} · walk-in in at ${formatTime(visit.timeIn)}`}
    >
      <div className="px-6 pb-6 pt-[18px]">
        <div className="flex items-baseline justify-between gap-3 rounded-btn bg-card-2 px-4 py-3.5">
          <span className="text-ink-soft">Amount due</span>
          <b className="font-heading text-[26px] font-bold text-brand-text">
            {formatPeso(visit.fee)}
          </b>
        </div>
        <div className="mt-4">
          <Label id={labelId}>Payment Method</Label>
          <OptionGroup
            labelId={labelId}
            value={method}
            onChange={setMethod}
            options={WALKIN_PAYMENT_METHODS.map((m) => ({
              value: m.code,
              label: methodName(m.code),
            }))}
          />
        </div>
        <Actions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(method)}>
            Record Payment
          </Button>
        </Actions>
      </div>
    </Modal>
  );
}

/** Complete Visit: saves the time out (now). Warns when the visit is still unpaid. */
export function CompleteVisitModal({ visit, customer, onClose, onConfirm }) {
  const now = useNow(60_000);
  return (
    <Modal
      open
      onClose={onClose}
      showClose={false}
      title="Complete Visit"
      subtitle={`Save the time out for ${customer.name}.`}
    >
      <div className="px-6 pb-6 pt-[18px]">
        <div className="grid grid-cols-3 gap-2.5">
          <InfoBox label="Time In">{formatTime(visit.timeIn)}</InfoBox>
          <InfoBox label="Time Out" valueClassName="text-brand-text">
            {formatTime(now)}
          </InfoBox>
          <InfoBox label="Duration">{formatDuration(visit.timeIn, now)}</InfoBox>
        </div>
        {visit.paymentStatus === 'unpaid' && (
          <p
            role="alert"
            className="mt-3.5 rounded-btn border border-danger/40 bg-danger/10 px-3.5 py-3 text-sm text-ink"
          >
            This visit is still <b className="text-danger-text">unpaid ({formatPeso(visit.fee)})</b>
            . Record the payment before they leave.
          </p>
        )}
        <Actions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(now)}>
            Save Time Out
          </Button>
        </Actions>
      </div>
    </Modal>
  );
}

const shortDay = (iso) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** View History side panel: visits, money spent and the "Make Member" button. */
export function WalkInHistoryDrawer({ customer, visits, onClose }) {
  const today = todayInGym();
  const h = customerHistory(customer, visits, today);
  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title={customer.name}
      subtitle={
        <span className="text-sm text-ink-muted">
          {formatPhone(customer.phone)} · walk-in customer
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-2.5">
        <InfoBox label="This month" valueClassName="font-heading text-[20px]">
          {h.monthCount} {h.monthCount === 1 ? 'visit' : 'visits'}
        </InfoBox>
        <InfoBox label="Spent" valueClassName="font-heading text-[20px]">
          {formatPeso(h.monthSpent)}
        </InfoBox>
        <InfoBox label="First visit" valueClassName="text-[15px]">
          {h.firstVisit ? formatDate(h.firstVisit).slice(0, 6) : '—'}
        </InfoBox>
      </div>

      {h.suggestion && (
        <div className="rounded-btn border border-brand/35 bg-brand/[0.08] p-3.5 text-sm leading-normal">
          {h.suggestion}
        </div>
      )}

      <ul>
        {h.visits.map((v) => {
          const day = todayInGym(new Date(v.timeIn));
          const paid =
            v.paymentStatus === 'paid'
              ? methodName(v.paymentMethod)
              : v.paymentStatus === 'refunded'
                ? 'Refunded'
                : 'Unpaid';
          return (
            <li
              key={v.id}
              className="flex justify-between gap-2.5 border-t border-line py-3 text-sm"
            >
              <span>
                <b>
                  {shortDay(day)}, {formatDate(day).slice(0, 6)}
                </b>
                <span className="block text-ink-muted">
                  {formatTime(v.timeIn)} – {v.timeOut ? formatTime(v.timeOut) : 'now'}
                </span>
              </span>
              <span className="text-right">
                {formatPeso(v.fee)}
                <span className="block text-ink-muted">{paid}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex-1" />
      {/* TODO(api): pass the walk-in customer to Add Member so their visits move to the profile. */}
      <Button to="/members/new" variant="primary" className="h-[52px]">
        Make Member
      </Button>
      <p className="text-[13px] text-ink-muted">
        Their walk-in visits and payments move to the new member profile.
      </p>
    </Modal>
  );
}
