import { memberView } from '@icg/demo-data';
import { useDemoData, useMember, useToday } from './demo.js';

/** The signed-in member with plan, dates, status and days left (shared membership rules). */
export function useMemberInfo() {
  const state = useDemoData();
  const member = useMember();
  const today = useToday();
  return { state, today, info: member ? memberView(state, member.id, today) : null };
}

/** "Monthly · Active" style words for the status pill. */
export const STATUS_WORD = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  suspended: 'Suspended',
  pending: 'Not active yet',
};
