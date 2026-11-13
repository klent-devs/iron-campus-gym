import {
  MEMBERSHIP_STATUS,
  daysBetween,
  formatDate,
  formatDuration,
  formatPeso,
  formatTime,
} from '@icg/shared';
import {
  PAYMENT_TONE,
  STATUS_TONE,
  actions,
  dayOf,
  indexes,
  memberPeriods,
  memberView,
  paymentInfo,
} from '@icg/demo-data';
import { useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  EmptyState,
  Modal,
  PageHeader,
  Presence,
  QrCode,
  SampleDataBadge,
  StatusBadge,
  TextField,
  Toast,
  usePrint,
  useToast,
} from '../../components/ui/index.js';
import { isOwner, runAction, useDemoData, useStaff } from '../../lib/demo.js';
import { useToday } from '../../lib/useToday.js';
import { QR_CARD_PAGE, QrCardPrint } from './components/QrCard.jsx';
import { SUSPEND_REASONS, errorFields, formatPhone, planLine } from './helpers.js';

const TABS = [
  ['pay', 'Payment History'],
  ['att', 'Attendance History'],
  ['periods', 'Membership Periods'],
];

/** Member Profile (docs/design/MemberProfile.dc.html). */
export function MemberProfilePage() {
  const { memberId } = useParams();
  const data = useDemoData();
  const staff = useStaff();
  const today = useToday();
  const member = memberView(data, memberId, today);
  const [tab, setTab] = useState('pay');
  const [dialog, setDialog] = useState(null);
  const [toast, showToast, hideToast] = useToast();
  const [printArea, print] = usePrint();

  useEffect(() => {
    document.title = `${member?.name ?? 'Member'} · IRON CAMPUS GYM`;
  }, [member?.name]);

  if (!member) {
    return (
      <>
        <PageHeader
          title="Member not found"
          crumbs={[{ to: '/members', label: 'Members' }, { label: 'Not found' }]}
        />
        <EmptyState
          icon="users"
          title="We couldn’t find this member"
          message="The link may be old. Search for the member on the Members page."
          action={<Button to="/members">Go to Members</Button>}
        />
      </>
    );
  }

  const ix = indexes(data);
  const payments = (ix.paymentsByMember.get(member.id) ?? [])
    .map((p) => paymentInfo(data, p))
    .sort((a, b) => b.at.localeCompare(a.at));
  const visits = [...(ix.checkInsByMember.get(member.id) ?? [])].sort((a, b) =>
    b.timeIn.localeCompare(a.timeIn),
  );
  const periods = memberPeriods(data, member.id);
  const suspended = member.status === MEMBERSHIP_STATUS.SUSPENDED;
  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const fromWalkin = member.walkinCustomerId ? ix.customer.get(member.walkinCustomerId) : null;
  const printCard = () =>
    print(<QrCardPrint member={member} gymName={data.settings.gymName} />, QR_CARD_PAGE);

  const act = (action, input, message) => {
    try {
      const result = runAction(action, input);
      setDialog(null);
      if (message) showToast(typeof message === 'function' ? message(result) : message);
      return true;
    } catch (err) {
      showToast({ tone: 'danger', title: 'Not saved', body: err.message });
      return false;
    }
  };

  return (
    <>
      {printArea}
      <div className="flex flex-wrap items-center justify-between gap-3 pl-1.5 pt-3">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
          <Link to="/members" className="font-medium text-brand-text hover:text-ink">
            Members
          </Link>{' '}
          / {member.name}
        </nav>
        <SampleDataBadge />
      </div>

      <section className="flex flex-wrap items-center gap-5 rounded-card border border-line bg-card p-[22px] motion-safe:animate-rise">
        <Avatar name={member.name} size="xl" />
        <div className="min-w-0 flex-[1_1_260px]">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-bold">{member.name}</h1>
            <StatusBadge tone={STATUS_TONE[member.status]}>{member.statusLabel}</StatusBadge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-soft">
            <span>
              Member ID <b className="font-mono">{member.code}</b>
            </span>
            <span>{planLine(member)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button icon="edit" onClick={() => setDialog('edit')}>
            Edit Information
          </Button>
          <Button icon="qr" onClick={() => setDialog('qr')}>
            View QR Code
          </Button>
          {suspended ? (
            isOwner(staff) && (
              <Button variant="outline" icon="check" onClick={() => setDialog('lift')}>
                Lift Suspension
              </Button>
            )
          ) : (
            <Button variant="outline" icon="ban" onClick={() => setDialog('suspend')}>
              Suspend Membership
            </Button>
          )}
          <Button to={`/members/renew?member=${member.id}`} variant="primary" disabled={suspended}>
            Renew Membership
          </Button>
        </div>
      </section>

      {(suspended || pendingPayments.length > 0) && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-[14px] border border-warning/40 bg-warning/[0.08] px-4 py-3 text-[15px]"
        >
          <span className="min-w-0 flex-1">
            {suspended && (
              <>
                <b className="text-warning-text">
                  Suspended since {formatDate(member.suspendedOn)}
                </b>{' '}
                · {member.suspendReason}. Their QR code is rejected at check-in.{' '}
              </>
            )}
            {pendingPayments.length > 0 &&
              `${pendingPayments.length} payment${pendingPayments.length > 1 ? 's' : ''} waiting: ${pendingPayments
                .map((p) => `${p.txnNo} (${formatPeso(p.amount)})`)
                .join(', ')}.`}
          </span>
          {pendingPayments.length > 0 && (
            <Button size="sm" to={`/payments?txn=${pendingPayments[0].txnNo}`}>
              Open in Payments
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <CurrentMembership member={member} today={today} />
          <section className="flex items-center gap-[18px] rounded-card border border-line bg-card p-[22px]">
            <div className="flex-none rounded-btn bg-white p-2">
              <QrCode token={member.qrToken} size={112} title={`QR code for ${member.name}`} />
            </div>
            <div className="text-sm leading-relaxed text-ink-soft">
              <b className="block text-[15px] text-ink">Personal QR code</b>
              Same code since registration. It does not change when the member renews.
              <div className="mt-2.5">
                <Button size="sm" icon="printer" onClick={printCard}>
                  Print QR Card
                </Button>
              </div>
            </div>
          </section>
          <section className="rounded-card border border-line bg-card p-[22px]">
            <h2 className="text-[17px] font-semibold">Contact Information</h2>
            <dl className="mt-4 grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-[15px]">
              <dt className="text-ink-muted">Mobile</dt>
              <dd>{formatPhone(member.phone)}</dd>
              <dt className="text-ink-muted">Email</dt>
              <dd className="break-words">{member.email ?? '—'}</dd>
              <dt className="text-ink-muted">Address</dt>
              <dd>{member.address ?? '—'}</dd>
              <dt className="text-ink-muted">Member since</dt>
              <dd>{formatDate(member.memberSince)}</dd>
              {fromWalkin && (
                <>
                  <dt className="text-ink-muted">Walk-in</dt>
                  <dd>Was a walk-in customer before joining</dd>
                </>
              )}
            </dl>
          </section>
        </div>

        <section className="min-w-0 flex-[2_1_520px] overflow-hidden rounded-card border border-line bg-card">
          <div
            role="tablist"
            aria-label="History"
            className="scrollbar-none flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-3.5 pt-2.5"
          >
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`-mb-px h-12 whitespace-nowrap border-b-[3px] px-4 text-[15px] font-semibold transition-colors ${
                  tab === id
                    ? 'border-brand text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto p-4">
            {tab === 'pay' && <PaymentTable payments={payments} />}
            {tab === 'att' && <AttendanceTable visits={visits} today={today} />}
            {tab === 'periods' && <PeriodTable periods={periods} today={today} />}
          </div>
        </section>
      </div>

      <Presence show={dialog === 'suspend'}>
        <SuspendModal
          member={member}
          onClose={() => setDialog(null)}
          onSave={(reason) =>
            act(
              actions.suspendMember,
              { memberId: member.id, reason },
              {
                tone: 'brand',
                title: `${member.name} suspended`,
                body: 'Their QR code will be rejected at check-in until the suspension is lifted.',
              },
            )
          }
        />
      </Presence>
      <Presence show={dialog === 'lift'}>
        <Modal
          open
          onClose={() => setDialog(null)}
          title={`Lift suspension for ${member.name}?`}
          footer={
            <div className="flex justify-end gap-2.5 px-6 pb-6 pt-2">
              <Button onClick={() => setDialog(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() =>
                  act(actions.liftSuspension, { memberId: member.id }, (r) => ({
                    title: 'Suspension lifted',
                    body: r.addedDays
                      ? `${r.addedDays} paused days were added back to the membership.`
                      : `${member.name} can check in again.`,
                  }))
                }
              >
                Lift Suspension
              </Button>
            </div>
          }
        >
          <p className="px-6 pt-2 text-[15px] leading-relaxed text-ink-soft">
            Suspended on {formatDate(member.suspendedOn)} ({member.suspendReason}). The{' '}
            {member.suspendedOn ? Math.max(0, daysBetween(member.suspendedOn, today)) : 0} paused
            days are added back to the end of the membership. Make sure any balance is settled
            first.
          </p>
        </Modal>
      </Presence>
      <Presence show={dialog === 'edit'}>
        <EditMemberModal
          member={member}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            showToast({ title: 'Changes saved', body: `${member.name}’s details are updated.` });
          }}
        />
      </Presence>
      <Presence show={dialog === 'qr'}>
        <Modal
          open
          onClose={() => setDialog(null)}
          title="Member QR code"
          subtitle={`${member.name} · ${member.code}`}
          footer={
            <div className="flex flex-wrap justify-end gap-2.5 px-6 pb-6 pt-4">
              <Button
                variant="outline"
                onClick={() =>
                  act(
                    actions.replaceQr,
                    { memberId: member.id },
                    {
                      tone: 'brand',
                      title: 'New QR code made',
                      body: 'The old code no longer works. Print a new card for the member.',
                    },
                  )
                }
              >
                Replace Code (lost phone or card)
              </Button>
              <Button variant="primary" icon="printer" onClick={printCard}>
                Print QR Card
              </Button>
            </div>
          }
        >
          <div className="flex flex-col items-center gap-3 px-6 pt-5">
            <div className="rounded-[20px] bg-white p-4">
              <QrCode token={member.qrToken} size={240} title={`QR code for ${member.name}`} />
            </div>
            <p className="max-w-sm text-center text-[13px] text-ink-muted">
              The code holds a secure ID only: no name, phone number or payment details.
            </p>
          </div>
        </Modal>
      </Presence>
      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}

function CurrentMembership({ member, today }) {
  const start = member.current?.startDate ?? member.startDate;
  const end = member.current?.endDate ?? member.periodEnd;
  const total = start && end ? daysBetween(start, end) + 1 : 1;
  const used = start ? Math.min(total, Math.max(0, daysBetween(start, today) + 1)) : 0;
  const pct =
    member.daysLeft !== null && member.daysLeft >= 0
      ? Math.max(3, Math.round((used / total) * 100))
      : 100;
  return (
    <section className="rounded-card border border-line bg-card p-[22px]">
      <h2 className="text-[17px] font-semibold">Current Membership</h2>
      {member.endDate ? (
        <>
          <div className="mt-3.5 flex items-baseline gap-2">
            <b
              className={`font-heading text-[40px] ${member.daysLeft < 0 ? 'text-danger-text' : 'text-brand-text'}`}
            >
              {Math.abs(member.daysLeft)}
            </b>
            <span className="text-ink-soft">
              {member.daysLeft < 0 ? 'days since it expired' : 'days remaining'}
              {member.status === MEMBERSHIP_STATUS.SUSPENDED && ' (paused)'}
            </span>
          </div>
          <div className="mb-1.5 mt-2.5 h-2.5 rounded-full bg-line" aria-hidden="true">
            <div
              className={`h-2.5 rounded-full ${member.daysLeft < 0 ? 'bg-danger' : 'bg-brand'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[13px] text-ink-muted">
            <span>Start {formatDate(start)}</span>
            <span>Expires {formatDate(member.endDate)}</span>
          </div>
          {member.upcoming.length > 0 && (
            <p className="mt-3 rounded-btn bg-card-2 px-3 py-2 text-[13px] text-ink-soft">
              Already renewed:{' '}
              {member.upcoming
                .map((s) => `${s.planName} from ${formatDate(s.startDate)}`)
                .join(', ')}
              .
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">
          No paid membership yet. The first period starts when its payment is confirmed.
        </p>
      )}
    </section>
  );
}

const TH =
  'whitespace-nowrap bg-card-2 px-4 py-3 text-left text-[13px] font-semibold text-ink-muted';
const TD = 'whitespace-nowrap border-t border-line px-4 py-3';

function PaymentTable({ payments }) {
  if (!payments.length) return <EmptyState compact icon="wallet" title="No payments yet" />;
  return (
    <table className="w-full min-w-[640px] border-collapse text-sm">
      <thead>
        <tr>
          <th className={TH}>Transaction No.</th>
          <th className={TH}>Date</th>
          <th className={TH}>Description</th>
          <th className={TH}>Method</th>
          <th className={`${TH} text-right`}>Amount</th>
          <th className={TH}>Status</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr
            key={p.id}
            className={`transition-colors hover:bg-brand/10 ${p.status === 'voided' ? 'opacity-60' : ''}`}
          >
            <td className={`${TD} font-mono text-[13px]`}>
              <Link to={`/payments?txn=${p.txnNo}`} className="hover:text-brand-text">
                {p.txnNo}
              </Link>
            </td>
            <td className={TD}>{formatDate(dayOf(p.at))}</td>
            <td className={TD}>{p.description}</td>
            <td className={TD}>{p.methodLabel}</td>
            <td
              className={`${TD} text-right font-bold ${p.status === 'voided' ? 'text-ink-muted line-through' : ''}`}
            >
              {formatPeso(p.amount)}
            </td>
            <td className={TD}>
              <StatusBadge tone={PAYMENT_TONE[p.status]}>{p.statusLabel}</StatusBadge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const longDay = (d) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(new Date(`${d}T00:00:00Z`))
    .replace(/^(\w+) /, '$1, ');

function AttendanceTable({ visits, today }) {
  if (!visits.length) return <EmptyState compact icon="calendar" title="No visits yet" />;
  return (
    <table className="w-full min-w-[520px] border-collapse text-sm">
      <thead>
        <tr>
          <th className={TH}>Date</th>
          <th className={TH}>Time In</th>
          <th className={TH}>Time Out</th>
          <th className={TH}>Duration</th>
        </tr>
      </thead>
      <tbody>
        {visits.slice(0, 60).map((c) => {
          const day = dayOf(c.timeIn);
          const inside = !c.timeOut && day === today;
          return (
            <tr key={c.id} className="transition-colors hover:bg-brand/10">
              <td className={TD}>{longDay(day)}</td>
              <td className={`${TD} text-success-text`}>↘ {formatTime(c.timeIn)}</td>
              <td className={TD}>
                {c.timeOut ? (
                  <span className="text-danger-text">↗ {formatTime(c.timeOut)}</span>
                ) : inside ? (
                  <b className="text-brand-text">Inside now</b>
                ) : (
                  <span className="text-warning-text">No time out</span>
                )}
                {c.fix && <span className="ml-2 text-[12px] text-ink-muted">(fixed)</span>}
              </td>
              <td className={TD}>{c.timeOut ? formatDuration(c.timeIn, c.timeOut) : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PeriodTable({ periods, today }) {
  if (!periods.length) return <EmptyState compact icon="card" title="No membership periods yet" />;
  return (
    <table className="w-full min-w-[520px] border-collapse text-sm">
      <thead>
        <tr>
          <th className={TH}>Plan</th>
          <th className={TH}>Start</th>
          <th className={TH}>End</th>
          <th className={`${TH} text-right`}>Price</th>
          <th className={TH}>Status</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((s) => {
          const state =
            s.status === 'cancelled'
              ? ['Cancelled', 'bad']
              : s.startDate > today
                ? ['Next', 'low']
                : s.endDate < today
                  ? ['Ended', 'mute']
                  : ['Current', 'ok'];
          return (
            <tr key={s.id} className={s.status === 'cancelled' ? 'opacity-60' : ''}>
              <td className={TD}>{s.planName}</td>
              <td className={TD}>{formatDate(s.startDate)}</td>
              <td className={TD}>{formatDate(s.endDate)}</td>
              <td className={`${TD} text-right`}>{formatPeso(s.price)}</td>
              <td className={TD}>
                <StatusBadge tone={state[1]}>{state[0]}</StatusBadge>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SuspendModal({ member, onClose, onSave }) {
  const id = useId();
  const [reason, setReason] = useState(SUSPEND_REASONS[0]);
  return (
    <Modal
      open
      onClose={onClose}
      title={`Suspend ${member.name}?`}
      footer={
        <div className="flex justify-end gap-2.5 px-6 pb-6 pt-5">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => onSave(reason)}>
            Suspend Membership
          </Button>
        </div>
      }
    >
      <div className="px-6 pt-2">
        <p className="mb-3.5 text-[15px] leading-relaxed text-ink-soft">
          Their QR code will be rejected at check-in until the Owner lifts the suspension. Days
          remaining are paused.
        </p>
        <TextField
          id={id}
          as="select"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {SUSPEND_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </TextField>
      </div>
    </Modal>
  );
}

function EditMemberModal({ member, onClose, onSaved }) {
  const ids = { name: useId(), phone: useId(), email: useId(), address: useId() };
  const [form, setForm] = useState({
    fullName: member.name,
    contactNumber: formatPhone(member.phone),
    email: member.email ?? '',
    address: member.address ?? '',
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  function save(e) {
    e.preventDefault();
    try {
      runAction(actions.updateMember, { memberId: member.id, ...form });
      onSaved();
    } catch (err) {
      setErrors(errorFields(err));
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Information"
      subtitle={`${member.code} · the Member ID and QR code stay the same.`}
      size="lg"
      footer={
        <div className="flex justify-end gap-2.5 px-6 pb-6 pt-5">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="edit-member">
            Save Changes
          </Button>
        </div>
      }
    >
      <form
        id="edit-member"
        noValidate
        onSubmit={save}
        className="grid grid-cols-1 gap-4 px-6 pt-4 sm:grid-cols-2"
      >
        <TextField
          id={ids.name}
          label="Full Name"
          value={form.fullName}
          onChange={set('fullName')}
          error={errors.fullName}
        />
        <TextField
          id={ids.phone}
          label="Contact Number"
          inputMode="tel"
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
          value={form.address}
          onChange={set('address')}
          error={errors.address}
        />
        {errors._ && <p className="text-sm text-danger-text sm:col-span-2">{errors._}</p>}
      </form>
    </Modal>
  );
}
