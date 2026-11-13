/**
 * Attendance on the shared SAMPLE DATA (lib/demo.js → packages/demo-data), kept in this browser.
 * The rules are checked twice, like with the real API: here (decideScan, for the wording) and in
 * the sample data's checkIn action (one open check-in, expired/suspended rejected).
 * TODO(api): replace these actions with calls to the attendance API (features/attendance/api.js).
 */
import { actions, attendanceView } from '@icg/demo-data';
import { todayInGym } from '@icg/shared';
import { demo, runAction, useDemoData } from '../../lib/demo.js';
import { useNow } from '../../lib/useNow.js';
import { decideScan, missedCheckOuts, visitsThisMonth } from './demoData.js';

/** { members, checkIns, rejections } — re-renders when they change. */
export function useAttendanceDemo() {
  const today = todayInGym(useNow(60_000));
  return attendanceView(useDemoData(), today);
}

/** Most people allowed inside at once, from Settings → Gym Capacity. */
export function useCapacity() {
  return useDemoData().settings.maxCapacity;
}

/**
 * Scan a member (or press Check In / Check Out) and save what happened.
 * @param {{ memberId: string|null, mode?: 'auto'|'in'|'out' }} input  memberId null = unknown QR
 * @returns {object} the decision from decideScan() plus { at, checkIn, visits, missed }
 */
export function scanMember({ memberId, mode = 'auto' }, now = new Date()) {
  const today = todayInGym(now);
  const { members, checkIns } = attendanceView(demo.getState(), today);
  const member = memberId ? members.find((m) => m.id === memberId) : null;
  const decision = decideScan({ member, checkIns, today, mode });
  let checkIn = decision.open;

  if (decision.kind === 'granted') {
    checkIn = runAction(actions.checkIn, { memberId: member.id }).checkIn;
  } else if (decision.kind === 'checkout') {
    checkIn = runAction(actions.checkOut, { checkInId: decision.open.id }).checkIn;
  } else if (['expired', 'suspended', 'invalid'].includes(decision.kind)) {
    runAction(actions.recordRejection, { kind: decision.kind, memberId });
  }

  const after = attendanceView(demo.getState(), today).checkIns;
  return {
    ...decision,
    at: checkIn?.timeOut ?? checkIn?.timeIn ?? new Date().toISOString(),
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
 * Fix a missed check-out: save the time out staff entered and why (goes to the audit history).
 * TODO(api): receptionists may only fix the last 48 hours; the server checks it.
 */
export function fixTimeOut(checkInId, timeOutIso, reason) {
  return runAction(actions.fixTimeOut, { checkInId, timeOut: timeOutIso, reason });
}
