import { describe, expect, it } from 'vitest';
import {
  buildQrPayload,
  computeChange,
  formatDate,
  formatMemberCode,
  formatPeso,
  formatTransactionNo,
  parsePeso,
  parseQrPayload,
  todayInGym,
} from '../src/index.js';

describe('money', () => {
  it('formats pesos', () => {
    expect(formatPeso(1200)).toBe('₱1,200.00');
    expect(formatPeso(-80)).toBe('−₱80.00');
  });
  it('parses peso text', () => {
    expect(parsePeso('₱1,200.50')).toBe(1200.5);
  });
  it('computes change without going negative', () => {
    expect(computeChange(100, 500)).toBe(400);
    expect(computeChange(100, 50)).toBe(0);
  });
});

describe('ids and QR', () => {
  it('formats member and transaction numbers', () => {
    expect(formatMemberCode(2026, 643)).toBe('ICG-2026-0643');
    expect(formatTransactionNo(2026, 11, 391)).toBe('TXN-2026-11-0391');
  });
  it('round-trips QR payloads and rejects foreign codes', () => {
    const token = 'a1B2c3D4e5F6g7H8i9J0kLmN';
    expect(parseQrPayload(buildQrPayload(token))).toBe(token);
    expect(parseQrPayload('https://example.com')).toBeNull();
    expect(parseQrPayload('ICG:short')).toBeNull();
  });
});

describe('dates', () => {
  it('formats dates for display', () => {
    expect(formatDate('2026-11-09')).toBe('09 Nov 2026');
    // Always 3 letters: some Node/browser versions would write 'Sept'.
    expect(formatDate('2026-09-09')).toBe('09 Sep 2026');
    expect(formatDate('2026-02-30')).toBe('—');
  });
  it('uses Manila time for "today"', () => {
    // 2026-11-09 17:30 UTC is already 10 Nov in Manila (UTC+8)
    expect(todayInGym(new Date('2026-11-09T17:30:00Z'))).toBe('2026-11-10');
  });
});
