import { parsePeso } from '@icg/shared';
import { actions } from '@icg/demo-data';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../../assets/Logo.jsx';
import {
  Button,
  FilterSelect,
  Modal,
  PageHeader,
  Presence,
  Switch,
  TextField,
  Toast,
  useToast,
} from '../../components/ui/index.js';
import { demo, isOwner, runAction, useDemoData, useStaff } from '../../lib/demo.js';
import { shake } from '../../lib/motion.js';
import { errorFields } from '../members/helpers.js';

const SECTIONS = [
  ['info', 'Gym Information'],
  ['/members/plans', 'Membership Plans'],
  ['pay', 'Payment Methods'],
  ['fees', 'Walk-in Fees'],
  ['cap', 'Gym Capacity'],
  ['/settings/staff', 'Staff Accounts'],
  ['pw', 'Change Password'],
  ['sample', 'Sample Data'],
];

/** "06:00" → "6:00 AM", like every other time in the system. */
const timeLabel = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
/** Opening and closing times to pick from: every 30 minutes (plus the saved one, if different). */
const timeOptions = (current) => {
  const list = Array.from(
    { length: 48 },
    (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
  );
  if (current && !list.includes(current)) list.push(current);
  return list.sort();
};

const settingsForm = (s) => ({
  gymName: s.gymName,
  contactNumber: s.contactNumber,
  address: s.address,
  opensAt: s.opensAt,
  closesAt: s.closesAt,
  maxCapacity: String(s.maxCapacity),
  showCapacity: s.showCapacity,
  warningPct: String(s.warningPct),
  regular: String(s.walkinFees.regular),
  student: String(s.walkinFees.student),
});

/**
 * Settings (docs/design/Settings.dc.html). Only the Owner can change the gym settings;
 * receptionists see Change Password only (checked again in the sample data's actions).
 */
export function SettingsPage() {
  const data = useDemoData();
  const staff = useStaff();
  const owner = isOwner(staff);
  const [form, setForm] = useState(() => settingsForm(data.settings));
  const [errors, setErrors] = useState({});
  const [active, setActive] = useState('info');
  const [toast, showToast, hideToast] = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const ids = {
    name: useId(),
    contact: useId(),
    address: useId(),
    opens: useId(),
    closes: useId(),
    cap: useId(),
    warn: useId(),
    regular: useId(),
    student: useId(),
  };

  useEffect(() => {
    // The Receptionist only has her password here (she opens it from the menu under her name).
    document.title = `${owner ? 'Settings' : 'Change Password'} · IRON CAMPUS GYM`;
  }, [owner]);

  const dirty = JSON.stringify(form) !== JSON.stringify(settingsForm(data.settings));
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function save() {
    const peso = (v) => {
      const n = parsePeso(v);
      return Number.isNaN(n) ? -1 : n;
    };
    try {
      runAction(actions.updateSettings, {
        gymName: form.gymName,
        contactNumber: form.contactNumber,
        address: form.address,
        opensAt: form.opensAt,
        closesAt: form.closesAt,
        maxCapacity: Number(form.maxCapacity),
        showCapacity: form.showCapacity,
        warningPct: Number(form.warningPct),
        walkinFees: { regular: peso(form.regular), student: peso(form.student) },
      });
      setErrors({});
      showToast({ title: 'Settings saved', body: 'The new settings are used right away.' });
    } catch (err) {
      const f = errorFields(err);
      setErrors({ ...f, regular: f['walkinFees.regular'], student: f['walkinFees.student'] });
      shake(document.querySelector('[aria-invalid="true"]'));
    }
  }

  const go = (id) => {
    setActive(id);
    document
      .getElementById(`settings-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* Save Changes shows in a bar at the bottom as soon as something is changed. */}
      <PageHeader
        title={owner ? 'Settings' : 'Change Password'}
        subtitle={
          owner
            ? 'Gym details, payment methods, capacity and walk-in fees. Only you can change these.'
            : 'Change the password you use to sign in. Gym settings are changed by the Owner.'
        }
      />
      <div className="flex flex-wrap items-start gap-4">
        {owner && (
          <nav
            aria-label="Settings sections"
            className="w-full rounded-card border border-line bg-card p-2.5 lg:sticky lg:top-[120px] lg:w-auto lg:max-w-[260px] lg:flex-[1_1_220px]"
          >
            {SECTIONS.map(([id, label]) =>
              id.startsWith('/') ? (
                <Link
                  key={id}
                  to={id}
                  className="flex h-[46px] items-center justify-between rounded-btn px-3.5 text-[15px] font-medium text-ink-soft hover:bg-card-2 hover:text-ink"
                >
                  {label} <span aria-hidden="true">›</span>
                </Link>
              ) : (
                <button
                  key={id}
                  type="button"
                  onClick={() => go(id)}
                  className={`flex h-[46px] w-full items-center rounded-btn px-3.5 text-left text-[15px] ${
                    active === id
                      ? 'bg-card-2 font-bold text-ink shadow-[inset_3px_0_0_rgb(255_61_10)]'
                      : 'font-medium text-ink-soft hover:bg-card-2 hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </nav>
        )}

        <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-4">
          {owner && (
            <>
              <Card id="info" title="Gym Information">
                <div className="my-[18px] flex flex-wrap items-center gap-[18px]">
                  <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[20px] border border-line bg-sidebar">
                    <LogoMark size={56} />
                  </div>
                  <div>
                    <b>Gym Logo</b>
                    <div className="mb-2.5 mt-0.5 text-[13px] text-ink-muted">
                      Shown on receipts, reports and the member app. PNG or SVG.
                    </div>
                    <Button
                      size="sm"
                      disabled
                      title="Uploading a logo needs the cloud storage (milestone 8)"
                    >
                      Upload New Logo
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <TextField
                    id={ids.name}
                    label="Gym Name"
                    value={form.gymName}
                    onChange={set('gymName')}
                    error={errors.gymName}
                  />
                  <TextField
                    id={ids.contact}
                    label="Contact Number"
                    placeholder="e.g. 0917 123 4567"
                    value={form.contactNumber}
                    onChange={set('contactNumber')}
                    error={errors.contactNumber}
                  />
                  <TextField
                    id={ids.address}
                    className="sm:col-span-2"
                    label="Address"
                    placeholder="e.g. 123 Rizal Ave., Sampaloc, Manila"
                    value={form.address}
                    onChange={set('address')}
                  />
                  {[
                    [ids.opens, 'Opening Time', 'opensAt'],
                    [ids.closes, 'Closing Time', 'closesAt'],
                  ].map(([id, label, key]) => (
                    <TextField
                      key={key}
                      id={id}
                      as="select"
                      label={label}
                      value={form[key]}
                      onChange={set(key)}
                      error={errors[key]}
                    >
                      {timeOptions(form[key]).map((t) => (
                        <option key={t} value={t}>
                          {timeLabel(t)}
                        </option>
                      ))}
                    </TextField>
                  ))}
                </div>
              </Card>

              <div className="flex flex-wrap items-start gap-4">
                <PaymentMethodsCard showToast={showToast} />
                <Card id="cap" title="Gym Capacity" className="flex-[1_1_300px]">
                  <div className="mt-4">
                    <TextField
                      id={ids.cap}
                      label="Maximum people inside at once"
                      inputMode="numeric"
                      value={form.maxCapacity}
                      onChange={set('maxCapacity')}
                      error={errors.maxCapacity}
                    />
                  </div>
                  <div className="mt-3.5 flex min-h-14 items-center justify-between gap-3 border-t border-line text-[15px]">
                    <div>
                      Show capacity on dashboard
                      <span className="block text-[13px] text-ink-muted">
                        Uses live check-in / check-out data
                      </span>
                    </div>
                    <Switch
                      label="Show capacity"
                      checked={form.showCapacity}
                      onChange={(v) => setForm((f) => ({ ...f, showCapacity: v }))}
                    />
                  </div>
                  <div className="flex min-h-14 items-center justify-between gap-3 border-t border-line text-[15px]">
                    <label htmlFor={ids.warn}>
                      Warn the front desk at
                      <span className="block text-[13px] text-ink-muted">
                        “Almost full” on the dashboard
                      </span>
                    </label>
                    <FilterSelect
                      id={ids.warn}
                      label="Warn the front desk at"
                      className="w-[110px] flex-none"
                      value={form.warningPct}
                      onChange={set('warningPct')}
                    >
                      <option value="90">90%</option>
                      <option value="80">80%</option>
                      <option value="70">70%</option>
                    </FilterSelect>
                  </div>
                </Card>
              </div>

              <Card id="fees" title="Walk-in Fees">
                <p className="mt-1 text-[13px] text-ink-muted">
                  Day-pass prices used by Register Walk-in. Past visits keep their price.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <TextField
                    id={ids.regular}
                    label="Regular day pass (₱)"
                    inputMode="decimal"
                    value={form.regular}
                    onChange={set('regular')}
                    error={errors.regular}
                  />
                  <TextField
                    id={ids.student}
                    label="Student day pass (₱)"
                    inputMode="decimal"
                    value={form.student}
                    onChange={set('student')}
                    error={errors.student}
                  />
                </div>
              </Card>

              {dirty && (
                <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand/50 bg-sidebar px-4 py-3 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
                  <span className="text-sm text-ink-soft">
                    You have changes that are not saved yet.
                  </span>
                  <span className="flex gap-2">
                    <Button onClick={() => setForm(settingsForm(data.settings))}>Undo</Button>
                    <Button variant="primary" onClick={save}>
                      Save Changes
                    </Button>
                  </span>
                </div>
              )}
            </>
          )}

          <ChangePasswordCard showToast={showToast} />

          {owner && (
            <Card id="sample" title="Sample Data">
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                The database is not connected yet. Everything you add or change (members, payments,
                check-ins, stock, settings) is saved <b>in this browser only</b>, and survives
                closing the page. Another computer or browser has its own copy.
                {!demo.persistent && (
                  <b className="mt-2 block text-warning-text">
                    This browser is not saving changes (private window or blocked site data). They
                    are lost when the page is closed.
                  </b>
                )}
              </p>
              {owner && (
                <Button
                  variant="outline"
                  icon="refresh"
                  className="mt-4"
                  onClick={() => setConfirmReset(true)}
                >
                  Start Over with Fresh Sample Data
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      <Presence show={confirmReset}>
        <Modal
          open
          onClose={() => setConfirmReset(false)}
          title="Start over with fresh sample data?"
          footer={
            <div className="flex justify-end gap-2.5 px-6 pb-6 pt-5">
              <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  demo.reset();
                  setForm(settingsForm(demo.getState().settings));
                  setConfirmReset(false);
                  showToast({
                    tone: 'brand',
                    title: 'Fresh sample data loaded',
                    body: 'Everything added in this browser was removed.',
                  });
                }}
              >
                Start Over
              </Button>
            </div>
          }
        >
          <p className="px-6 pt-2 text-[15px] leading-relaxed text-ink-soft">
            Every member, payment, check-in, stock change and setting added in this browser is
            removed, and the starting sample data comes back. Staff passwords go back to the sample
            ones. This can’t be undone.
          </p>
        </Modal>
      </Presence>
      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}

/** A settings box. (No "Owner only" label: the whole page is the Owner's.) */
function Card({ id, title, className = '', children }) {
  return (
    <section
      id={`settings-${id}`}
      className={`scroll-mt-[120px] rounded-card border border-line bg-card p-[22px] ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PaymentMethodsCard({ showToast }) {
  const data = useDemoData();
  const ids = { name: useId(), note: useId() };
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', note: '', requiresReference: true });
  const [error, setError] = useState('');
  const toggle = (m, enabled) => {
    try {
      runAction(actions.setPaymentMethod, { code: m.code, enabled });
      showToast({
        title: `${m.name} ${enabled ? 'turned on' : 'turned off'}`,
        body: enabled
          ? 'Staff can pick it when recording payments.'
          : 'It no longer shows on payment forms. Past payments keep it.',
      });
    } catch (err) {
      showToast({ tone: 'danger', title: 'Not saved', body: err.message });
    }
  };
  const add = (e) => {
    e.preventDefault();
    try {
      runAction(actions.addPaymentMethod, draft);
      setAdding(false);
      setDraft({ name: '', note: '', requiresReference: true });
      setError('');
      showToast({ title: 'Payment method added', body: `${draft.name.trim()} is turned on.` });
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Card id="pay" title="Payment Methods" className="flex-[1_1_300px]">
      <div className="mt-2.5">
        {data.paymentMethods.map((m) => (
          <div
            key={m.code}
            className="flex min-h-14 items-center justify-between gap-3 border-t border-line text-[15px] first:border-t-0"
          >
            <div>
              {m.name}
              <span className="block text-[13px] text-ink-muted">
                {m.note || (m.requiresReference ? 'Staff enters the reference number' : '')}
              </span>
            </div>
            <Switch label={m.name} checked={m.enabled} onChange={(v) => toggle(m, v)} />
          </div>
        ))}
      </div>
      {adding ? (
        <form
          onSubmit={add}
          noValidate
          className="mt-3 flex flex-col gap-3 rounded-btn bg-card-2 p-3.5"
        >
          <TextField
            id={ids.name}
            label="Name"
            placeholder="e.g. Maya"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            error={error}
            autoFocus
          />
          <TextField
            id={ids.note}
            label="Note for staff"
            hint="(optional)"
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
          />
          <label className="flex min-h-touch cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={draft.requiresReference}
              onChange={(e) => setDraft((d) => ({ ...d, requiresReference: e.target.checked }))}
              className="h-5 w-5 accent-brand"
            />
            Staff must type a reference number
          </label>
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Add Method
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" className="mt-3" onClick={() => setAdding(true)}>
          + Add Payment Method
        </Button>
      )}
    </Card>
  );
}

function ChangePasswordCard({ showToast }) {
  const ids = { cur: useId(), next: useId(), confirm: useId() };
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const save = (e) => {
    e.preventDefault();
    try {
      runAction(actions.changeOwnPassword, form);
      setForm({ current: '', next: '', confirm: '' });
      setErrors({});
      showToast({ title: 'Password updated', body: 'Use the new password next time you sign in.' });
    } catch (err) {
      setErrors(errorFields(err));
    }
  };
  return (
    <Card id="pw" title="Change Password">
      <form noValidate onSubmit={save}>
        <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-3">
          <TextField
            id={ids.cur}
            label="Current Password"
            type="password"
            autoComplete="current-password"
            value={form.current}
            onChange={set('current')}
            error={errors.current}
          />
          <TextField
            id={ids.next}
            label="New Password"
            type="password"
            autoComplete="new-password"
            value={form.next}
            onChange={set('next')}
            error={errors.next}
          />
          <TextField
            id={ids.confirm}
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
          />
        </div>
        <p className="mt-2 text-[13px] text-ink-muted">Use at least 8 characters.</p>
        <Button type="submit" variant="primary" className="mt-4">
          Update Password
        </Button>
      </form>
    </Card>
  );
}
