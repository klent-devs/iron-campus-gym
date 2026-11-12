import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { Presence, useLeaving } from './Presence.jsx';

const TONES = {
  success: { dot: 'bg-success', border: 'border-success/40', bar: 'bg-success', icon: 'check' },
  brand: { dot: 'bg-brand', border: 'border-brand/40', bar: 'bg-brand', icon: 'logout' },
  danger: { dot: 'bg-danger', border: 'border-danger/40', bar: 'bg-danger', icon: 'close' },
};

/**
 * Success / error message in the corner (docs/design/Components.dc.html "Notifications").
 * Use with `useToast()`: `const [toast, showToast] = useToast(); showToast({ title, body })`.
 * It slides in, shows a thin bar counting down until it goes away, and slides out.
 */
export function Toast({ toast, onClose }) {
  return (
    <Presence show={toast}>
      {toast && <ToastCard key={toast.key} toast={toast} onClose={onClose} />}
    </Presence>
  );
}

function ToastCard({ toast, onClose }) {
  const leaving = useLeaving();
  const t = TONES[toast.tone ?? 'success'];
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-end">
      <div
        role="status"
        className={`relative flex w-full max-w-[380px] items-start gap-3 overflow-hidden rounded-[14px] border bg-sidebar px-4 py-3.5 text-sm text-ink-soft shadow-[0_20px_40px_rgba(0,0,0,0.45)] ${t.border} ${
          leaving
            ? 'motion-safe:animate-toast-out'
            : 'pointer-events-auto motion-safe:animate-toast-in'
        }`}
      >
        <span
          className={`inline-flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-ink ${t.dot}`}
        >
          <Icon name={t.icon} size={16} strokeWidth={3} />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[15px] text-ink">{toast.title}</b>
          {toast.body}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss message"
          className="-mr-2 -mt-1.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-btn text-ink-muted transition hover:bg-card-2 hover:text-ink"
        >
          <Icon name="close" size={16} />
        </button>
        {toast.ms > 0 && (
          <span
            aria-hidden="true"
            className={`absolute inset-x-0 bottom-0 h-[3px] origin-left opacity-60 ${t.bar}`}
            style={{ animation: `shrink-x ${toast.ms}ms linear both` }}
          />
        )}
      </div>
    </div>
  );
}

/** Shows one message at a time; it goes away by itself after `ms`. */
export function useToast(ms = 5000) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);
  const show = useCallback(
    (next) => {
      clearTimeout(timer.current);
      setToast({ ...next, key: Date.now(), ms });
      timer.current = setTimeout(hide, ms);
    },
    [hide, ms],
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, show, hide];
}
