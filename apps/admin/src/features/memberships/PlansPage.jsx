import { MEMBERSHIP_STATUS, canEnter, formatDate, formatPeso, parsePeso } from '@icg/shared';
import { STATUS_TONE, actions, membersView } from '@icg/demo-data';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  EmptyState,
  FilterChips,
  PageHeader,
  Pagination,
  StatusBadge,
  TextField,
  Toast,
  useToast,
} from '../../components/ui/index.js';
import { isOwner, runAction, useDemoData, useStaff } from '../../lib/demo.js';
import { shake } from '../../lib/motion.js';
import { useToday } from '../../lib/useToday.js';
import { daysText, daysTone, errorFields } from '../members/helpers.js';

const DURATIONS = [1, 3, 6, 12];
const MONITOR_FILTERS = [
  { value: 'all', label: 'All' },
  { value: MEMBERSHIP_STATUS.ACTIVE, label: 'Active' },
  { value: MEMBERSHIP_STATUS.EXPIRING_SOON, label: 'Expiring Soon' },
  { value: MEMBERSHIP_STATUS.EXPIRED, label: 'Expired' },
];
const PAGE_SIZE = 25; // same as Members, Payments and Attendance Records
const emptyPlan = {
  id: null,
  name: '',
  durationMonths: '1',
  price: '',
  description: '',
  isActive: true,
};

/**
 * Membership Plans + Membership Monitoring (docs/design/Memberships.dc.html).
 * Only the Owner can add, edit or turn plans on/off; receptionists see the plans and the list.
 */
