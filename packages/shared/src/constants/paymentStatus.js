export const PAYMENT_STATUS = Object.freeze({
  PAID: 'paid',
  PENDING: 'pending',
  VOIDED: 'voided',
  REFUNDED: 'refunded',
});

export const PAYMENT_STATUS_LIST = Object.values(PAYMENT_STATUS);

export const PAYMENT_STATUS_LABELS = Object.freeze({
  paid: 'Paid',
  pending: 'Pending',
  voided: 'Voided',
  refunded: 'Refunded',
});

/** What a payment is for. */
export const PAYMENT_TYPE = Object.freeze({
  MEMBERSHIP_NEW: 'membership_new',
  MEMBERSHIP_RENEWAL: 'membership_renewal',
  WALKIN: 'walkin',
  PRODUCT: 'product',
});

export const PAYMENT_TYPE_LIST = Object.values(PAYMENT_TYPE);

export const PAYMENT_TYPE_LABELS = Object.freeze({
  membership_new: 'New membership',
  membership_renewal: 'Membership renewal',
  walkin: 'Walk-in',
  product: 'Product',
});
