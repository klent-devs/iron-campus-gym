import { describe, expect, it } from 'vitest';
import {
  CAPACITY_LEVEL,
  STOCK_STATUS,
  capacityLevel,
  dashboardQuerySchema,
  formatPesoCompact,
  stockStatus,
} from '../src/index.js';

describe('capacityLevel', () => {
  it('matches the design sample: 34 of 60 is 56.7%, getting busy', () => {
    expect(capacityLevel({ inside: 34, max: 60, warningPct: 90 })).toEqual({
      percent: 56.7,
      level: CAPACITY_LEVEL.BUSY,
    });
  });
  it('is quiet below half', () => {
    expect(capacityLevel({ inside: 10, max: 60 }).level).toBe(CAPACITY_LEVEL.QUIET);
  });
  it('is almost full at the warning percentage', () => {
    expect(capacityLevel({ inside: 54, max: 60, warningPct: 90 }).level).toBe(
      CAPACITY_LEVEL.ALMOST_FULL,
    );
  });
  it('is full at or above the maximum', () => {
    expect(capacityLevel({ inside: 60, max: 60 }).level).toBe(CAPACITY_LEVEL.FULL);
    expect(capacityLevel({ inside: 63, max: 60 })).toEqual({
      percent: 105,
      level: CAPACITY_LEVEL.FULL,
    });
  });
  it('reports "not set" when the owner has not entered a maximum', () => {
    expect(capacityLevel({ inside: 5, max: null })).toEqual({
      percent: null,
      level: CAPACITY_LEVEL.NOT_SET,
    });
  });
});

describe('stockStatus', () => {
  it('is out of stock at zero', () => {
    expect(stockStatus(0, 12)).toBe(STOCK_STATUS.OUT_OF_STOCK);
    expect(stockStatus(0, 0)).toBe(STOCK_STATUS.OUT_OF_STOCK);
  });
  it('is low at or below the reorder level', () => {
    expect(stockStatus(8, 24)).toBe(STOCK_STATUS.LOW_STOCK);
    expect(stockStatus(24, 24)).toBe(STOCK_STATUS.LOW_STOCK);
  });
  it('is in stock above the reorder level', () => {
    expect(stockStatus(25, 24)).toBe(STOCK_STATUS.IN_STOCK);
  });
});

describe('formatPesoCompact', () => {
  it('shortens amounts for chart axes', () => {
    expect(formatPesoCompact(0)).toBe('₱0');
    expect(formatPesoCompact(950)).toBe('₱950');
    expect(formatPesoCompact(200000)).toBe('₱200k');
    expect(formatPesoCompact(1500)).toBe('₱1.5k');
    expect(formatPesoCompact(1250000)).toBe('₱1.25M');
    expect(formatPesoCompact(-80)).toBe('−₱80');
  });
});

describe('dashboardQuerySchema', () => {
  it('defaults to the last 12 months', () => {
    expect(dashboardQuerySchema.parse({})).toEqual({ range: '12m' });
  });
  it('accepts the three ranges and rejects others', () => {
    for (const range of ['12m', '6m', 'ytd']) {
      expect(dashboardQuerySchema.parse({ range }).range).toBe(range);
    }
    expect(dashboardQuerySchema.safeParse({ range: '5y' }).success).toBe(false);
  });
});
