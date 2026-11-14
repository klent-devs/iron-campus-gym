import { ROLES, addDays, formatDate, formatTime, todayInGym } from '@icg/shared';
import { actions, auditView, dayOf } from '@icg/demo-data';
import { useEffect, useId, useState } from 'react';
import {
  Avatar,
  Button,
  Modal,
  PageHeader,
  Presence,
  StatusBadge,
  TextField,
  Toast,
  useToast,
} from '../../components/ui/index.js';
import { runAction, useDemoData, useStaff } from '../../lib/demo.js';
import { errorFields } from '../members/helpers.js';

const OWNER_CAN = [
  'Manage staff accounts',
  'Manage membership plans and prices',
  'View all payments and reports',
  'Void or refund payments',
  'Manage inventory and stock counts',
  'Change system settings',
];
const DESK_CAN = [
  'Register members and renew memberships',
  'Check members in and out',
  'Register walk-in customers',
  'Record payments and print receipts',
  'View member records',
];
const DESK_CANNOT = [
  'Change prices, plans or settings',
  'Void or refund payments',
  'See monthly revenue and reports',
];
const DOT = {
  registration: 'bg-success',
  attendance: 'bg-warning',
  void: 'bg-danger',
  refund: 'bg-danger',
  price: 'bg-brand',
  suspend: 'bg-warning',
};

/** "Now", "Today, 5:52 AM", "Yesterday, 2:01 PM", "14 Sep 2026". */
export function whenText(iso, now = new Date()) {
  if (!iso) return 'Never';
  if (now - new Date(iso) < 5 * 60_000) return 'Now';
  const today = todayInGym(now);
  const day = dayOf(iso);
  if (day === today) return `Today, ${formatTime(iso)}`;
  if (day === addDays(today, -1)) return `Yesterday, ${formatTime(iso)}`;
  if (day.slice(0, 4) === today.slice(0, 4))
    return `${formatDate(day).slice(0, 6)}, ${formatTime(iso)}`;
  return formatDate(day);
}

