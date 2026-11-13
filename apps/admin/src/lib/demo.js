/**
 * The admin website's connection to the SAMPLE DATA (packages/demo-data). Everything staff add or
 * change is kept in this browser (localStorage) and survives a reload. No database, no API.
 *
 * - `useDemoData()`  the whole sample data set; the page re-renders when anything changes.
 * - `runAction(action, input)`  make a change as the signed-in staff member. Throws DemoError
 *   (`message` to show, `fields` for form errors) when a gym rule says no.
 * - `useStaff()`  the signed-in staff member, or null.
 *
 * TODO(api): replace with calls to the local API, one feature at a time (each feature's demoStore
 * or page is the only place that calls this).
 */
import { useSyncExternalStore } from 'react';
import { createDemoStore } from '@icg/demo-data';
import { ROLES } from '@icg/shared';

const SESSION_KEY = 'icg-admin-session';
const sessionListeners = new Set();

function readSession() {
  try {
    return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || null;
  } catch {
    return null;
  }
}

let sessionId = readSession();

const activeStaff = (state, id) =>
  state.staff.find((s) => s.id === id && s.status === 'active') ?? null;

export const demo = createDemoStore({
  getActor: (state) => activeStaff(state, sessionId),
});

/**
 * Remember who signed in. `remember` keeps them signed in after the browser closes.
 * TODO(auth): the Supabase session replaces this.
 */
export function setSession(staffId, remember = true) {
  sessionId = staffId;
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (staffId) (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, staffId);
  } catch {
    // Storage blocked: the sign-in lasts until the page is reloaded.
  }
  sessionListeners.forEach((l) => l());
}

function subscribeSession(listener) {
  sessionListeners.add(listener);
  const onStorage = (e) => {
    if (e.key === SESSION_KEY) {
      sessionId = readSession();
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    sessionListeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useDemoData() {
  return useSyncExternalStore(demo.subscribe, demo.getState);
}

/** The signed-in staff member (re-checked against the data, so a disabled account is signed out). */
export function useStaff() {
  const state = useDemoData();
  const id = useSyncExternalStore(subscribeSession, () => sessionId);
  return activeStaff(state, id);
}

export const isOwner = (staff) => staff?.role === ROLES.OWNER;

export function runAction(action, input) {
  return demo.run(action, input);
}
