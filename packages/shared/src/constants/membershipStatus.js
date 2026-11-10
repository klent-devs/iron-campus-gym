export const MEMBERSHIP_STATUS = Object.freeze({
  ACTIVE: 'active',
  EXPIRING_SOON: 'expiring_soon',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
});

export const MEMBERSHIP_STATUS_LIST = Object.values(MEMBERSHIP_STATUS);

export const MEMBERSHIP_STATUS_LABELS = Object.freeze({
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  suspended: 'Suspended',
  pending: 'Pending',
});

/** A membership with this many days left (or fewer) counts as "Expiring Soon". */
export const EXPIRING_SOON_DAYS = 7;

/** Subscription period rows: whether they are counted, waiting, or cancelled. */
export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  SCHEDULED: 'scheduled',
  CANCELLED: 'cancelled',
});
export const SUBSCRIPTION_STATUS_LIST = Object.values(SUBSCRIPTION_STATUS);
