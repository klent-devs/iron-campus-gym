import { formatTimeOfDay } from '@icg/shared';
import { actions, initials } from '@icg/demo-data';
import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon.jsx';
import { Box, Field, KV, PrimaryButton, Screen, Sheet } from '../../components/ui.jsx';
import { runAction, setMemberSession } from '../../lib/demo.js';
import { useMemberInfo } from '../../lib/useMemberInfo.js';

const phoneText = (p) => (p ? p.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3') : '—');

/** My Profile (docs/design/MProfile.dc.html). Name and Member ID are changed at the front desk. */
export function ProfilePage() {
  const { state, info } = useMemberInfo();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [saved, setSaved] = useState('');
  const { contactNumber, gymName } = state.settings;

  const rows = [
    ['edit', 'Edit Profile', () => setSheet('edit')],
    ['lock', 'Change Password', () => setSheet('password')],
    ['receipt', 'Payment History', '/payments'],
    ['bell', 'Notifications', '/notifications'],
    ['phone', 'Contact Gym', () => setSheet('contact')],
  ];

  return (
    <Screen title="My Profile">
      <Box className="mt-4 flex items-center gap-4 !rounded-[22px] p-[18px]">
        <span className="inline-flex h-[76px] w-[76px] flex-none items-center justify-center rounded-full border-[3px] border-brand bg-[#2A2C31] font-heading text-[26px] font-bold">
          {initials(info.name)}
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-[20px] font-bold">{info.name}</h2>
          <div className="mt-1 font-mono text-sm text-ink-soft">{info.code}</div>
        </div>
      </Box>
      <Box className="mt-3.5 px-4">
        <KV label="Email" first>
          <span className="break-all">{info.email ?? '—'}</span>
        </KV>
        <KV label="Contact Number">{phoneText(info.phone)}</KV>
      </Box>
      <p className="mx-1 mt-2 text-[13px] text-ink-muted">
        To change your name or Member ID, ask the front desk.
      </p>
      {saved && (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-success/40 bg-success/[0.12] px-4 py-3 text-sm text-success-text"
        >
          {saved}
        </p>
      )}

      <nav className="mt-4 overflow-hidden rounded-[18px] border border-line bg-card">
        {rows.map(([icon, label, target], i) => {
          const cls = `flex min-h-14 w-full items-center gap-3 px-4 text-left text-[15px] ${i ? 'border-t border-line' : ''}`;
          const inner = (
            <>
              <i className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-card-2 text-ink-soft">
                <Icon name={icon} size={18} />
              </i>
              <span className="flex-1">{label}</span>
              <Icon name="chevron" size={18} className="text-ink-muted" />
            </>
          );
          return typeof target === 'string' ? (
            <Link key={label} to={target} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={label} type="button" onClick={target} className={cls}>
              {inner}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => {
          setMemberSession(null);
          navigate('/login', { replace: true });
        }}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#5C2526] font-bold text-danger-text"
      >
        <Icon name="logout" size={20} />
        Logout
      </button>

      {sheet === 'edit' && (
        <EditSheet
          member={info}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            setSaved('Your details are saved.');
          }}
        />
      )}
      {sheet === 'password' && (
        <PasswordSheet
          member={info}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            setSaved('Password changed. Use the new one next time you log in.');
          }}
        />
      )}
      {sheet === 'contact' && (
        <Sheet title="Contact Gym" onClose={() => setSheet(null)}>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            {gymName} front desk{contactNumber ? `: ${contactNumber}` : ''}. Open every day,{' '}
            {formatTimeOfDay(state.settings.opensAt)} – {formatTimeOfDay(state.settings.closesAt)}.
          </p>
          {contactNumber ? (
            <a
              href={`tel:${contactNumber.replace(/\s/g, '')}`}
              className="mt-4 flex h-14 items-center justify-center rounded-2xl bg-brand font-heading font-bold"
            >
              Call the Gym
            </a>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              The gym hasn’t added a phone number yet. Ask at the front desk.
            </p>
          )}
        </Sheet>
      )}
    </Screen>
  );
}

function errorsOf(err) {
  return err?.fields ?? { _: err?.message };
}

function EditSheet({ member, onClose, onSaved }) {
  const ids = { email: useId(), phone: useId() };
  const [email, setEmail] = useState(member.email ?? '');
  const [phone, setPhone] = useState(phoneText(member.phone));
  const [errors, setErrors] = useState({});
  const save = () => {
    try {
      runAction(actions.memberUpdateContact, { memberId: member.id, email, contactNumber: phone });
      onSaved();
    } catch (err) {
      setErrors(errorsOf(err));
    }
  };
  return (
    <Sheet title="Edit Profile" onClose={onClose}>
      <div className="mt-4 flex flex-col gap-4">
        <Field
          id={ids.email}
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Field
          id={ids.phone}
          label="Contact Number"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.contactNumber}
        />
        {errors._ && <p className="text-sm text-danger-text">{errors._}</p>}
        <PrimaryButton onClick={save}>Save Changes</PrimaryButton>
      </div>
    </Sheet>
  );
}

function PasswordSheet({ member, onClose, onSaved }) {
  const ids = { cur: useId(), next: useId(), confirm: useId() };
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = () => {
    try {
      runAction(actions.memberChangePassword, { memberId: member.id, ...form });
      onSaved();
    } catch (err) {
      setErrors(errorsOf(err));
    }
  };
  return (
    <Sheet title="Change Password" onClose={onClose}>
      <div className="mt-4 flex flex-col gap-4">
        <Field
          id={ids.cur}
          label="Current Password"
          type="password"
          value={form.current}
          onChange={set('current')}
          error={errors.current}
        />
        <Field
          id={ids.next}
          label="New Password"
          type="password"
          value={form.next}
          onChange={set('next')}
          error={errors.next}
        />
        <Field
          id={ids.confirm}
          label="Confirm New Password"
          type="password"
          value={form.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        <PrimaryButton onClick={save}>Update Password</PrimaryButton>
      </div>
    </Sheet>
  );
}
