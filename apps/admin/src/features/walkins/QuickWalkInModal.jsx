import {
  formatClock,
  formatDate,
  formatPeso,
  todayInGym,
  walkinVisitCreateSchema,
} from '@icg/shared';
import { useId, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { shake } from '../../lib/motion.js';
import { useNow } from '../../lib/useNow.js';
import { FieldError, IconInput, Label, OptionGroup } from './components/formParts.jsx';
import {
  DEMO_FEES,
  FEE_TYPE_LABELS,
  METHOD_ICONS,
  WALKIN_PAYMENT_METHODS,
  formatPhone,
  methodName,
  visitDate,
} from './demoData.js';
import { registerVisit, useWalkinDemo } from './demoStore.js';

const PAY_LATER = 'later';

/**
 * Register Walk-in pop-up (docs/design/WalkIn.dc.html). Render it only while open, so every
 * opening starts with an empty form. Time in is set when staff confirm.
 * While staff type a name, past walk-in customers with that name are offered, so a regular is
 * picked (with their number) instead of being typed in again.
 * DEMO: saves to the in-memory sample data (demoStore.js), not the database.
 */
export function QuickWalkInModal({ onClose, onRegistered, initialName = '' }) {
  const now = useNow(60_000);
  const { customers, visits } = useWalkinDemo();
  const ids = { name: useId(), phone: useId(), fee: useId(), method: useId(), past: useId() };
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [pickedId, setPickedId] = useState(null);
  const [feeType, setFeeType] = useState('regular');
  const [method, setMethod] = useState('cash');
  const [errors, setErrors] = useState({});

  const fee = DEMO_FEES[feeType];
  const payLater = method === PAY_LATER;

  // Visits per customer, newest first, for the "Been here before?" list.
  const pastVisits = useMemo(() => {
    const map = new Map();
    for (const v of [...visits].sort((a, b) => b.timeIn.localeCompare(a.timeIn))) {
      if (!map.has(v.customerId)) map.set(v.customerId, []);
      map.get(v.customerId).push(v);
    }
    return map;
  }, [visits]);

  const query = name.trim().toLowerCase();
  const matches =
    pickedId || query.length < 2
      ? []
      : customers.filter((c) => c.name.toLowerCase().includes(query)).slice(0, 3);
  const picked = pickedId && customers.find((c) => c.id === pickedId);

  function pick(customer) {
    setName(customer.name);
    setPhone(customer.phone ?? '');
    setPickedId(customer.id);
    setErrors({});
    // Next step is the fee: move the cursor to the picked fee button.
    document.querySelector(`[aria-labelledby="${ids.fee}"] [aria-checked="true"]`)?.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const parsed = walkinVisitCreateSchema.safeParse({
      customerName: name,
      contactNumber: phone,
      fee,
      feeType,
      paymentMethodCode: payLater ? null : method,
    });
    if (!parsed.success) {
      const next = {};
      for (const issue of parsed.error.issues) next[issue.path[0]] ??= issue.message;
      setErrors(next);
      if (next.customerName) shake(document.getElementById(ids.name));
      if (next.contactNumber) shake(document.getElementById(ids.phone));
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
      subtitle="Day pass for someone who is not a member."
      size="lg"
      headerDivider
      footer={
        <div className="flex gap-2.5 border-t border-line bg-sidebar/60 px-6 pb-[22px] pt-4">
          <Button onClick={onClose} className="h-[52px] flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            form="register-walkin"
            variant="primary"
            icon="check"
            className="h-[52px] flex-[2] text-[16px] shadow-[0_10px_24px_-10px_rgb(255_61_10/0.7)]"
          >
            Confirm Visit · {payLater ? 'Pay Later' : formatPeso(fee)}
          </Button>
        </div>
      }
    >
      <form
        id="register-walkin"
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 px-6 py-[22px]"
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={ids.name}>Customer Name</Label>
              <IconInput
                id={ids.name}
                icon="user"
                error={errors.customerName}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setPickedId(null);
                  clear('customerName');
                }}
                autoComplete="off"
                placeholder="Full name"
                aria-invalid={errors.customerName ? true : undefined}
                aria-describedby={
                  errors.customerName ? `${ids.name}-err` : matches.length ? ids.past : undefined
                }
              />
              <FieldError id={`${ids.name}-err`}>{errors.customerName}</FieldError>
            </div>
            <div>
              <Label htmlFor={ids.phone} hint="(optional)">
                Contact Number
              </Label>
              <IconInput
                id={ids.phone}
                icon="phone"
                error={errors.contactNumber}
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
              />
              <FieldError id={`${ids.phone}-err`}>{errors.contactNumber}</FieldError>
            </div>
          </div>

          {matches.length > 0 && (
            <div
              id={ids.past}
              className="rounded-btn border border-line bg-sidebar p-1.5 motion-safe:animate-drop-in"
            >
              <p className="px-2.5 pb-1 pt-1.5 text-[13px] font-semibold text-ink-muted">
                Been here before? Pick them to fill in their details.
              </p>
              {matches.map((c) => {
                const own = pastVisits.get(c.id) ?? [];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pick(c)}
                    className="flex min-h-touch w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition hover:bg-card-2 focus-visible:ring-offset-0"
                  >
                    <Initials name={c.name} />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[15px]">{c.name}</b>
                      <span className="block truncate text-[13px] text-ink-muted">
                        {c.phone ? formatPhone(c.phone) : 'No number'} · {own.length}{' '}
                        {own.length === 1 ? 'visit' : 'visits'}
                        {own[0] && ` · last ${formatDate(visitDate(own[0]))}`}
                      </span>
                    </span>
                    <span className="text-[13px] font-semibold text-brand-text">Use</span>
                  </button>
                );
              })}
            </div>
          )}

          {picked && (
            <p className="flex items-center gap-2 text-[13px] text-success-text motion-safe:animate-drop-in">
              <Icon name="check" size={15} strokeWidth={3} />
              Returning customer · this visit is added to their history (no new record).
            </p>
          )}
        </div>

        {/* Visit Date and Time In are set by the system, so they are shown, not typed. */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Fact icon="calendar" label="Visit Date">
            Today · {formatDate(todayInGym(now))}
          </Fact>
          <Fact icon="clock" label="Time In" note="set when you confirm">
            {formatClock(now, { seconds: false })}
          </Fact>
        </div>

        <div>
          <Label id={ids.fee}>Walk-in Fee</Label>
          <OptionGroup
            labelId={ids.fee}
            value={feeType}
            onChange={setFeeType}
            options={Object.keys(DEMO_FEES).map((type) => ({
              value: type,
              label: FEE_TYPE_LABELS[type],
              detail: formatPeso(DEMO_FEES[type]),
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
              ...WALKIN_PAYMENT_METHODS.map((m) => ({
                value: m.code,
                label: methodName(m.code),
                icon: METHOD_ICONS[m.code] ?? 'wallet',
              })),
              { value: PAY_LATER, label: 'Pay later', icon: 'clock' },
            ]}
          />
          {payLater && (
            <p className="mt-2.5 flex items-start gap-2.5 rounded-btn border border-warning/40 bg-warning/10 px-3.5 py-3 text-sm text-ink-soft motion-safe:animate-drop-in">
              <Icon name="alert" size={18} className="mt-px flex-none text-warning-text" />
              <span>
                Saved as <b className="text-warning-text">Unpaid ({formatPeso(fee)})</b>. Record the
                payment before they leave.
              </span>
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}

/** Read-only value with an icon (Visit Date, Time In). */
function Fact({ icon, label, note, children }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-btn bg-card-2 px-3.5 py-3">
      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-card text-ink-muted">
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] text-ink-muted">
          {label}
          {note && <span className="text-ink-dim"> · {note}</span>}
        </span>
        <b className="block truncate text-[15px]">{children}</b>
      </span>
    </div>
  );
}

/** Round badge with someone's initials, e.g. "EB" for Ella Bautista. */
function Initials({ name }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return (
    <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand/15 text-[13px] font-bold text-brand-text">
      {letters}
    </span>
  );
}
