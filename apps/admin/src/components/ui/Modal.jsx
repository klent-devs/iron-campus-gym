import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon.jsx';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Pop-up window over a dark backdrop (docs/design/Components.dc.html, WalkIn.dc.html).
 * - `variant="dialog"`: centred box near the top. `variant="drawer"`: panel on the right.
 * - Esc, the ✕ button and a click on the backdrop call `onClose`. Tab stays inside the pop-up.
 * - The first field (or `initialFocusRef`) gets the cursor; focus returns to the opener on close.
 * @param {{ open: boolean, onClose: () => void, title: React.ReactNode, subtitle?: React.ReactNode,
 *           variant?: 'dialog'|'drawer', size?: 'md'|'lg', showClose?: boolean,
 *           headerDivider?: boolean, footer?: React.ReactNode, initialFocusRef?: React.RefObject,
 *           children: React.ReactNode }} props
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  variant = 'dialog',
  size = 'md',
  showClose = true,
  headerDivider = false,
  footer,
  initialFocusRef,
  children,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const panel = panelRef.current;
    const first =
      initialFocusRef?.current ??
      panel?.querySelector('input:not([disabled]), select, textarea') ??
      panel?.querySelector(FOCUSABLE);
    first?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === 'Tab' && panel) {
        const items = [...panel.querySelectorAll(FOCUSABLE)];
        if (!items.length) return;
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault();
          firstItem.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  const drawer = variant === 'drawer';
  const width = drawer ? 'max-w-[440px]' : size === 'lg' ? 'max-w-[560px]' : 'max-w-[480px]';

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex overflow-y-auto ${
        drawer ? 'justify-end bg-black/60' : 'items-start justify-center bg-black/70 px-4 py-[10vh]'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${width} border-line bg-card ${
          drawer
            ? 'flex min-h-full flex-col border-l'
            : 'overflow-hidden rounded-[20px] border shadow-[0_30px_60px_rgba(0,0,0,0.5)]'
        }`}
      >
        <div
          className={`flex items-start justify-between gap-4 px-6 ${
            drawer ? 'pt-7' : headerDivider ? 'border-b border-line py-5' : 'pt-6'
          }`}
        >
          <div className="min-w-0">
            <h2
              id={titleId}
              className={drawer ? 'text-[22px] font-semibold' : 'text-[21px] font-semibold'}
            >
              {title}
            </h2>
            {subtitle && <div className="mt-1.5 text-[15px] text-ink-soft">{subtitle}</div>}
          </div>
          {showClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-btn bg-card-2 text-ink transition-colors hover:bg-line"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <div className={drawer ? 'flex flex-1 flex-col gap-[18px] px-6 pb-7 pt-[18px]' : ''}>
          {children}
        </div>
        {footer}
      </div>
    </div>,
    document.body,
  );
}
