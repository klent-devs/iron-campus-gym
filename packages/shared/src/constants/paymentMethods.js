/**
 * Default payment methods seeded into the database. The owner can turn these on/off
 * or add more in Settings → Payment Methods, so apps should read the list from the API.
 */
export const DEFAULT_PAYMENT_METHODS = Object.freeze([
  { code: 'cash', name: 'Cash', requiresReference: false, needsOwnerConfirmation: false },
  { code: 'gcash', name: 'GCash', requiresReference: true, needsOwnerConfirmation: false },
  { code: 'bank_transfer', name: 'Bank Transfer', requiresReference: true, needsOwnerConfirmation: true },
]);
