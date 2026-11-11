import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSmoothWheelScroll } from '../../lib/smoothScroll.js';
import { Icon } from '../ui/Icon.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

/** Sidebar on the left, top bar and page on the right. Below 1024 px the sidebar is a drawer. */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useSmoothWheelScroll(); // gentler mouse-wheel / touchpad scrolling (lib/smoothScroll.js)

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-base lg:flex">
      {/* The menu never moves (overflow-hidden), and data-scroll-lock stops the wheel over it from
          scrolling the page (lib/smoothScroll.js). */}
      <aside
        data-scroll-lock
        className="sticky top-0 hidden h-screen w-[260px] shrink-0 overflow-hidden lg:block"
      >
        <Sidebar />
      </aside>

      {menuOpen && (
        <div
          data-scroll-lock
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="scrollbar-none absolute inset-y-0 left-0 w-[280px] max-w-[85vw] overflow-y-auto overscroll-contain">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-5 inline-flex h-11 w-11 items-center justify-center rounded-btn text-ink-soft hover:bg-card-2"
              aria-label="Close menu"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
      )}

      {/* One spacing size everywhere: 16 px around the page and between every block (gap-4). */}
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-4">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <Outlet />
      </main>
    </div>
  );
}
