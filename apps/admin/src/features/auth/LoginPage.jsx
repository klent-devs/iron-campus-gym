import { useEffect, useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { staffLoginSchema } from '@icg/shared';
import { LogoMark } from '../../assets/Logo.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { colors } from '../../lib/theme.js';
import { signIn } from './api.js';
import { readRememberedLogin, saveRememberedLogin } from './rememberedLogin.js';

/** Staff sign-in page (docs/design/AdminLogin.dc.html). Shown without the sidebar and top bar. */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginId = useId();
  const passwordId = useId();
  const [initialLogin] = useState(readRememberedLogin);
  const [login, setLogin] = useState(initialLogin);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Sign in · IRON CAMPUS GYM';
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const parsed = staffLoginSchema.safeParse({ login, password, rememberMe });
    if (!parsed.success) {
      const errors = {};
      for (const issue of parsed.error.issues) errors[issue.path[0]] ??= issue.message;
      setFieldErrors(errors);
      // Put the cursor in the first field that needs fixing.
      document.getElementById(errors.login ? loginId : passwordId)?.focus();
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      await signIn(parsed.data);
      saveRememberedLogin(parsed.data.login, parsed.data.rememberMe);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      setFormError(err?.message || "Couldn't sign in. Please try again.");
      setBusy(false);
    }
  }

  function clearError(field) {
    if (fieldErrors[field]) setFieldErrors((f) => ({ ...f, [field]: undefined }));
  }

  return (
    <div className="flex min-h-screen flex-wrap bg-base">
      <BrandPanel />

      <section className="flex flex-[1_1_480px] items-center justify-center bg-base px-6 py-12">
        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex w-full max-w-[420px] flex-col gap-[22px]"
        >
          <div>
            <h2 className="text-[34px] font-bold leading-tight">Welcome Back</h2>
            <p className="mt-2 text-[16px] text-ink-muted">Sign in to manage the gym.</p>
          </div>

          {formError && (
            <Notice tone="danger" title="Couldn't sign in">
              {formError}
            </Notice>
          )}

          <Field id={loginId} label="Username or email" icon="account" error={fieldErrors.login}>
            <input
              id={loginId}
              value={login}
              onChange={(e) => {
                setLogin(e.target.value);
                clearError('login');
              }}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus={!initialLogin}
              placeholder="e.g. joy.frontdesk"
              aria-invalid={fieldErrors.login ? true : undefined}
              aria-describedby={fieldErrors.login ? `${loginId}-error` : undefined}
              className={INPUT}
            />
          </Field>

          <Field id={passwordId} label="Password" icon="lock" error={fieldErrors.password}>
            <input
              id={passwordId}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError('password');
              }}
              autoComplete="current-password"
              autoFocus={Boolean(initialLogin)}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? `${passwordId}-error` : undefined}
              className={INPUT}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="h-10 shrink-0 rounded-[10px] bg-card-2 px-2.5 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-line hover:text-ink"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <label className="flex min-h-touch cursor-pointer items-center gap-2.5 text-[15px] text-ink-soft">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-5 w-5 cursor-pointer accent-brand"
              />
              Remember Me
            </label>
            <button
              type="button"
              onClick={() => setShowForgot((s) => !s)}
              aria-expanded={showForgot}
              className="py-3 text-[15px] font-semibold text-brand-text transition-colors hover:text-ink"
            >
              Forgot Password?
            </button>
          </div>

          {showForgot && (
            <Notice tone="info" title="Forgot your password?">
              Ask the gym owner to set a new one for you in Settings → Staff Accounts.
            </Notice>
          )}

          <button
            type="submit"
            disabled={busy}
            aria-busy={busy || undefined}
            className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-brand font-heading text-[17px] font-bold text-ink transition-colors hover:bg-brand-hover disabled:cursor-wait disabled:opacity-80"
          >
            {busy && (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                className="animate-spin"
                aria-hidden="true"
              >
                <path
                  d="M12 3a9 9 0 1 0 9 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {busy ? 'Signing In…' : 'Sign In'}
          </button>

          {/* SAMPLE DATA ONLY. TODO(auth): remove this box when Supabase sign-in is connected. */}
          <Notice tone="info" title="Sample accounts (no real sign-in yet)">
            <span className="mt-1 block">
              Owner: <b className="font-mono text-ink">marco.owner</b> /{' '}
              <b className="font-mono text-ink">owner1234</b>
            </span>
            <span className="block">
              Receptionist: <b className="font-mono text-ink">joy.frontdesk</b> /{' '}
              <b className="font-mono text-ink">frontdesk1</b>
            </span>
          </Notice>
        </form>
      </section>
    </div>
  );
}

