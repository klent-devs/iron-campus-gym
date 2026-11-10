import { CAPACITY_BUSY_PCT, CAPACITY_LEVEL } from '../constants/capacity.js';

/**
 * How full the gym is right now.
 * @param {{ inside: number, max: number|null|undefined, warningPct?: number }} input
 *   warningPct comes from gym_settings.capacity_warning_pct ("Almost full" at or above it).
 * @returns {{ percent: number|null, level: string }} percent has one decimal (56.7)
 */
export function capacityLevel({ inside, max, warningPct = 90 }) {
  if (!max || max <= 0) return { percent: null, level: CAPACITY_LEVEL.NOT_SET };
  const percent = Math.round((inside / max) * 1000) / 10;
  let level = CAPACITY_LEVEL.QUIET;
  if (inside >= max) level = CAPACITY_LEVEL.FULL;
  else if (percent >= warningPct) level = CAPACITY_LEVEL.ALMOST_FULL;
  else if (percent >= CAPACITY_BUSY_PCT) level = CAPACITY_LEVEL.BUSY;
  return { percent, level };
}
