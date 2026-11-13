/**
 * Members and check-ins from docs/design/Attendance*.dc.html, for testing the attendance page
 * helpers. (The app itself uses the shared sample data in packages/demo-data.)
 */
import { addDays, todayInGym } from '@icg/shared';

const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;

/**
 * Sample members and check-ins from docs/design/Attendance*.dc.html. Times are set back from
 * `now` by the same gaps as in the design (where it is 10:42 AM), so the screen looks right at
 * any hour.
 */
export function createDemoData(now = new Date()) {
  const today = todayInGym(now);
  const at = (minutesAgo) => new Date(now.getTime() - minutesAgo * MINUTE).toISOString();
  const member = (id, code, name, plan, daysLeft, extra = {}) => ({
    id,
    code,
    name,
    plan,
    endDate: daysLeft === null ? null : addDays(today, daysLeft),
    suspended: false,
    qrToken: `demo${code.replace(/\D/g, '')}qrtoken${id}`,
    ...extra,
  });
  const members = [
    member('m1', 'ICG-2025-0291', 'Andrea Lim', 'Monthly', 29),
    member('m2', 'ICG-2025-0318', 'Paolo Reyes', 'Quarterly', 54),
    member('m3', 'ICG-2025-0402', 'Bianca Santos', 'Monthly', 12),
    member('m4', 'ICG-2024-0107', 'Miguel Ramos', 'Annual', 201),
    member('m5', 'ICG-2026-0611', 'Trisha Navarro', 'Monthly', 3),
    member('m6', 'ICG-2026-0588', 'Daniel Cruz', 'Monthly', 18),
    member('m7', 'ICG-2026-0642', 'Kyla Mae Dizon', 'Student Monthly', 25),
    member('m8', 'ICG-2025-0356', 'Jerome Castro', 'Monthly', -12),
    member('m9', 'ICG-2025-0377', 'Lea Gonzales', 'Monthly', 20, {
      suspended: true,
      suspendedOn: addDays(today, -7),
      suspendReason: 'Unpaid balance',
      balance: 1200,
    }),
    member('m10', 'ICG-2025-0333', 'Mark Villanueva', 'Quarterly', 41),
    member('m11', 'ICG-2026-0590', 'Rica Mendoza', 'Monthly', 9),
  ];

  const checkIn = (id, memberId, inAgo, outAgo) => ({
    id,
    memberId,
    timeIn: at(inAgo),
    timeOut: outAgo === null ? null : at(outAgo),
  });
  const D = DAY_MINUTES;
  const checkIns = [
    // Today
    checkIn('a1', 'm1', 4, null),
    checkIn('a2', 'm2', 22, null),
    checkIn('a3', 'm4', 44, null),
    checkIn('a4', 'm7', 71, null),
    checkIn('a5', 'm3', 145, 37),
    checkIn('a6', 'm5', 277, 194),
    checkIn('a7', 'm6', 280, 181),
    // Yesterday: two people never scanned out (5:02 PM and 6:40 PM in the design).
    checkIn('a8', 'm10', D - 380, null),
    checkIn('a9', 'm11', D - 478, null),
    checkIn('a10', 'm7', D - 332, D - 441),
    checkIn('a11', 'm1', D + 120, D + 22),
    // Earlier this month, so "Visits this month" has something to count.
    ...[2, 3, 4, 5, 6, 8].map((days, i) => checkIn(`b${i}`, 'm1', days * D + 90, days * D + 10)),
    checkIn('c1', 'm2', 2 * D + 200, 2 * D + 110),
    checkIn('c2', 'm6', 3 * D + 30, 3 * D - 60),
  ];

  const rejections = [
    { id: 'r1', at: at(130), kind: 'expired', memberId: 'm8' },
    { id: 'r2', at: at(95), kind: 'invalid', memberId: null },
    { id: 'r3', at: at(60), kind: 'suspended', memberId: 'm9' },
  ];
  return { members, checkIns, rejections };
}
