/**
 * The member portal's connection to the SAMPLE DATA (packages/demo-data), kept in this browser.
 * Opened at http://localhost:5173/m/ it shares the admin website's data, so a payment or check-in
 * recorded at the front desk shows up here right away.
 * TODO(api): replace with Supabase (Auth + the member's own rows, milestone 8).
 */
import { useSyncExternalStore } from 'react';
import { createDemoStore } from '@icg/demo-data';
import { useNow } from './useNow.js';
import { todayInGym } from '@icg/shared';

const SESSION_KEY = 'icg-portal-session';
const listeners = new Set();

const read = () => {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
};
let sessionId = read();

export const demo = createDemoStore({
  getMemberActor: (state) => state.members.find((m) => m.id === sessionId) ?? null,
});

export function setMemberSession(memberId) {
  sessionId = memberId;
  try {
    if (memberId) localStorage.setItem(SESSION_KEY, memberId);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked: signed in until the page is closed.
  }
  listeners.forEach((l) => l());
}

function subscribeSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDemoData() {
  return useSyncExternalStore(demo.subscribe, demo.getState);
}

/** The signed-in member (from the sample data), or null. */
export function useMember() {
  const state = useDemoData();
  const id = useSyncExternalStore(subscribeSession, () => sessionId);
  return state.members.find((m) => m.id === id) ?? null;
}

export function useToday() {
  return todayInGym(useNow(60_000));
}

export function runAction(action, input) {
  return demo.run(action, input);
}
