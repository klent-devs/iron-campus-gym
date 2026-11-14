import {
  MEMBERSHIP_STATUS,
  computeEndDate,
  formatDate,
  formatPeso,
  renewalStartDate,
} from '@icg/shared';
import {
  actions,
  memberMatches,
  memberView,
  membersView,
  paymentInfo,
  periodText,
} from '@icg/demo-data';
import { useEffect, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  ChoiceCards,
  Icon,
  PageHeader,
  SummaryRow,
  TextField,
  usePrint,
} from '../../components/ui/index.js';
import { runAction, useDemoData } from '../../lib/demo.js';
import { shake } from '../../lib/motion.js';
import { useToday } from '../../lib/useToday.js';
import { planDetail } from '../members/AddMemberPage.jsx';
import { daysText, errorFields } from '../members/helpers.js';
import {
  PaymentFields,
  emptyPayment,
  paymentInput,
  useEnabledMethods,
} from '../payments/components/PaymentFields.jsx';
import { RECEIPT_PAGE, ReceiptPrint } from '../payments/Receipt.jsx';

const STEPS = ['Find member', 'Choose plan', 'Confirm period', 'Record payment', 'Save renewal'];

/**
 * Renew Membership, 5 steps (docs/design/Renewal.dc.html). The member keeps the same Member ID and
 * QR code; the new period starts the day after the current one ends (or today if expired).
 * `?member=<id>` (from a member's Renew button) skips the search.
 */
