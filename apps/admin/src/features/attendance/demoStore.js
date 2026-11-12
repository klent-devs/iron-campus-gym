/**
 * Attendance sample data kept in memory for this browser tab (DEMO, not saved anywhere).
 * Changes survive moving between pages but are lost on reload.
 * TODO(api): replace these actions with calls to the attendance API (features/attendance/api.js).
 */
import { useSyncExternalStore } from 'react';
import { todayInGym } from '@icg/shared';
import { createDemoData, decideScan, missedCheckOuts, visitsThisMonth } from './demoData.js';

let state = null;
const listeners = new Set();
let nextId = 1;

function getState() {
  if (!state) state = createDemoData();
  return state;
}

function setState(update) {
  state = update(getState());
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** { members, checkIns, rejections } — re-renders when they change. */
export function useAttendanceDemo() {
  return useSyncExternalStore(subscribe, getState);
}

/**
 * Scan a member (or press Check In / Check Out) and save what happened.
 * @param {{ memberId: string|null, mode?: 'auto'|'in'|'out' }} input  memberId null = unknown QR
 * @returns {object} the decision from decideScan() plus { at, checkIn, visits, missed }
 */
export function scanMember({ memberId, mode = 'auto' }, now = new Date()) {
  const { members, checkIns } = getState();
  const today = todayInGym(now);
  const member = memberId ? members.find((m) => m.id === memberId) : null;
  const decision = decideScan({ member, checkIns, today, mode });
  const at = now.toISOString();
  let checkIn = decision.open;

  if (decision.kind === 'granted') {
    checkIn = { id: `new-a${nextId++}`, memberId: member.id, timeIn: at, timeOut: null };
    setState((s) => ({ ...s, checkIns: [checkIn, ...s.checkIns] }));
  } else if (decision.kind === 'checkout') {
    checkIn = { ...decision.open, timeOut: at };
    setState((s) => ({
      ...s,
      checkIns: s.checkIns.map((c) => (c.id === checkIn.id ? checkIn : c)),
    }));
  } else if (['expired', 'suspended', 'invalid'].includes(decision.kind)) {
    const rejection = { id: `new-r${nextId++}`, at, kind: decision.kind, memberId };
    setState((s) => ({ ...s, rejections: [...s.rejections, rejection] }));
  }

  const after = getState().checkIns;
  return {
    ...decision,
    at,
    checkIn,
    visits: member ? visitsThisMonth(after, member.id, today) : 0,
    // Their check-in from an earlier day that still has no time out (needs fixing).
    missed: member ? missedCheckOuts(after, today).find((c) => c.memberId === member.id) : null,
  };
}

/** Check out from the "Currently Inside" list. Same result as scanning them again. */
export function checkOutMember(memberId, now = new Date()) {
  return scanMember({ memberId, mode: 'out' }, now);
}

/**
 * Fix a missed check-out: save the time out staff entered and why.
 * TODO(api): Owner or receptionist (last 48 hours only); writes to audit_logs on the server.
 */
export function fixTimeOut(checkInId, timeOutIso, reason, now = new Date()) {
  setState((s) => ({
    ...s,
    checkIns: s.checkIns.map((c) =>
      c.id === checkInId && !c.timeOut
        ? { ...c, timeOut: timeOutIso, fix: { reason, at: now.toISOString() } }
        : c,
    ),
  }));
}
