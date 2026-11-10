import { describe, expect, it } from 'vitest';
import { memberCreateSchema, stockMovementSchema, walkinVisitCreateSchema } from '../src/index.js';

const uuid = '3f1c2b9e-8a4d-4c6e-9b1a-2d3e4f5a6b7c';

describe('memberCreateSchema', () => {
  const valid = {
    fullName: 'Carlo Tan',
    contactNumber: '0917 882 4410',
    email: '',
    planId: uuid,
    startDate: '2026-11-09',
    payment: { paymentMethodCode: 'cash', amount: 1200 },
  };
  it('accepts a valid member and normalises the phone number', () => {
    const r = memberCreateSchema.parse(valid);
    expect(r.contactNumber).toBe('09178824410');
    expect(r.email).toBeNull();
  });
  it('gives a friendly message for a bad phone number', () => {
    const r = memberCreateSchema.safeParse({ ...valid, contactNumber: '0917 48' });
    expect(r.success).toBe(false);
    expect(r.error.issues[0].message).toBe('Enter 11 digits, like 0917 123 4567');
  });
});

describe('walkinVisitCreateSchema', () => {
  it('allows no contact number and pay later', () => {
    const r = walkinVisitCreateSchema.parse({ customerName: 'Ella Bautista', fee: 100, paymentMethodCode: null });
    expect(r.contactNumber).toBeNull();
  });
});

describe('stockMovementSchema', () => {
  it('rejects zero quantity', () => {
    const r = stockMovementSchema.safeParse({ itemId: uuid, type: 'sold', quantity: 0, movementDate: '2026-11-09' });
    expect(r.success).toBe(false);
  });
});
