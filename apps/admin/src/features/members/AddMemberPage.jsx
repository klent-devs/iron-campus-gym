import { computeEndDate, formatDate, formatPeso } from '@icg/shared';
import { actions, indexes, paymentInfo, periodText, walkinMatch } from '@icg/demo-data';
import { useEffect, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  ChoiceCards,
  Icon,
  Label,
  PageHeader,
  QrCode,
  SummaryRow,
  TextField,
  usePrint,
} from '../../components/ui/index.js';
import { shake } from '../../lib/motion.js';
import { runAction, useDemoData, useStaff } from '../../lib/demo.js';
import { useToday } from '../../lib/useToday.js';
import {
  PaymentFields,
  emptyPayment,
  paymentInput,
  useEnabledMethods,
} from '../payments/components/PaymentFields.jsx';
import { RECEIPT_PAGE, ReceiptPrint } from '../payments/Receipt.jsx';
import { QR_CARD_PAGE, QrCardPrint } from './components/QrCard.jsx';
import { errorFields, formatPhone } from './helpers.js';

/** Plan cards: "₱1,200 · 1 month". */
export function planDetail(plan) {
  const length = plan.durationMonths
    ? `${plan.durationMonths} ${plan.durationMonths === 1 ? 'month' : 'months'}`
    : `${plan.durationDays} days`;
  return `${formatPeso(plan.price)} · ${length}`;
}

/** Field names from the sample data → the boxes on this form. */
const FIELD_OF = {
  'payment.paymentMethodCode': 'method',
  'payment.amountReceived': 'amountReceived',
  'payment.referenceNo': 'referenceNo',
};

/**
 * Add New Member (docs/design/AddMember.dc.html): personal details, plan and payment, with a
 * summary on the right. A walk-in customer with the same number is linked, not duplicated
 * (`?walkin=<customer id>` from Walk-in Records → Make Member fills the form in).
 */
