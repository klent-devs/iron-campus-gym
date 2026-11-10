import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data and keeps it fresh.
 * - `loading` is true only for the first load (show skeletons).
 * - `refreshing` is true while reloading; the old data stays on screen.
 * - With `refreshMs`, reloads on a timer while the browser tab is visible.
 *
 * @param {(signal: AbortSignal) => Promise<any>} load  must be stable (wrap in useCallback)
 * @param {{ refreshMs?: number }} [options]
 */
export function useApi(load, { refreshMs } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true, refreshing: false });
  const controllerRef = useRef(null);

  const run = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((s) => ({ ...s, refreshing: s.data !== null, loading: s.data === null, error: null }));
    try {
      const data = await load(controller.signal);
      if (!controller.signal.aborted)
        setState({ data, error: null, loading: false, refreshing: false });
    } catch (error) {
      if (controller.signal.aborted || error.name === 'AbortError') return;
      setState((s) => ({ ...s, error, loading: false, refreshing: false }));
    }
  }, [load]);

  useEffect(() => {
    run();
    return () => controllerRef.current?.abort();
  }, [run]);

  useEffect(() => {
    if (!refreshMs) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') run();
    }, refreshMs);
    return () => clearInterval(id);
  }, [run, refreshMs]);

  return { ...state, reload: run };
}
