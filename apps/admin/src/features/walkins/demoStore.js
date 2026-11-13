/**
 * Walk-ins on the shared SAMPLE DATA (lib/demo.js → packages/demo-data), kept in this browser.
 * Every visit also makes a payment row, so walk-ins show up in Payments and Reports.
 * TODO(api): replace these actions with calls to the walk-in API (features/walkins/api.js).
 */
import { actions, walkinView } from '@icg/demo-data';
import { runAction, useDemoData } from '../../lib/demo.js';

/** { customers, visits } — re-renders when they change. */
export function useWalkinDemo() {
  return walkinView(useDemoData());
}

/** Regular day pass and Monthly plan price, for the "make them a member" hint. */
export function useWalkinPrices() {
  const state = useDemoData();
  const monthly = state.plans.find((p) => p.name === 'Monthly' && p.isActive);
  return { fee: state.settings.walkinFees.regular, monthly: monthly?.price ?? 1200 };
}

/** Day-pass prices from Settings. */
export function useWalkinFees() {
  return useDemoData().settings.walkinFees;
}

/**
 * Register a walk-in visit; time in is now. Reuses the customer if they've been before.
 * @param {{ customerName, contactNumber, feeType, fee, paymentMethodCode, walkinCustomerId? }} input
 * @returns {{ visit, customer, returning }}  throws DemoError (e.g. already inside)
 */
export function registerVisit(input) {
  const result = runAction(actions.registerVisit, input);
  return {
    ...result,
    visit: { ...result.visit, paymentStatus: result.payment.status === 'paid' ? 'paid' : 'unpaid' },
  };
}

export function recordPayment(visitId, methodCode) {
  return runAction(actions.payVisit, { visitId, method: methodCode });
}

export function completeVisit(visitId) {
  return runAction(actions.completeVisit, { visitId });
}