export function AddMemberPage() {
  const data = useDemoData();
  const staff = useStaff();
  const today = useToday();
  const [params] = useSearchParams();
  const ids = {
    name: useId(),
    phone: useId(),
    email: useId(),
    address: useId(),
    plan: useId(),
    start: useId(),
  };
  const fromWalkin = indexes(data).customer.get(params.get('walkin')) ?? null;
  const plans = data.plans.filter((p) => p.isActive);
  const methods = useEnabledMethods();

  const [form, setForm] = useState(() => ({
    fullName: fromWalkin?.name ?? '',
    contactNumber: fromWalkin?.phone ? formatPhone(fromWalkin.phone) : '',
    email: '',
    address: '',
    planId: plans[0]?.id ?? '',
    startDate: today,
  }));
  const [payment, setPayment] = useState(() => emptyPayment(methods[0]?.code));
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);
  const [printArea, print] = usePrint();

  useEffect(() => {
    document.title = 'Add New Member · IRON CAMPUS GYM';
  }, []);

  const plan = plans.find((p) => p.id === form.planId) ?? plans[0];
  const endDate = plan && form.startDate ? computeEndDate(form.startDate, plan) : null;
  const digits = form.contactNumber.replace(/\D/g, '');
  const linked = useMemo(
    () =>
      fromWalkin && !fromWalkin.memberId
        ? fromWalkin
        : walkinMatch(data, digits.length === 11 ? digits : null),
    [data, digits, fromWalkin],
  );
  const linkedVisits = linked ? data.visits.filter((v) => v.customerId === linked.id).length : 0;
  const method = methods.find((m) => m.code === payment.method);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: undefined }));
  };

  function submit(e) {
    e.preventDefault();
    try {
      const result = runAction(actions.addMember, {
        ...form,
        walkinCustomerId: linked?.id ?? null,
        payment: paymentInput(payment, plan.price),
      });
      setDone(result);
      window.scrollTo({ top: 0 });
    } catch (err) {
      const raw = errorFields(err);
      const next = {};
      for (const [k, v] of Object.entries(raw)) next[FIELD_OF[k] ?? k] = v;
      setErrors(next);
      const firstId = {
        fullName: ids.name,
        contactNumber: ids.phone,
        email: ids.email,
        startDate: ids.start,
      }[Object.keys(next)[0]];
      if (firstId) {
        const el = document.getElementById(firstId);
        el?.focus();
        shake(el);
      }
    }
  }

  function again() {
    setDone(null);
    setErrors({});
    setForm((f) => ({
      ...f,
      fullName: '',
      contactNumber: '',
      email: '',
      address: '',
      startDate: today,
    }));
    setPayment(emptyPayment(methods[0]?.code));
  }

  if (done) {
    const member = done.member;
    const receipt = paymentInfo(data, done.payment);
    const period = done.subscription ?? done.payment.pendingRenewal;
    return (
      <>
        {printArea}
        <PageHeader
          title="Add New Member"
          crumbs={[{ to: '/members', label: 'Members' }, { label: 'Add New Member' }]}
        />
        <section className="mx-auto w-full max-w-[760px] rounded-card border border-line bg-card p-6 text-center motion-safe:animate-rise sm:p-9">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success text-ink">
            <Icon name="check" size={32} strokeWidth={3} />
          </span>
          <h2 className="mt-4 text-[26px] font-bold">Member registered!</h2>
          <p className="mt-1.5 text-ink-muted">
            {done.subscription
              ? `${member.name} can now check in.`
              : `${member.name} can check in once the Owner confirms the bank transfer.`}{' '}
            Payment of {formatPeso(done.payment.amount)} saved as {done.payment.txnNo}.
            {done.linkedCustomer && ' Their walk-in history is linked.'}
          </p>
          <div className="my-6 flex flex-wrap items-center justify-center gap-6 rounded-[14px] bg-card-2 p-5">
            <div className="rounded-btn bg-white p-2.5">
              <QrCode token={member.qrToken} size={150} title={`QR code for ${member.name}`} />
            </div>
            <div className="text-left">
              <div className="text-[13px] text-ink-muted">Member ID</div>
              <div className="font-mono text-[24px] font-bold">{member.code}</div>
              <div className="mt-2 text-sm text-ink-soft">
                {period.planName} · valid until {formatDate(period.endDate)}
              </div>
              <div className="mt-1.5 text-[13px] text-ink-muted">
                Member app login: <b className="text-ink">{member.code}</b> · password{' '}
                <b className="font-mono text-ink">{done.portalPassword}</b>
              </div>
              <div className="text-[12px] text-ink-dim">
                (SMS is not connected yet: give the member this password.)
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button
              icon="printer"
              onClick={() =>
                print(<QrCardPrint member={member} gymName={data.settings.gymName} />, QR_CARD_PAGE)
              }
            >
              Print QR Card
            </Button>
            <Button
              icon="receipt"
              disabled={done.payment.status !== 'paid'}
              onClick={() =>
                print(<ReceiptPrint payment={receipt} paper="80mm" />, RECEIPT_PAGE['80mm'])
              }
            >
              Print Receipt
            </Button>
            <Button to={`/members/${member.id}`} variant="primary">
              View Profile
            </Button>
          </div>
          <button
            type="button"
            onClick={again}
            className="mt-3.5 h-11 text-[15px] font-semibold text-brand-text hover:text-ink"
          >
            Add another member
          </button>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Add New Member"
        subtitle="Fill in 3 short steps. Member ID and QR code are created automatically."
        crumbs={[{ to: '/members', label: 'Members' }, { label: 'Add New Member' }]}
      />
      <form
        noValidate
        onSubmit={submit}
        className="flex flex-wrap items-start gap-4 motion-safe:animate-rise"
      >
        <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-4">
          <Section n={1} title="Personal Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id={ids.name}
                label="Full Name"
                value={form.fullName}
                onChange={set('fullName')}
                error={errors.fullName}
                autoComplete="off"
              />
              <TextField
                id={ids.phone}
                label="Contact Number"
                inputMode="tel"
                placeholder="0917 123 4567"
                value={form.contactNumber}
                onChange={set('contactNumber')}
                error={errors.contactNumber}
              />
              <TextField
                id={ids.email}
                label="Email Address"
                hint="(optional)"
                type="email"
                value={form.email}
                onChange={set('email')}
                error={errors.email}
              />
              <TextField
                id={ids.address}
                label="Address"
                hint="(optional)"
                placeholder="Barangay, City"
                value={form.address}
                onChange={set('address')}
                error={errors.address}
              />
            </div>
            {linked && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-btn border border-warning/35 bg-warning/[0.08] p-3.5">
                <Icon name="walk" className="text-warning-text" />
                <span className="min-w-0 flex-1 text-sm">
                  <b>{linked.name}</b> is already a walk-in customer ({linkedVisits}{' '}
                  {linkedVisits === 1 ? 'visit' : 'visits'}
                  {linked.phone ? ', same number' : ''}). We’ll convert that record — no duplicate
                  is created.
                </span>
                <span className="text-[13px] font-semibold text-warning-text">Linked ✓</span>
              </div>
            )}
          </Section>

          <Section n={2} title="Membership Plan">
            <Label id={ids.plan}>Plan</Label>
            <ChoiceCards
              labelId={ids.plan}
              value={plan?.id}
              onChange={(planId) => setForm((f) => ({ ...f, planId }))}
              options={plans.map((p) => ({ value: p.id, label: p.name, detail: planDetail(p) }))}
            />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id={ids.start}
                label="Membership Start Date"
                type="date"
                min={today}
                value={form.startDate}
                onChange={set('startDate')}
                error={errors.startDate}
              />
              <TextField
                id={`${ids.start}-end`}
                label="Expiration Date"
                hint="(automatic)"
                readOnly
                value={endDate ? formatDate(endDate) : '—'}
              />
            </div>
          </Section>

          <Section n={3} title="Payment Information">
            {plan && (
              <PaymentFields
                value={payment}
                onChange={setPayment}
                amount={plan.price}
                errors={errors}
              />
            )}
            {errors.method && <p className="mt-2 text-[13px] text-danger-text">{errors.method}</p>}
          </Section>
        </div>

        <aside className="w-full rounded-card border border-line bg-card p-[22px] lg:sticky lg:top-[120px] lg:w-auto lg:flex-[1_1_300px]">
          <h2 className="text-[18px] font-semibold">Summary</h2>
          <div className="mt-3">
            <SummaryRow label="Member" className="border-t-0">
              {form.fullName.trim() || '—'}
            </SummaryRow>
            <SummaryRow label="Plan">{plan?.name ?? '—'}</SummaryRow>
            <SummaryRow label="Valid">
              {endDate ? periodText(form.startDate, endDate) : '—'}
            </SummaryRow>
            <SummaryRow label="Payment">{method?.name ?? '—'}</SummaryRow>
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3.5">
              <b>Total</b>
              <b className="font-heading text-[24px] text-brand-text">
                {formatPeso(plan?.price ?? 0)}
              </b>
            </div>
          </div>
          {errors._ && (
            <p role="alert" className="mt-3 text-sm text-danger-text">
              {errors._}
            </p>
          )}
          {Object.keys(errors).some((k) => errors[k]) && !errors._ && (
            <p role="alert" className="mt-3 text-sm text-danger-text">
              Check the boxes marked in red.
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            className="mt-4 h-[54px] w-full text-[16px]"
            disabled={!plan}
          >
            Register Member
          </Button>
          <Button to="/members" className="mt-2.5 w-full">
            Cancel
          </Button>
          <p className="mt-3 text-[13px] text-ink-muted">
            An official receipt is recorded under your name ({staff?.name ?? 'staff'}).
          </p>
        </aside>
      </form>
    </>
  );
}

function Section({ n, title, children }) {
  return (
    <section className="rounded-card border border-line bg-card p-[22px]">
      <div className="mb-[18px] flex items-center gap-2.5">
        <b className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-card-2 font-heading text-[13px] text-brand-text">
          {n}
        </b>
        <h2 className="text-[18px] font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export { Section as FormSection };
