import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Icon } from '../ui/Icon.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

/** Sidebar on the left, top bar and page on the right. Below 1024 px the sidebar is a drawer. */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

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
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 overflow-y-auto lg:block">
        <Sidebar />
      </aside>

      {menuOpen && (
        <div
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
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] overflow-y-auto">
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

      <main className="flex min-w-0 flex-1 flex-col gap-5 px-5 pb-10 pt-4">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <Outlet />
      </main>
    </div>
  );
}
