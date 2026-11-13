import { todayInGym } from '@icg/shared';
import { useNow } from './useNow.js';

/** Today's gym date ('YYYY-MM-DD', Manila), updated when the day changes. */
export function useToday() {
  return todayInGym(useNow(60_000));
}
