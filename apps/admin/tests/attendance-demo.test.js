import { buildQrPayload } from '@icg/shared';
import { describe, expect, it } from 'vitest';
import {
  decideScan,
  findMembers,
  gymTimeToIso,
  missedCheckOuts,
  recordRange,
  shortDuration,
  suggestedTimeOut,
  summarizeDay,
  visitsThisMonth,
} from '../src/features/attendance/demoData.js';
import { createDemoData } from './fixtures/attendanceDesign.js';

// 10:42 AM in Manila on Mon 09 Nov 2026, like the design.
const NOW = new Date('2026-11-09T02:42:00Z');
const TODAY = '2026-11-09';

describe('attendance sample data', () => {
  const { members, checkIns, rejections } = createDemoData(NOW);
  const byName = (name) => members.find((m) => m.name === name);
  const decide = (name, mode) => decideScan({ member: byName(name), checkIns, today: TODAY, mode });

  it('counts today: 7 check-ins, 4 inside, 3 checked out, 3 rejected', () => {
    expect(summarizeDay(checkIns, rejections, TODAY)).toMatchObject({
      total: 7,
      inside: 4,
      checkedOut: 3,
      rejected: 3,
    });
  });

  it('lists the 2 members from yesterday with no time out, oldest first', () => {
    const missed = missedCheckOuts(checkIns, TODAY);
    expect(missed.map((c) => members.find((m) => m.id === c.memberId).name)).toEqual([
      'Mark Villanueva',
      'Rica Mendoza',
    ]);
  });

  it('a scan checks in, a second scan checks out', () => {
    expect(decide('Bianca Santos').kind).toBe('granted'); // she left earlier today
    expect(decide('Andrea Lim').kind).toBe('checkout'); // inside now
  });

  it('rejects expired and suspended members; unknown codes are invalid', () => {
    expect(decide('Jerome Castro').kind).toBe('expired');
    expect(decide('Lea Gonzales').kind).toBe('suspended');
    expect(decideScan({ member: null, checkIns, today: TODAY }).kind).toBe('invalid');
  });

  it('lets an expiring-soon member in', () => {
    const r = decide('Trisha Navarro');
    expect(r).toMatchObject({ kind: 'granted', status: 'expiring_soon', daysLeft: 3 });
  });

  it('Check In on someone inside, or Check Out on someone not inside, changes nothing', () => {
    expect(decide('Andrea Lim', 'in').kind).toBe('already-in');
    expect(decide('Bianca Santos', 'out').kind).toBe('not-in');
  });

  it('a check-in left open yesterday does not block checking in today', () => {
    expect(decide('Mark Villanueva').kind).toBe('granted');
  });

  it('finds members by QR code, full Member ID or part of the name', () => {
    const andrea = byName('Andrea Lim');
    expect(findMembers(members, buildQrPayload(andrea.qrToken))).toEqual({
      fromQr: true,
      matches: [andrea],
    });
    expect(findMembers(members, 'ICG:somethingThatIsNotAMember00').matches).toEqual([]);
    expect(findMembers(members, 'icg-2025-0291').matches).toEqual([andrea]);
    expect(findMembers(members, 'andrea').matches).toEqual([andrea]);
    expect(findMembers(members, 'an').matches.length).toBeGreaterThan(1);
  });

  it('counts this month’s visits (8 for Andrea, as in the design)', () => {
    expect(visitsThisMonth(checkIns, 'm1', TODAY)).toBe(8);
  });
});

describe('attendance helpers', () => {
  it('shortDuration: minutes under an hour, then hours and minutes', () => {
    expect(shortDuration('2026-11-09T02:38:00Z', NOW)).toBe('4 min');
    expect(shortDuration('2026-11-09T01:31:00Z', NOW)).toBe('1h 11m');
  });

  it('suggestedTimeOut: 1h 30m after time in, rounded to 5 min, never after 10 PM', () => {
    expect(suggestedTimeOut('2026-11-08T09:02:00Z')).toBe('18:30'); // in 5:02 PM
    expect(suggestedTimeOut('2026-11-08T13:40:00Z')).toBe('22:00'); // in 9:40 PM
  });

  it('gymTimeToIso reads the time as Manila time', () => {
    expect(gymTimeToIso('2026-11-08', '19:10')).toBe('2026-11-08T11:10:00.000Z');
  });

  it('recordRange: weeks start on Monday; a picked date is one day', () => {
    expect(recordRange('week', '2026-11-12')).toEqual({ from: '2026-11-09', to: '2026-11-12' });
    expect(recordRange('pick', TODAY, '2026-11-01')).toEqual({
      from: '2026-11-01',
      to: '2026-11-01',
    });
  });
});
