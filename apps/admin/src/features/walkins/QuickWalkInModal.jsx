import {
  formatClock,
  formatDate,
  formatPeso,
  todayInGym,
  walkinVisitCreateSchema,
} from '@icg/shared';
import { useId, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { useNow } from '../../lib/useNow.js';
import { FieldError, INPUT, Label, OptionGroup, inputBorder } from './components/formParts.jsx';
import { DEMO_FEES, FEE_TYPE_LABELS, WALKIN_PAYMENT_METHODS, methodName } from './demoData.js';
import { registerVisit } from './demoStore.js';

const PAY_LATER = 'later';

/**
 * Register Walk-in pop-up (docs/design/WalkIn.dc.html). Render it only while open, so every
 * opening starts with an empty form. Time in is set when staff confirm.
 * DEMO: saves to the in-memory sample data (demoStore.js), not the database.
 */
export function QuickWalkInModal({ onClose, onRegistered }) {
  const now = useNow(60_000);
  const ids = { name: useId(), phone: useId(), date: useId(), fee: useId(), method: useId() };
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [feeType, setFeeType] = useState('regular');
  const [method, setMethod] = useState('cash');
  const [errors, setErrors] = useState({});

  const fee = DEMO_FEES[feeType];
  const timeNow = formatClock(now, { seconds: false });

  function handleSubmit(event) {
    event.preventDefault();
    const parsed = walkinVisitCreateSchema.safeParse({
      customerName: name,
      contactNumber: phone,
      fee,
      feeType,
      paymentMethodCode: method === PAY_LATER ? null : method,
    });
    if (!parsed.success) {
      const next = {};
      for (const issue of parsed.error.issues) next[issue.path[0]] ??= issue.message;
      setErrors(next);
      document.getElementById(next.customerName ? ids.name : ids.phone)?.focus();
      return;
    }
    const result = registerVisit(parsed.data);
    onRegistered(result);
    onClose();
  }

  const clear = (field) => errors[field] && setErrors((e) => ({ ...e, [field]: undefined }));

  return (
    <Modal
      open
      onClose={onClose}
      title="Register Walk-in"
      size="lg"
      headerDivider
      footer={
        <div className="flex gap-2.5 px-6 pb-[22px] pt-4">
          <Button onClick={onClose} className="h-[52px] flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            form="register-walkin"
            variant="primary"
            className="h-[52px] flex-[2] text-[16px]"
          >
            Confirm Visit · {method === PAY_LATER ? 'Pay Later' : formatPeso(fee)}
          </Button>
        </div>
      }
    >
      <form
        id="register-walkin"
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 px-6 py-[22px]"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={ids.name}>Customer Name</Label>
            <input
              id={ids.name}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clear('customerName');
              }}
              autoComplete="off"
              aria-invalid={errors.customerName ? true : undefined}
              aria-describedby={errors.customerName ? `${ids.name}-err` : undefined}
              className={`${INPUT} ${inputBorder(errors.customerName)}`}
            />
            <FieldError id={`${ids.name}-err`}>{errors.customerName}</FieldError>
          </div>
          <div>
            <Label htmlFor={ids.phone} hint="(optional)">
              Contact Number
            </Label>
            <input
              id={ids.phone}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clear('contactNumber');
              }}
              inputMode="tel"
              autoComplete="off"
              placeholder="09XX XXX XXXX"
              aria-invalid={errors.contactNumber ? true : undefined}
              aria-describedby={errors.contactNumber ? `${ids.phone}-err` : undefined}
              className={`${INPUT} ${inputBorder(errors.contactNumber)}`}
            />
            <FieldError id={`${ids.phone}-err`}>{errors.contactNumber}</FieldError>
          </div>
        </div>

        <div>
          <Label htmlFor={ids.date}>Visit Date</Label>
          <input
            id={ids.date}
            readOnly
            value={`Today · ${formatDate(todayInGym(now))}`}
            className={`${INPUT} border-line text-ink-soft`}
          />
        </div>

        <div>
          <Label id={ids.fee}>Walk-in Fee</Label>
          <OptionGroup
            labelId={ids.fee}
            value={feeType}
            onChange={setFeeType}
            options={Object.keys(DEMO_FEES).map((type) => ({
              value: type,
              label: `${FEE_TYPE_LABELS[type]} · ${formatPeso(DEMO_FEES[type])}`,
            }))}
          />
        </div>

        <div>
          <Label id={ids.method}>Payment Method</Label>
          <OptionGroup
            labelId={ids.method}
            value={method}
            onChange={setMethod}
            options={[
              ...WALKIN_PAYMENT_METHODS.map((m) => ({ value: m.code, label: methodName(m.code) })),
              { value: PAY_LATER, label: 'Pay later' },
            ]}
          />
        </div>

        <p className="rounded-btn bg-card-2 px-3.5 py-3 text-sm text-ink-soft">
          Time in is recorded automatically when you confirm ({timeNow}).
          {method === PAY_LATER && ' The visit is saved as Unpaid until you record the payment.'}
        </p>
      </form>
    </Modal>
  );
}
