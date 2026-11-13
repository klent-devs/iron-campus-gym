import { actions } from '@icg/demo-data';
import { useEffect, useId, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogoMark } from '../../components/Icon.jsx';
import { runAction, setMemberSession, useMember } from '../../lib/demo.js';

/** Member login (docs/design/MLogin.dc.html). SAMPLE ONLY — TODO(api): Supabase Auth. */
export function LoginPage() {
  const navigate = useNavigate();
  const member = useMember();
  const ids = { user: useId(), pass: useId() };
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Login · IRON CAMPUS GYM';
  }, []);
  if (member) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Enter your Member ID (or email) and password.');
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    try {
      const result = runAction(actions.memberSignIn, { identifier, password });
      setMemberSession(result.member.id);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col overflow-hidden px-6 pb-8 pt-[72px]">
      <svg
        width="520"
        height="520"
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="pointer-events-none absolute -right-[220px] -top-[160px] opacity-[0.06]"
      >
        <path
          d="M36.7 11.3A18 18 0 1 0 36.7 36.7"
          fill="none"
          stroke="#FF3D0A"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
      <div className="relative flex flex-col items-center text-center">
        <div className="flex h-[84px] w-[84px] items-center justify-center rounded-3xl bg-brand">
          <LogoMark size={56} plate="#FFFFFF" bar="#090A0C" />
        </div>
        <div className="mt-4 font-heading text-[22px] font-extrabold tracking-[0.04em]">
          IRON CAMPUS <span className="text-brand-text">GYM</span>
        </div>
        <div className="mt-1 font-heading text-xs font-bold tracking-[0.2em] text-ink-muted">
          STRONGER EVERY DAY.
        </div>
      </div>

      <form noValidate onSubmit={submit} className="relative mt-10 flex flex-col gap-[18px]">
        {error && (
          <p
            role="alert"
            className="rounded-[14px] border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger-text"
          >
            {error}
          </p>
        )}
        <div>
          <label htmlFor={ids.user} className="mb-2 block text-sm font-semibold text-ink-soft">
            Email or Member ID
          </label>
          <div className="flex h-[58px] items-center rounded-2xl border border-line bg-card px-4 focus-within:border-brand">
            <input
              id={ids.user}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError('');
              }}
              autoComplete="username"
              autoCapitalize="characters"
              placeholder="ICG-2025-0291"
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-dim focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <div>
          <label htmlFor={ids.pass} className="mb-2 block text-sm font-semibold text-ink-soft">
            Password
          </label>
          <div className="flex h-[58px] items-center gap-2 rounded-2xl border border-line bg-card pl-4 pr-2 focus-within:border-brand">
            <input
              id={ids.pass}
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              autoComplete="current-password"
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="h-10 rounded-[10px] bg-card-2 px-3 text-sm font-semibold text-ink-soft"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setForgot((f) => !f)}
          className="self-end py-1.5 text-[15px] font-semibold text-brand-text"
        >
          Forgot Password?
        </button>
        {forgot && (
          <p className="rounded-2xl border border-line bg-card p-4 text-sm text-ink-soft">
            Ask a receptionist at the front desk to set a new password for you.
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex h-[58px] items-center justify-center rounded-2xl bg-brand font-heading text-[17px] font-bold transition active:scale-[0.98] disabled:opacity-80"
        >
          {busy ? 'Logging in…' : 'Login'}
        </button>
      </form>

      <div className="flex-1" />
      <p className="relative mt-8 rounded-2xl border border-line bg-card p-4 text-center text-sm leading-normal text-ink-soft">
        No account yet? Your login is created at the front desk when you sign up. Ask a
        receptionist.
      </p>
      {/* SAMPLE DATA ONLY. TODO(api): remove when Supabase sign-in is connected. */}
      <p className="relative mt-3 text-center text-xs text-ink-dim">
        Sample account: <b className="font-mono text-ink-muted">ICG-2025-0291</b> /{' '}
        <b className="font-mono text-ink-muted">andrea2026</b>. Other members: their mobile number.
      </p>
    </div>
  );
}