// The field box shows focus (orange border), so the input itself has no ring.
const INPUT =
  'min-w-0 flex-1 border-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-dim ' +
  'focus-visible:ring-0 focus-visible:ring-offset-0';

/** Label + 54 px field box with an icon, and the error message under it. */
function Field({ id, label, icon, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink-soft">
        {label}
      </label>
      <div
        className={
          'flex h-[54px] items-center gap-2.5 rounded-[14px] border bg-card pl-4 pr-2 text-ink-muted transition-colors ' +
          (error ? 'border-danger' : 'border-line focus-within:border-brand')
        }
      >
        <Icon name={icon} size={20} />
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}

const NOTICE_TONES = {
  danger: { border: 'border-danger/40', dot: 'bg-danger', icon: 'close', role: 'alert' },
  info: { border: 'border-line', dot: 'bg-card-2', icon: 'help', role: 'status' },
};

/** Message box in the style of the notifications in docs/design/Components.dc.html. */
function Notice({ tone, title, children }) {
  const t = NOTICE_TONES[tone];
  return (
    <div
      role={t.role}
      className={`flex items-start gap-3 rounded-[14px] border bg-sidebar px-4 py-3.5 text-sm text-ink-soft ${t.border}`}
    >
      <span
        className={`inline-flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-ink ${t.dot}`}
      >
        <Icon name={t.icon} size={16} strokeWidth={3} />
      </span>
      <div>
        <b className="block text-[15px] text-ink">{title}</b>
        {children}
      </div>
    </div>
  );
}

/** Left half: logo, motto and the faded weight-plate artwork. Stacks on top below about 1000 px. */
function BrandPanel() {
  return (
    <section className="relative flex flex-[1_1_520px] flex-col justify-between gap-10 overflow-hidden bg-sidebar p-8 sm:min-h-[520px] sm:p-14">
      <svg
        width="760"
        height="760"
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[200px] -right-[220px] opacity-[0.07]"
      >
        <path
          d="M36.7 11.3A18 18 0 1 0 36.7 36.7"
          fill="none"
          stroke={colors.brand}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="24" cy="24" r="10" fill="none" stroke={colors.ink} strokeWidth="1" />
        <circle cx="24" cy="24" r="3" fill="none" stroke={colors.ink} strokeWidth="1" />
      </svg>

      <div className="relative flex items-center gap-3.5">
        <LogoMark size={52} />
        <span className="leading-[1.05]">
          <span className="block font-heading text-[22px] font-extrabold tracking-[0.04em] text-ink">
            IRON CAMPUS
          </span>
          <span className="block font-heading text-sm font-bold tracking-[0.4em] text-brand-text">
            GYM
          </span>
        </span>
      </div>

      <div className="relative">
        <h1 className="text-[44px] font-extrabold leading-[1.02] tracking-[-0.01em] sm:text-[64px]">
          STRONGER
          <br />
          EVERY <span className="text-brand">DAY.</span>
        </h1>
        <p className="mt-5 max-w-[440px] text-[17px] leading-relaxed text-ink-muted">
          Members, check-ins, walk-ins, payments and stock — all from one front desk.
        </p>
      </div>

      {/* White, not the design's grey: owner's choice (12 Nov 2026). */}
      <p className="relative text-[13px] text-ink">Staff accounts are created by the gym owner.</p>
    </section>
  );
}
