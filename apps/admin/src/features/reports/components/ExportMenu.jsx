import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { Icon } from '../../../components/ui/Icon.jsx';

/**
 * One "Export" button that opens a short list: Print, Excel (.csv), PDF.
 * Esc or a click outside closes it; arrow keys move between the choices.
 * @param {{ items: { label: string, hint?: string, icon: string, onSelect: () => void }[] }} props
 */
export function ExportMenu({ items }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    wrapRef.current?.querySelector('[role="menuitem"]')?.focus();
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const move = (e) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const list = [...wrapRef.current.querySelectorAll('[role="menuitem"]')];
    const i = list.indexOf(document.activeElement);
    list[(i + step + list.length) % list.length]?.focus();
  };

  return (
    <div ref={wrapRef} className="relative">
      <Button
        ref={buttonRef}
        icon="download"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="h-11"
      >
        Export
        <Icon
          name="chevronDown"
          size={16}
          className={`-mr-1 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </Button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Export report"
          onKeyDown={move}
          className="absolute right-0 top-[calc(100%+6px)] z-20 w-[230px] rounded-btn border border-line bg-sidebar p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] motion-safe:animate-drop-in"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="flex min-h-touch w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm transition-colors hover:bg-card-2 focus-visible:bg-card-2 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <Icon name={item.icon} size={18} className="flex-none text-ink-muted" />
              <span className="min-w-0">
                <b className="block font-semibold">{item.label}</b>
                {item.hint && <span className="block text-[12px] text-ink-muted">{item.hint}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
