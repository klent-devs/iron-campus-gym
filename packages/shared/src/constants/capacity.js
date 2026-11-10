/** How busy the gym is, shown on the Gym Capacity gauge. */
export const CAPACITY_LEVEL = Object.freeze({
  QUIET: 'quiet',
  BUSY: 'busy',
  ALMOST_FULL: 'almost_full',
  FULL: 'full',
  NOT_SET: 'not_set',
});

export const CAPACITY_LEVEL_LABELS = Object.freeze({
  quiet: 'Not busy',
  busy: 'Getting busy',
  almost_full: 'Almost full',
  full: 'Full',
  not_set: 'Capacity not set',
});

/** At or above this percentage the gym counts as "Getting busy". */
export const CAPACITY_BUSY_PCT = 50;
