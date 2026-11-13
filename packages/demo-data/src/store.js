/**
 * Keeps the sample data in the browser (localStorage) so changes survive a reload, and tells
 * every open tab of the same address when something changed (admin website and member portal
 * share it when the portal is opened at http://localhost:5173/m/).
 *
 * TODO(api): this whole store goes away when the screens call the local API instead.
 */
import { DemoError } from './actions.js';
import { DATA_VERSION, createSeed } from './seed.js';

export const STORAGE_KEY = 'icg-sample-data';

function safeStorage(storage) {
  try {
    const probe = '__icg_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null; // private window, blocked site data, or no storage at all
  }
}

/**
 * @param {{ storage?: Storage|null, now?: () => Date, getActor?: (state) => object|null,
 *           getMemberActor?: (state) => object|null, listen?: boolean }} options
 */
export function createDemoStore({
  storage = typeof localStorage === 'undefined' ? null : localStorage,
  now = () => new Date(),
  getActor = () => null,
  getMemberActor = () => null,
  listen = typeof window !== 'undefined',
} = {}) {
  const store = safeStorage(storage);
  const listeners = new Set();
  let saveError = null;
  let state = load();

  function load() {
    if (store) {
      try {
        const saved = JSON.parse(store.getItem(STORAGE_KEY) ?? 'null');
        if (saved?.meta?.version === DATA_VERSION) return saved;
      } catch {
        // Broken copy: start again from fresh sample data.
      }
    }
    const fresh = createSeed(now());
    save(fresh);
    return fresh;
  }

  function save(next) {
    if (!store) return;
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(next));
      saveError = null;
    } catch (error) {
      saveError = error; // keeps working in memory; changes are lost on reload
    }
  }

  const notify = () => listeners.forEach((listener) => listener());

  if (listen && store) {
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue === null) state = load();
      else {
        try {
          state = JSON.parse(event.newValue);
        } catch {
          return;
        }
      }
      notify();
    });
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Whether changes are being saved in this browser (false in a private window). */
    get persistent() {
      return Boolean(store) && !saveError;
    },
    /**
     * Run an action from actions.js with the signed-in staff member (or member) and the time now.
     * Returns the action's result; throws DemoError with a message to show staff.
     */
    run(action, input = {}) {
      const ctx = { now: now(), actor: getActor(state), memberActor: getMemberActor(state) };
      const { state: next, result } = action(state, input, ctx);
      if (next !== state) {
        state = next;
        save(state);
        notify();
      }
      return result;
    },
    /** Throw away every change and start again from fresh sample data. */
    reset() {
      state = createSeed(now());
      save(state);
      notify();
    },
  };
}

export { DemoError };
