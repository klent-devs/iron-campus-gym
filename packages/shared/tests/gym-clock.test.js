import { describe, expect, it } from 'vitest';
import {
  GYM_OPEN_STATE,
  formatClock,
  formatLongDate,
  formatSidebarClock,
  formatTimeOfDay,
  greetingFor,
  gymOpenStatus,
  gymTimeParts,
  normalizeTime,
} from '../src/index.js';

/** A moment given in Manila time (UTC+8, no daylight saving). */
const manila = (isoLocal) => new Date(`${isoLocal}+08:00`);

describe('gym clock text', () => {
  const now = manila('2026-11-11T10:42:15');

  it('shows the time in Manila, whatever the PC time zone is', () => {
    expect(formatClock(now)).toBe('10:42:15 AM');
    expect(formatClock(now, { seconds: false })).toBe('10:42 AM');
    expect(gymTimeParts(now)).toEqual({ hours: 10, minutes: 42, seconds: 15 });
  });

  it('shows midnight as 12, not 0 or 24', () => {
    expect(formatClock(manila('2026-11-11T00:05:00'))).toBe('12:05:00 AM');
    expect(gymTimeParts(manila('2026-11-11T00:05:00')).hours).toBe(0);
  });

  it('shows the full date with the weekday', () => {
    expect(formatLongDate(now)).toBe('Wednesday, 11 Nov 2026');
    // 11 PM in Manila is still the same Manila day even though UTC is earlier.
    expect(formatLongDate(manila('2026-11-11T23:30:00'))).toBe('Wednesday, 11 Nov 2026');
    expect(formatLongDate(manila('2026-11-12T00:30:00'))).toBe('Thursday, 12 Nov 2026');
  });

  it('shows the one-line sidebar clock', () => {
    expect(formatSidebarClock(manila('2026-11-11T14:26:59'))).toBe('Wed Nov 11 2:26PM');
    expect(formatSidebarClock(manila('2026-11-12T00:05:00'))).toBe('Thu Nov 12 12:05AM');
    expect(formatSidebarClock(manila('2026-09-09T09:00:00'))).toBe('Wed Sep 9 9:00AM');
    expect(formatSidebarClock(manila('2026-11-11T12:00:00'))).toBe('Wed Nov 11 12:00PM');
  });

  it('greets by time of day', () => {
    expect(greetingFor(manila('2026-11-11T06:00:00'))).toBe('Good morning');
    expect(greetingFor(manila('2026-11-11T11:59:59'))).toBe('Good morning');
    expect(greetingFor(manila('2026-11-11T12:00:00'))).toBe('Good afternoon');
    expect(greetingFor(manila('2026-11-11T18:00:00'))).toBe('Good evening');
  });

  it('formats opening hours', () => {
    expect(formatTimeOfDay('22:00')).toBe('10:00 PM');
    expect(formatTimeOfDay('06:30:00')).toBe('6:30 AM');
    expect(formatTimeOfDay('00:00')).toBe('12:00 AM');
    expect(formatTimeOfDay('12:00')).toBe('12:00 PM');
    expect(formatTimeOfDay('nope')).toBe('—');
    expect(normalizeTime('06:00:00')).toBe('06:00');
    expect(normalizeTime(null)).toBeNull();
  });
});

describe('gymOpenStatus', () => {
  const hours = { opensAt: '06:00', closesAt: '22:00' };
  const at = (time) => gymOpenStatus({ ...hours, now: manila(`2026-11-11T${time}`) });

  it('is open during opening hours', () => {
    expect(at('06:00:00')).toEqual({
      state: GYM_OPEN_STATE.OPEN,
      label: 'Open now',
      detail: 'Closes at 10:00 PM',
    });
    expect(at('15:00:00').state).toBe(GYM_OPEN_STATE.OPEN);
  });

  it('warns in the last hour before closing', () => {
    expect(at('21:00:00')).toEqual({
      state: GYM_OPEN_STATE.CLOSING_SOON,
      label: 'Closing soon',
      detail: 'Closes in 1 hr (10:00 PM)',
    });
    expect(at('21:15:00').detail).toBe('Closes in 45 min (10:00 PM)');
    expect(at('21:59:30').detail).toBe('Closes in 1 min (10:00 PM)');
    expect(at('20:59:00').state).toBe(GYM_OPEN_STATE.OPEN);
  });

  it('is closed outside opening hours and says when it opens', () => {
    expect(at('05:00:00')).toEqual({
      state: GYM_OPEN_STATE.CLOSED,
      label: 'Closed',
      detail: 'Opens at 6:00 AM',
    });
    expect(at('22:00:00').detail).toBe('Opens tomorrow at 6:00 AM');
    expect(at('23:30:00').detail).toBe('Opens tomorrow at 6:00 AM');
  });

  it('handles hours that run past midnight', () => {
    const late = (time) =>
      gymOpenStatus({ opensAt: '14:00', closesAt: '02:00', now: manila(`2026-11-11T${time}`) });
    expect(late('23:00:00').detail).toBe('Closes at 2:00 AM');
    expect(late('01:30:00').detail).toBe('Closes in 30 min (2:00 AM)');
    expect(late('03:00:00')).toMatchObject({ state: 'closed', detail: 'Opens at 2:00 PM' });
  });

  it('treats the same opening and closing time as open 24 hours', () => {
    expect(
      gymOpenStatus({ opensAt: '00:00', closesAt: '00:00', now: manila('2026-11-11T03:00:00') }),
    ).toEqual({ state: 'open', label: 'Open now', detail: 'Open 24 hours' });
  });

  it('falls back to 6:00 AM – 10:00 PM when hours are missing', () => {
    expect(
      gymOpenStatus({ opensAt: null, closesAt: undefined, now: manila('2026-11-11T05:00:00') }),
    ).toMatchObject({ state: 'closed', detail: 'Opens at 6:00 AM' });
  });
});