export function PlansPage() {
  const data = useDemoData();
  const staff = useStaff();
  const owner = isOwner(staff);
  const today = useToday();
  const formRef = useRef(null);
  const ids = { name: useId(), dur: useId(), price: useId(), desc: useId() };
  const [form, setForm] = useState(emptyPlan);
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [toast, showToast, hideToast] = useToast();

  useEffect(() => {
    document.title = 'Membership Plans · IRON CAMPUS GYM';
  }, []);

  const members = membersView(data, today);
  const onPlan = useMemo(() => {
    const counts = {};
    for (const m of members) if (canEnter(m.status)) counts[m.planId] = (counts[m.planId] ?? 0) + 1;
    return counts;
  }, [members]);
  // Counts on the filter buttons, like on the Members page.
  const monitorCounts = useMemo(() => {
    const c = { all: 0 };
    for (const m of members) {
      if (!m.endDate || m.status === MEMBERSHIP_STATUS.SUSPENDED) continue;
      c.all += 1;
      c[m.status] = (c[m.status] ?? 0) + 1;
    }
    return c;
  }, [members]);
  const monitored = useMemo(
    () =>
      members
        .filter((m) => m.endDate && m.status !== MEMBERSHIP_STATUS.SUSPENDED)
        .filter((m) => filter === 'all' || m.status === filter)
        .sort((a, b) => {
          // Most urgent first: expiring soon, then recently expired, then the rest.
          const rank = (m) =>
            m.status === MEMBERSHIP_STATUS.EXPIRING_SOON
              ? 0
              : m.status === MEMBERSHIP_STATUS.EXPIRED
                ? 1
                : 2;
          return (
            rank(a) - rank(b) || (rank(a) === 1 ? b.daysLeft - a.daysLeft : a.daysLeft - b.daysLeft)
          );
        }),
    [members, filter],
  );

  function edit(plan) {
    setForm({
      id: plan.id,
      name: plan.name,
      durationMonths: String(plan.durationMonths || 1),
      price: String(plan.price),
      description: plan.description ?? '',
      isActive: plan.isActive,
    });
    setErrors({});
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => document.getElementById(ids.name)?.focus(), 300);
  }

  function save(e) {
    e.preventDefault();
    const price = parsePeso(form.price);
    try {
      const { plan } = runAction(actions.savePlan, {
        id: form.id ?? undefined,
        name: form.name,
        durationMonths: Number(form.durationMonths),
        durationDays: 0,
        price: Number.isNaN(price) ? form.price : price,
        description: form.description,
        isActive: form.isActive,
      });
      showToast({
        title: form.id ? 'Plan saved' : 'Plan added',
        body: `${plan.name} · ${formatPeso(plan.price)}. Price changes apply to new sign-ups and renewals only.`,
      });
      setForm(emptyPlan);
      setErrors({});
    } catch (err) {
      const next = errorFields(err);
      if (next.durationMonths) next.durationMonths = 'Choose a duration';
      if (next.price) next.price = 'Enter the price, like 1200';
      setErrors(next);
      shake(formRef.current);
    }
  }

  function toggle(plan) {
    try {
      runAction(actions.setPlanActive, { planId: plan.id, isActive: !plan.isActive });
      showToast({
        tone: plan.isActive ? 'brand' : 'success',
        title: plan.isActive ? `${plan.name} turned off` : `${plan.name} turned on`,
        body: plan.isActive
          ? 'It can’t be picked for new sign-ups or renewals. Current members keep their dates.'
          : 'Staff can pick it for sign-ups and renewals again.',
      });
    } catch (err) {
      showToast({ tone: 'danger', title: 'Not saved', body: err.message });
    }
  }

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  return (
    <>
      <PageHeader
        title="Membership Plans"
        subtitle={
          owner
            ? 'Set the prices and lengths of plans, and see who needs to renew.'
            : 'Plans and prices for new members and renewals. Only the Owner can change them.'
        }
        crumbs={[{ to: '/members', label: 'Members' }, { label: 'Membership Plans' }]}
      />

      <div className="flex flex-wrap items-start gap-4">
        <div className="grid min-w-0 flex-[2_1_560px] grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
          {/* The Add Membership Plan form is always on the right, so there is no extra button for it. */}
          {data.plans.map((p) => (
            <article
              key={p.id}
              className={`flex flex-col rounded-card border bg-card p-5 transition-opacity motion-safe:animate-rise ${
                form.id === p.id ? 'border-brand' : 'border-line'
              } ${p.isActive ? '' : 'opacity-60'}`}
            >
              <div className="flex items-center justify-between">
                <StatusBadge tone={p.isActive ? 'ok' : 'mute'}>
                  {p.isActive ? 'Active' : 'Inactive'}
                </StatusBadge>
                <span className="text-[13px] text-ink-muted">
                  {(onPlan[p.id] ?? 0).toLocaleString('en-PH')} members
                </span>
              </div>
              <h3 className="mt-3.5 text-[19px] font-semibold">{p.name}</h3>
              <div className="mt-1 font-heading text-[26px] font-bold leading-tight">
                {formatPeso(p.price)}
              </div>
              <div className="text-sm font-medium text-ink-muted">
                for {p.durationMonths} {p.durationMonths === 1 ? 'month' : 'months'}
              </div>
              <p className="mb-4 mt-2 min-h-[42px] flex-1 text-sm leading-normal text-ink-muted">
                {p.description}
              </p>
              {owner && (
                <div className="flex gap-2">
                  <Button size="sm" icon="edit" className="flex-1" onClick={() => edit(p)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    icon={p.isActive ? 'ban' : 'check'}
                    className="flex-1"
                    onClick={() => toggle(p)}
                  >
                    {p.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>

        {owner && (
          <section
            ref={formRef}
            className="w-full rounded-card border border-line bg-card p-[22px] lg:w-auto lg:flex-[1_1_320px]"
          >
            <h2 className="text-[18px] font-semibold">
              {form.id ? `Edit ${form.name || 'Plan'}` : 'Add Membership Plan'}
            </h2>
            <form noValidate onSubmit={save} className="mt-4 flex flex-col gap-3.5">
              <TextField
                id={ids.name}
                label="Plan Name"
                placeholder="e.g. Semi-Annual"
                value={form.name}
                onChange={set('name')}
                error={errors.name}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id={ids.dur}
                  as="select"
                  label="Duration"
                  value={form.durationMonths}
                  onChange={set('durationMonths')}
                  error={errors.durationMonths}
                >
                  {DURATIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} {m === 1 ? 'month' : 'months'}
                    </option>
                  ))}
                </TextField>
                <TextField
                  id={ids.price}
                  label="Price (₱)"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.price}
                  onChange={set('price')}
                  error={errors.price}
                />
              </div>
              <TextField
                id={ids.desc}
                label="Description"
                placeholder="Short note shown to staff and members"
                value={form.description}
                onChange={set('description')}
                error={errors.description}
              />
              <label className="flex min-h-touch cursor-pointer items-center gap-2.5 text-[15px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-5 w-5 cursor-pointer accent-brand"
                />
                Active — available for new sign-ups
              </label>
              {errors._ && <p className="text-sm text-danger-text">{errors._}</p>}
              <Button type="submit" variant="primary" className="h-12">
                {form.id ? 'Save Changes' : 'Save Plan'}
              </Button>
              {form.id && <Button onClick={() => setForm(emptyPlan)}>Cancel Editing</Button>}
              <p className="text-[13px] text-ink-muted">
                Only the Owner can add or change plans. Price changes apply to new sign-ups and
                renewals only.
              </p>
            </form>
          </section>
        )}
      </div>

      <section className="overflow-hidden rounded-card border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 p-[18px]">
          <h2 className="text-[18px] font-semibold">Membership Monitoring</h2>
          <FilterChips
            label="Filter"
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setPage(1);
            }}
            options={MONITOR_FILTERS.map((f) => ({ ...f, count: monitorCounts[f.value] ?? 0 }))}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="bg-card-2 text-left text-[13px] text-ink-muted">
                {[
                  'Member Name',
                  'Membership Plan',
                  'Start Date',
                  'Expiration Date',
                  'Days Remaining',
                  'Status',
                  '',
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monitored.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-brand/10">
                  <td className="border-t border-line px-4 py-3 font-semibold">
                    <Link to={`/members/${m.id}`} className="hover:text-brand-text">
                      {m.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3">{m.plan}</td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3 text-ink-soft">
                    {formatDate(m.startDate)}
                  </td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3 text-ink-soft">
                    {formatDate(m.endDate)}
                  </td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3">
                    <b className={daysTone(m.status)}>{daysText(m.daysLeft)}</b>
                  </td>
                  <td className="border-t border-line px-4 py-3">
                    <StatusBadge tone={STATUS_TONE[m.status]}>{m.statusLabel}</StatusBadge>
                  </td>
                  <td className="border-t border-line px-4 py-3 text-right">
                    <Button size="sm" to={`/members/renew?member=${m.id}`}>
                      Renew
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {monitored.length === 0 && (
            <EmptyState compact icon="calendarCheck" title="No members here" tone="success" />
          )}
        </div>
        {monitored.length > 0 && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={monitored.length}
            onPage={setPage}
            noun="members"
          />
        )}
      </section>
      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}