export function RenewalPage() {
  const data = useDemoData();
  const today = useToday();
  const [params] = useSearchParams();
  const ids = { q: useId(), plan: useId(), start: useId(), end: useId() };
  const methods = useEnabledMethods();
  const preset = memberView(data, params.get('member'), today);
  const [memberId, setMemberId] = useState(preset?.id ?? null);
  const [step, setStep] = useState(preset ? 2 : 1);
  const [query, setQuery] = useState('');
  const [planId, setPlanId] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [payment, setPayment] = useState(() => emptyPayment(methods[0]?.code));
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);
  const [printArea, print] = usePrint();

  useEffect(() => {
    document.title = 'Renew Membership · IRON CAMPUS GYM';
  }, []);

  const member = memberId ? memberView(data, memberId, today) : null;
  const plans = data.plans.filter((p) => p.isActive);
  const plan =
    plans.find((p) => p.id === planId) ?? plans.find((p) => p.id === member?.planId) ?? plans[0];
  const earliest = member ? renewalStartDate(member.endDate, today) : today;
  const start = startDate && startDate >= earliest ? startDate : earliest;
  const end = plan ? computeEndDate(start, plan) : null;
  const method = methods.find((m) => m.code === payment.method);
  const matches =
    query.trim().length >= 2
      ? membersView(data, today)
          .filter((m) => memberMatches(m, query))
          .slice(0, 6)
      : [];

  function pick(m) {
    setMemberId(m.id);
    setPlanId(null);
    setStartDate(null);
    setErrors({});
    if (m.status === MEMBERSHIP_STATUS.SUSPENDED) {
      setErrors({ member: `${m.name} is suspended. The Owner must lift the suspension first.` });
      return;
    }
    setStep(2);
  }

  function next() {
    setErrors({});
    if (step === 1 && !member) {
      setErrors({ member: 'Search for the member and pick them from the list.' });
      shake(document.getElementById(ids.q));
      return;
    }
    if (step < 5) {
      setStep(step + 1);
      return;
    }
    try {
      const result = runAction(actions.renewMember, {
        memberId: member.id,
        planId: plan.id,
        startDate: start,
        payment: paymentInput(payment, plan.price),
      });
      setDone(result);
      setStep(6);
    } catch (err) {
      const f = errorFields(err);
      setErrors(f);
      if (f.amountReceived || f.referenceNo || f.method) setStep(4);
      else if (f.startDate) setStep(3);
    }
  }

  function restart() {
    setDone(null);
    setMemberId(null);
    setQuery('');
    setPlanId(null);
    setStartDate(null);
    setPayment(emptyPayment(methods[0]?.code));
    setErrors({});
    setStep(1);
  }

  const receipt = done
    ? paymentInfo(data, data.payments.find((p) => p.id === done.payment.id) ?? done.payment)
    : null;

  return (
    <>
      {printArea}
      <PageHeader
        title="Renew Membership"
        subtitle="The member keeps the same Member ID and QR code. No new account is created."
        crumbs={[{ to: '/members', label: 'Members' }, { label: 'Renew Membership' }]}
      />

      <ol aria-label="Steps" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const cur = n === step;
          const past = n < step;
          return (
            <li
              key={label}
              aria-current={cur ? 'step' : undefined}
              className={`flex items-center gap-2.5 rounded-btn border px-3.5 py-3 text-sm font-semibold ${
                cur
                  ? 'border-brand bg-brand/[0.08] text-ink'
                  : `border-line bg-card ${past ? 'text-ink-soft' : 'text-ink-muted'}`
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-full font-heading text-[13px] font-bold ${
                  cur
                    ? 'bg-brand text-ink'
                    : past
                      ? 'bg-success text-ink'
                      : 'bg-card-2 text-ink-muted'
                }`}
              >
                {past ? '✓' : n}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-start gap-4">
        <section
          className="min-w-0 flex-[2_1_560px] rounded-card border border-line bg-card p-6 motion-safe:animate-rise"
          key={step}
        >
          {step === 1 && (
            <>
              <h2 className="text-[20px] font-semibold">1. Search for the member</h2>
              <div className="mt-4">
                <TextField
                  id={ids.q}
                  label="Name, Member ID or mobile number"
                  value={query}
                  autoFocus
                  autoComplete="off"
                  onChange={(e) => setQuery(e.target.value)}
                  error={errors.member}
                />
              </div>
              {matches.length > 0 && (
                <ul className="mt-3 overflow-hidden rounded-btn border border-line">
                  {matches.map((m, i) => (
                    <li key={m.id} className={i ? 'border-t border-line' : ''}>
                      <button
                        type="button"
                        onClick={() => pick(m)}
                        className={`flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-brand/[0.08] ${
                          m.id === memberId ? 'bg-brand/[0.08]' : ''
                        }`}
                      >
                        <Avatar name={m.name} size="md" />
                        <span className="min-w-0 flex-1">
                          <b className="block text-[15px]">{m.name}</b>
                          <span className="text-[13px] text-ink-muted">
                            {m.code} · {m.plan} · {m.daysLeft < 0 ? 'expired' : 'expires'}{' '}
                            {formatDate(m.endDate)}
                          </span>
                        </span>
                        <span
                          className={`text-[13px] font-semibold ${
                            m.status === MEMBERSHIP_STATUS.EXPIRING_SOON
                              ? 'text-warning-text'
                              : m.status === MEMBERSHIP_STATUS.EXPIRED
                                ? 'text-danger-text'
                                : 'text-ink-muted'
                          }`}
                        >
                          {m.status === MEMBERSHIP_STATUS.SUSPENDED
                            ? 'Suspended'
                            : daysText(m.daysLeft)}
                          {m.daysLeft >= 0 && m.status !== MEMBERSHIP_STATUS.SUSPENDED
                            ? ' left'
                            : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {query.trim().length >= 2 && matches.length === 0 && (
                <p className="mt-3 text-sm text-ink-muted">
                  No member matches “{query}”. New here?{' '}
                  <Link className="font-semibold text-brand-text" to="/members/new">
                    Add them as a new member
                  </Link>
                  .
                </p>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-[20px] font-semibold">2. Select the membership plan</h2>
              <div className="mt-4">
                <ChoiceCards
                  labelId={ids.plan}
                  columns={2}
                  value={plan?.id}
                  onChange={setPlanId}
                  options={plans.map((p) => ({
                    value: p.id,
                    label: p.name,
                    detail: planDetail(p),
                  }))}
                />
              </div>
            </>
          )}

          {step === 3 && member && (
            <>
              <h2 className="text-[20px] font-semibold">3. Confirm the renewal period</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  id={ids.start}
                  label="New start date"
                  type="date"
                  min={earliest}
                  value={start}
                  onChange={(e) => setStartDate(e.target.value)}
                  error={errors.startDate}
                />
                <TextField
                  id={ids.end}
                  label="New expiration date (automatic)"
                  readOnly
                  value={end ? formatDate(end) : '—'}
                />
              </div>
              <p className="mt-3.5 rounded-btn bg-card-2 p-3.5 text-sm text-ink-soft">
                {member.endDate && member.daysLeft >= 0
                  ? `Starts the day after the current plan ends (${formatDate(member.endDate)}), so ${member.name.split(' ')[0]} doesn’t lose the remaining ${daysText(member.daysLeft + 1)}.`
                  : `The membership has expired, so the new period starts today (or a later date you pick).`}
              </p>
            </>
          )}

          {step === 4 && plan && (
            <>
              <h2 className="mb-4 text-[20px] font-semibold">4. Record payment</h2>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  id="amount-due"
                  label="Amount due"
                  readOnly
                  value={formatPeso(plan.price)}
                />
              </div>
              <PaymentFields
                value={payment}
                onChange={setPayment}
                amount={plan.price}
                errors={errors}
              />
              {errors.method && (
                <p className="mt-2 text-[13px] text-danger-text">{errors.method}</p>
              )}
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="text-[20px] font-semibold">5. Save renewal</h2>
              <p className="mt-2 text-ink-muted">Check the details on the right, then save.</p>
              {errors._ && <p className="mt-3 text-sm text-danger-text">{errors._}</p>}
            </>
          )}

          {step === 6 && done && (
            <div className="py-5 text-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success text-ink">
                <Icon name="check" size={32} strokeWidth={3} />
              </span>
              <h2 className="mt-3.5 text-[24px] font-bold">
                {done.subscription ? 'Membership renewed' : 'Renewal saved, waiting for the Owner'}
              </h2>
              <p className="mb-5 mt-1.5 text-ink-muted">
                {done.subscription
                  ? `${member.name} is active until ${formatDate(done.subscription.endDate)}.`
                  : `The bank transfer must be confirmed by the Owner before the new period starts.`}{' '}
                Receipt {done.payment.txnNo} saved.
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                <Button
                  icon="printer"
                  disabled={receipt?.status !== 'paid'}
                  onClick={() =>
                    print(<ReceiptPrint payment={receipt} paper="80mm" />, RECEIPT_PAGE['80mm'])
                  }
                >
                  Print Receipt
                </Button>
                <Button to={`/members/${member.id}`}>View Profile</Button>
                <Button variant="primary" onClick={restart}>
                  Renew Another
                </Button>
              </div>
            </div>
          )}

          {step < 6 && (
            <div className="mt-6 flex justify-between gap-2.5 border-t border-line pt-5">
              <Button
                className="h-12 min-w-[120px]"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
              >
                Back
              </Button>
              <Button
                variant="primary"
                className="h-12 min-w-[140px]"
                onClick={next}
                disabled={step > 1 && !member}
              >
                {step === 5 ? 'Save Renewal' : 'Next'}
              </Button>
            </div>
          )}
        </section>

        <aside className="w-full rounded-card border border-line bg-card p-6 lg:w-auto lg:flex-[1_1_320px]">
          <h2 className="text-[18px] font-semibold">Renewal summary</h2>
          {member ? (
            <>
              <div className="mb-1.5 mt-4 flex items-center gap-3">
                <Avatar name={member.name} size="lg" />
                <div className="min-w-0">
                  <b>{member.name}</b>
                  <div className="font-mono text-[13px] text-ink-muted">
                    {member.code} · same QR
                  </div>
                </div>
              </div>
              <SummaryRow label={member.daysLeft < 0 ? 'Plan ended' : 'Current plan ends'}>
                {formatDate(member.endDate)}
              </SummaryRow>
              <SummaryRow label="New plan">{plan?.name ?? '—'}</SummaryRow>
              <SummaryRow label="New period">{end ? periodText(start, end) : '—'}</SummaryRow>
              <SummaryRow label="Payment">{method?.name ?? '—'}</SummaryRow>
              <div className="flex items-baseline justify-between border-t border-line py-2.5">
                <span className="text-ink-soft">Total</span>
                <b className="font-heading text-[24px] text-brand-text">
                  {formatPeso(plan?.price ?? 0)}
                </b>
              </div>
              {step > 1 && step < 6 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="mt-1 h-11 text-sm font-semibold text-brand-text hover:text-ink"
                >
                  Change member
                </button>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              Pick a member to see the new dates and the total.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