/** Staff Accounts (docs/design/Staff.dc.html). Owner only. */
export function StaffAccountsPage() {
  const data = useDemoData();
  const me = useStaff();
  const [dialog, setDialog] = useState(null);
  const [toast, showToast, hideToast] = useToast();

  useEffect(() => {
    document.title = 'Staff Accounts · IRON CAMPUS GYM';
  }, []);

  const act = (action, input, message) => {
    try {
      const result = runAction(action, input);
      if (message) showToast(typeof message === 'function' ? message(result) : message);
      return result;
    } catch (err) {
      showToast({ tone: 'danger', title: 'Not saved', body: err.message });
      return null;
    }
  };

  return (
    <>
      <PageHeader
        title="Staff Accounts"
        subtitle="Who can sign in to the admin website, and what each role can do."
        crumbs={[{ to: '/settings', label: 'Settings' }, { label: 'Staff Accounts' }]}
        actions={
          <Button variant="plainPrimary" onClick={() => setDialog({ kind: 'edit', staff: null })}>
            + Add Staff
          </Button>
        }
      />
      <section className="overflow-hidden rounded-card border border-line bg-card motion-safe:animate-rise">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="bg-card-2 text-left text-[13px] text-ink-muted">
                {['Name', 'Username', 'Role', 'Status', 'Last Login'].map((h) => (
                  <th key={h} className="px-4 py-3.5 font-semibold">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map((s) => {
                const isMe = s.id === me?.id;
                return (
                  <tr key={s.id} className="transition-colors hover:bg-brand/10">
                    <td className="border-t border-line px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} />
                        <b className="font-semibold">
                          {s.name}
                          {isMe && (
                            <span className="ml-1.5 text-[12px] font-normal text-ink-muted">
                              (you)
                            </span>
                          )}
                        </b>
                      </div>
                    </td>
                    <td className="border-t border-line px-4 py-3 font-mono text-[13px] text-ink-soft">
                      {s.username}
                    </td>
                    <td className="border-t border-line px-4 py-3">
                      <StatusBadge tone={s.role === ROLES.OWNER ? 'low' : 'mute'}>
                        {s.role === ROLES.OWNER ? 'Owner' : 'Receptionist'}
                      </StatusBadge>
                    </td>
                    <td className="border-t border-line px-4 py-3">
                      <StatusBadge tone={s.status === 'active' ? 'ok' : 'mute'}>
                        {s.status === 'active' ? 'Active' : 'Disabled'}
                      </StatusBadge>
                    </td>
                    <td className="whitespace-nowrap border-t border-line px-4 py-3 text-ink-soft">
                      {whenText(s.lastLoginAt)}
                    </td>
                    <td className="whitespace-nowrap border-t border-line px-4 py-3 text-right">
                      <span className="inline-flex gap-1.5">
                        <Button size="sm" onClick={() => setDialog({ kind: 'edit', staff: s })}>
                          Edit
                        </Button>
                        {isMe ? (
                          <Button size="sm" to="/settings#pw">
                            Change Password
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                const r = act(actions.resetStaffPassword, { staffId: s.id });
                                if (r)
                                  setDialog({ kind: 'password', staff: s, password: r.password });
                              }}
                            >
                              Reset Password
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                act(
                                  actions.setStaffStatus,
                                  {
                                    staffId: s.id,
                                    status: s.status === 'active' ? 'disabled' : 'active',
                                  },
                                  {
                                    tone: s.status === 'active' ? 'brand' : 'success',
                                    title: `${s.username} ${s.status === 'active' ? 'disabled' : 'enabled'}`,
                                    body:
                                      s.status === 'active'
                                        ? 'They can’t sign in until the account is turned back on.'
                                        : 'They can sign in again.',
                                  },
                                )
                              }
                            >
                              {s.status === 'active' ? 'Disable' : 'Enable'}
                            </Button>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <section className="flex-[1_1_300px] rounded-card border border-line bg-card p-[22px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">Owner</h2>
            <StatusBadge tone="low">Full access</StatusBadge>
          </div>
          <ul className="mt-3">
            {OWNER_CAN.map((a) => (
              <li key={a} className="flex gap-2.5 py-2 text-[15px]">
                <span className="font-bold text-success-text">✓</span>
                {a}
              </li>
            ))}
          </ul>
        </section>
        <section className="flex-[1_1_300px] rounded-card border border-line bg-card p-[22px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">Receptionist</h2>
            <StatusBadge>Front desk</StatusBadge>
          </div>
          <ul className="mt-3">
            {DESK_CAN.map((a) => (
              <li key={a} className="flex gap-2.5 py-2 text-[15px]">
                <span className="font-bold text-success-text">✓</span>
                {a}
              </li>
            ))}
            {DESK_CANNOT.map((a) => (
              <li key={a} className="flex gap-2.5 py-2 text-[15px] text-ink-muted">
                <span className="font-bold text-danger-text">✕</span>
                {a}
              </li>
            ))}
          </ul>
        </section>
        <section className="min-w-0 flex-[1.2_1_340px] rounded-card border border-line bg-card p-[22px]">
          <h2 className="text-[18px] font-semibold">Audit History</h2>
          <ul className="scrollbar-thin mt-3 max-h-[420px] overflow-y-auto pr-1">
            {auditView(data)
              .slice(0, 50)
              .map((l) => (
                <li key={l.id} className="flex gap-3 border-t border-line py-2.5">
                  <span
                    className={`mt-1.5 h-[9px] w-[9px] flex-none rounded-full ${DOT[l.action] ?? 'bg-ink-muted'}`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm">
                      <b>{l.staffName}</b> {l.text}
                    </div>
                    <div className="text-[13px] text-ink-muted">
                      {whenText(l.at)}
                      {l.reason && ` · reason: ${l.reason.toLowerCase()}`}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      </div>

      <Presence show={dialog?.kind === 'edit'}>
        {dialog?.kind === 'edit' && (
          <StaffModal
            staff={dialog.staff}
            isMe={dialog.staff?.id === me?.id}
            onClose={() => setDialog(null)}
            onSaved={(text) => {
              setDialog(null);
              showToast({ title: text });
            }}
          />
        )}
      </Presence>
      <Presence show={dialog?.kind === 'password'}>
        {dialog?.kind === 'password' && (
          <Modal
            open
            onClose={() => setDialog(null)}
            title="New password"
            subtitle={`${dialog.staff.name} (${dialog.staff.username})`}
            footer={
              <div className="flex justify-end px-6 pb-6 pt-5">
                <Button variant="primary" onClick={() => setDialog(null)}>
                  Done
                </Button>
              </div>
            }
          >
            <div className="px-6 pt-3">
              <div className="rounded-btn bg-card-2 p-4 text-center font-mono text-[24px] font-bold tracking-wider">
                {dialog.password}
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                Give this password to {dialog.staff.name.split(' ')[0]} in person. They can change
                it in Settings → Change Password after signing in.
              </p>
            </div>
          </Modal>
        )}
      </Presence>
      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}

function StaffModal({ staff, isMe, onClose, onSaved }) {
  const ids = { name: useId(), user: useId(), role: useId(), pw: useId() };
  const [form, setForm] = useState({
    name: staff?.name ?? '',
    username: staff?.username ?? '',
    role: staff?.role ?? ROLES.RECEPTIONIST,
    password: '',
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const save = (e) => {
    e.preventDefault();
    try {
      runAction(actions.saveStaff, { id: staff?.id, ...form });
      onSaved(
        staff ? 'Changes saved' : `Staff account ${form.username.trim().toLowerCase()} added`,
      );
    } catch (err) {
      setErrors(errorFields(err));
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={staff ? 'Edit Staff' : 'Add Staff'}
      subtitle={staff ? staff.username : 'Staff sign in with this username and password.'}
      footer={
        <div className="flex justify-end gap-2.5 px-6 pb-6 pt-5">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="staff-form">
            {staff ? 'Save Changes' : 'Add Staff'}
          </Button>
        </div>
      }
    >
      <form id="staff-form" noValidate onSubmit={save} className="flex flex-col gap-3.5 px-6 pt-4">
        <TextField
          id={ids.name}
          label="Full Name"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
        />
        <TextField
          id={ids.user}
          label="Username"
          placeholder="e.g. ana.frontdesk"
          autoCapitalize="none"
          value={form.username}
          onChange={set('username')}
          error={errors.username}
        />
        <TextField
          id={ids.role}
          as="select"
          label="Role"
          value={form.role}
          onChange={set('role')}
          error={errors.role}
          disabled={isMe}
        >
          <option value={ROLES.RECEPTIONIST}>Receptionist (front desk)</option>
          <option value={ROLES.OWNER}>Owner (full access)</option>
        </TextField>
        {!staff && (
          <TextField
            id={ids.pw}
            label="First Password"
            type="text"
            hint="(at least 8 characters)"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
          />
        )}
        {errors._ && <p className="text-sm text-danger-text">{errors._}</p>}
      </form>
    </Modal>
  );
}
