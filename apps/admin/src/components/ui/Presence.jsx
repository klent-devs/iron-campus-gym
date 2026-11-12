import { createContext, useContext, useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../lib/motion.js';

/** How long a pop-up or message takes to leave (matches the *-out animations in tailwind.config). */
export const EXIT_MS = 200;

const LeavingContext = createContext(false);

/**
 * Keeps a pop-up on screen for a moment after `show` turns false so it can fade out, showing the
 * last thing it rendered (so a dialog keeps its text while it leaves).
 *   <Presence show={open}><Modal open … /></Presence>
 * Inside, `useLeaving()` is true while it is on its way out.
 */
export function Presence({ show, children }) {
  const visible = Boolean(show);
  const [kept, setKept] = useState(visible ? children : null);
  const [leaving, setLeaving] = useState(false);

  // Adjust state while rendering (React's recommended pattern for "remember the last props").
  if (visible && kept !== children) setKept(children);
  if (visible && leaving) setLeaving(false);
  if (!visible && kept && !leaving) setLeaving(true);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(
      () => {
        setLeaving(false);
        setKept(null);
      },
      prefersReducedMotion() ? 0 : EXIT_MS,
    );
    return () => clearTimeout(timer);
  }, [leaving]);

  if (!visible && !kept) return null;
  return (
    <LeavingContext.Provider value={!visible}>{visible ? children : kept}</LeavingContext.Provider>
  );
}

/** True while the surrounding <Presence> is playing its exit animation. */
export function useLeaving() {
  return useContext(LeavingContext);
}
