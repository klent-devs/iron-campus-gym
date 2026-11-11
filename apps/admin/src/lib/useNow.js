import { useEffect, useState } from 'react';

/**
 * The current time, updated on each new second (or every `stepMs`). Timers line up with the
 * clock's own second boundary so a ticking display never skips or repeats a second.
 */
export function useNow(stepMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, stepMs - (current.getTime() % stepMs) + 5);
    };
    timer = setTimeout(tick, stepMs - (Date.now() % stepMs) + 5);

    // Browsers slow timers in background tabs; catch up as soon as the tab is shown again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [stepMs]);

  return now;
}
