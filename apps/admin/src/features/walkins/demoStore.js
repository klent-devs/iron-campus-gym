/**
 * Walk-in sample data kept in memory for this browser tab (DEMO, not saved anywhere).
 * Changes survive moving between pages but are lost on reload.
 * TODO(api): replace these actions with calls to the walk-in API (features/walkins/api.js).
 */
import { useSyncExternalStore } from 'react';
import { createDemoData, findExistingCustomer } from './demoData.js';

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

/** { customers, visits } — re-renders when they change. */
export function useWalkinDemo() {
  return useSyncExternalStore(subscribe, getState);
}

/**
 * Register a walk-in visit; time in is now. Reuses the customer if they've been before.
 * @param {{ customerName: string, contactNumber: string|null, feeType: 'regular'|'student',
 *           fee: number, paymentMethodCode: string|null }} input  (already checked by the schema)
 * @returns {{ visit: object, customer: object, returning: boolean }}
 */
export function registerVisit(input, now = new Date()) {
  const { customers } = getState();
  const existing = findExistingCustomer(customers, {
    name: input.customerName,
    phone: input.contactNumber,
  });
  const customer = existing ?? {
    id: `new-c${nextId++}`,
    name: input.customerName,
    phone: input.contactNumber,
  };
  const visit = {
    id: `new-v${nextId++}`,
    customerId: customer.id,
    feeType: input.feeType,
    fee: input.fee,
    timeIn: now.toISOString(),
    timeOut: null,
    paymentStatus: input.paymentMethodCode ? 'paid' : 'unpaid',
    paymentMethod: input.paymentMethodCode,
  };
  setState((s) => ({
    customers: existing ? s.customers : [...s.customers, customer],
    visits: [visit, ...s.visits],
  }));
  return { visit, customer, returning: Boolean(existing) };
}

export function recordPayment(visitId, methodCode) {
  setState((s) => ({
    ...s,
    visits: s.visits.map((v) =>
      v.id === visitId && v.paymentStatus === 'unpaid'
        ? { ...v, paymentStatus: 'paid', paymentMethod: methodCode }
        : v,
    ),
  }));
}

export function completeVisit(visitId, now = new Date()) {
  setState((s) => ({
    ...s,
    visits: s.visits.map((v) =>
      v.id === visitId && !v.timeOut ? { ...v, timeOut: now.toISOString() } : v,
    ),
  }));
}
