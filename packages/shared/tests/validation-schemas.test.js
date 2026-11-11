/**
 * Pins down how every form-validation schema behaves: what is accepted, how values are cleaned
 * up, and the exact messages staff see. Written before the zod 3 → 4 upgrade so the upgrade
 * could not change behaviour unnoticed. Keep these passing when changing validation.
 */
import { describe, expect, it } from 'vitest';
import {
  inventoryItemSchema,
  isoDate,
  memberCreateSchema,
  memberUpdateSchema,
  money,
  optionalPhMobile,
  optionalText,
  paymentCorrectionSchema,
  paymentCreateSchema,
  phMobile,
  planSchema,
  renewalSchema,
  stockMovementSchema,
  suspendSchema,
  uuid,
  walkinVisitCreateSchema,
} from '../src/index.js';

const ID = '3f1c2b9e-8a4d-4c6e-9b1a-2d3e4f5a6b7c';

/** First problem reported for `input`: { path: 'payment.amount', message: '…' }, or null if valid. */
function firstIssue(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return null;
  const issue = result.error.issues[0];
  return { path: issue.path.join('.'), message: issue.message };
}
const messageFor = (schema, input) => firstIssue(schema, input)?.message ?? null;

/** A copy of `object` with one field left out, like a form field that was never filled in. */
function without(object, key) {
  const copy = { ...object };
  delete copy[key];
  return copy;
}

describe('money', () => {
  it('accepts numbers and number text', () => {
    expect(money.parse(1200)).toBe(1200);
    expect(money.parse('1200.50')).toBe(1200.5);
  });
  it('asks for an amount when it is missing or not a number', () => {
    expect(messageFor(money, undefined)).toBe('Amount is required');
    expect(messageFor(money, 'abc')).toBe('Amount is required');
  });
  it('rejects negative amounts and more than 2 decimals', () => {
    expect(messageFor(money, -5)).toBe('Amount cannot be negative');
    expect(messageFor(money, 10.555)).toBe('Use at most 2 decimals');
  });
});

describe('phone numbers', () => {
  it('normalises the accepted formats', () => {
    expect(phMobile.parse('+63 917 482 1130')).toBe('09174821130');
    expect(phMobile.parse('0917-482-1130')).toBe('09174821130');
    expect(phMobile.parse(' 09174821130 ')).toBe('09174821130');
  });
  it('treats an empty optional number as none', () => {
    expect(optionalPhMobile.parse('')).toBeNull();
    expect(optionalPhMobile.parse(null)).toBeNull();
    expect(optionalPhMobile.parse(undefined)).toBeNull();
    expect(optionalPhMobile.parse('0917 482 1130')).toBe('09174821130');
  });
  it('rejects a wrong optional number', () => {
    expect(optionalPhMobile.safeParse('12345').success).toBe(false);
  });
});

describe('optionalText', () => {
  const text = optionalText(5);
  it('trims, and turns empty or missing text into null', () => {
    expect(text.parse('  hi ')).toBe('hi');
    expect(text.parse('')).toBeNull();
    expect(text.parse(undefined)).toBeNull();
    expect(text.parse(null)).toBeNull();
  });
  it('enforces the maximum length', () => {
    expect(text.safeParse('too long').success).toBe(false);
  });
});

describe('isoDate and uuid', () => {
  it('accepts real calendar dates only', () => {
    expect(isoDate.parse('2026-11-09')).toBe('2026-11-09');
    expect(messageFor(isoDate, '2026-02-30')).toBe('Use a valid date (YYYY-MM-DD)');
    expect(messageFor(isoDate, '09 Nov 2026')).toBe('Use a valid date (YYYY-MM-DD)');
  });
  it('accepts database ids and rejects other text', () => {
    expect(uuid.parse(ID)).toBe(ID);
    expect(uuid.safeParse('not-an-id').success).toBe(false);
    expect(uuid.safeParse('').success).toBe(false);
  });
});

describe('memberCreateSchema', () => {
  const valid = {
    fullName: 'Carlo Tan',
    contactNumber: '0917 882 4410',
    planId: ID,
    startDate: '2026-11-09',
    payment: { paymentMethodCode: 'cash', amount: 1200 },
  };
  it('cleans up a valid member', () => {
    const r = memberCreateSchema.parse({
      ...valid,
      fullName: '  Carlo Tan ',
      email: ' carlo@example.com ',
    });
    expect(r.fullName).toBe('Carlo Tan');
    expect(r.email).toBe('carlo@example.com');
    expect(r.address).toBeNull();
    expect(r.payment).toMatchObject({ paymentMethodCode: 'cash', amount: 1200, referenceNo: null });
    expect(r.walkinCustomerId ?? null).toBeNull();
  });
  it('treats a missing or empty email as none', () => {
    expect(memberCreateSchema.parse(valid).email).toBeNull();
    expect(memberCreateSchema.parse({ ...valid, email: '' }).email).toBeNull();
  });
  it('gives friendly messages', () => {
    expect(firstIssue(memberCreateSchema, { ...valid, email: 'not-an-email' })).toEqual({
      path: 'email',
      message: 'Enter a valid email',
    });
    expect(firstIssue(memberCreateSchema, { ...valid, fullName: 'C' })).toEqual({
      path: 'fullName',
      message: 'Full name is required',
    });
    expect(
      firstIssue(memberCreateSchema, {
        ...valid,
        payment: { paymentMethodCode: '', amount: 1200 },
      }),
    ).toEqual({
      path: 'payment.paymentMethodCode',
      message: 'Choose a payment method',
    });
    expect(
      firstIssue(memberCreateSchema, { ...valid, payment: { paymentMethodCode: 'cash' } }),
    ).toEqual({
      path: 'payment.amount',
      message: 'Amount is required',
    });
  });
  it('requires the name, plan and start date', () => {
    for (const field of ['fullName', 'contactNumber', 'planId', 'startDate']) {
      const rest = without(valid, field);
      expect(firstIssue(memberCreateSchema, rest)).toEqual({ path: field, message: 'Required' });
    }
  });
  it('says "Required" for a blank field, but a custom message on a schema still wins', () => {
    expect(messageFor(memberCreateSchema, { ...valid, fullName: null })).toBe('Required');
    expect(messageFor(money, undefined)).toBe('Amount is required');
  });
  it('links a converted walk-in', () => {
    expect(memberCreateSchema.parse({ ...valid, walkinCustomerId: ID }).walkinCustomerId).toBe(ID);
    expect(
      memberCreateSchema.parse({ ...valid, walkinCustomerId: null }).walkinCustomerId,
    ).toBeNull();
  });
});

describe('memberUpdateSchema, renewalSchema, suspendSchema', () => {
  it('lets a profile update change only some fields', () => {
    expect(memberUpdateSchema.safeParse({}).success).toBe(true);
    expect(memberUpdateSchema.parse({ contactNumber: '0917 882 4410' }).contactNumber).toBe(
      '09178824410',
    );
    expect(messageFor(memberUpdateSchema, { contactNumber: '123' })).toBe(
      'Enter 11 digits, like 0917 123 4567',
    );
  });
  it('validates a renewal', () => {
    const renewal = {
      memberId: ID,
      planId: ID,
      startDate: '2026-12-09',
      payment: { paymentMethodCode: 'gcash', amount: '1200', referenceNo: ' 12345 ' },
    };
    expect(renewalSchema.parse(renewal).payment).toMatchObject({
      amount: 1200,
      referenceNo: '12345',
    });
    expect(firstIssue(renewalSchema, { ...renewal, memberId: 'x' })?.path).toBe('memberId');
  });
  it('needs a reason to suspend', () => {
    expect(suspendSchema.parse({ reason: ' Unpaid balance ' }).reason).toBe('Unpaid balance');
    expect(messageFor(suspendSchema, { reason: 'x' })).toBe('Give a reason');
  });
});

describe('planSchema', () => {
  it('fills in defaults and converts number text', () => {
    expect(planSchema.parse({ name: 'Monthly', durationMonths: '1', price: '1200' })).toEqual({
      name: 'Monthly',
      durationMonths: 1,
      durationDays: 0,
      price: 1200,
      description: null,
      isActive: true,
    });
  });
  it('needs a duration and a name', () => {
    expect(firstIssue(planSchema, { name: 'Day Pass', price: 100 })).toEqual({
      path: 'durationMonths',
      message: 'Set a duration in months or days',
    });
    expect(messageFor(planSchema, { name: 'M', durationDays: 30, price: 100 })).toBe(
      'Plan name is required',
    );
  });
  it('rejects part months and out-of-range durations', () => {
    expect(planSchema.safeParse({ name: 'Odd', durationMonths: 1.5, price: 100 }).success).toBe(
      false,
    );
    expect(planSchema.safeParse({ name: 'Long', durationMonths: 37, price: 100 }).success).toBe(
      false,
    );
  });
});

describe('walkinVisitCreateSchema', () => {
  const valid = { customerName: 'Ella Bautista', fee: 100, paymentMethodCode: 'cash' };
  it('defaults to the regular rate and cleans up the contact number', () => {
    const r = walkinVisitCreateSchema.parse({ ...valid, contactNumber: '0917 482 1130' });
    expect(r).toMatchObject({
      feeType: 'regular',
      contactNumber: '09174821130',
      referenceNo: null,
    });
  });
  it('accepts the student rate but no other', () => {
    expect(walkinVisitCreateSchema.parse({ ...valid, feeType: 'student' }).feeType).toBe('student');
    expect(firstIssue(walkinVisitCreateSchema, { ...valid, feeType: 'vip' })?.path).toBe('feeType');
  });
  it('needs a payment choice (null means pay later) and a name', () => {
    const noChoice = without(valid, 'paymentMethodCode');
    expect(firstIssue(walkinVisitCreateSchema, noChoice)?.path).toBe('paymentMethodCode');
    expect(messageFor(walkinVisitCreateSchema, { ...valid, customerName: 'E' })).toBe(
      'Enter the customer’s name',
    );
  });
});

describe('paymentCreateSchema and paymentCorrectionSchema', () => {
  const valid = {
    type: 'membership_renewal',
    memberId: ID,
    description: 'Monthly renewal',
    amount: 1200,
    paymentMethodCode: 'cash',
  };
  it('accepts a member payment and a product sale with no person', () => {
    expect(paymentCreateSchema.parse(valid)).toMatchObject({ amount: 1200, referenceNo: null });
    const sale = without(valid, 'memberId');
    expect(paymentCreateSchema.safeParse({ ...sale, type: 'product' }).success).toBe(true);
  });
  it('gives friendly messages', () => {
    expect(messageFor(paymentCreateSchema, { ...valid, amount: 0 })).toBe(
      'Amount must be more than ₱0',
    );
    expect(messageFor(paymentCreateSchema, { ...valid, paymentMethodCode: '' })).toBe(
      'Choose a payment method',
    );
    const unlinked = without(valid, 'memberId');
    expect(firstIssue(paymentCreateSchema, unlinked)).toEqual({
      path: 'memberId',
      message: 'Link the payment to a member or walk-in visit',
    });
  });
  it('rejects an unknown payment type', () => {
    expect(firstIssue(paymentCreateSchema, { ...valid, type: 'donation' })?.path).toBe('type');
  });
  it('only allows void or refund, with a reason', () => {
    expect(paymentCorrectionSchema.parse({ action: 'void', reason: 'Entered twice' }).action).toBe(
      'void',
    );
    expect(
      firstIssue(paymentCorrectionSchema, { action: 'delete', reason: 'Entered twice' })?.path,
    ).toBe('action');
    expect(messageFor(paymentCorrectionSchema, { action: 'refund', reason: 'no' })).toBe(
      'Give a reason',
    );
  });
});

describe('inventoryItemSchema and stockMovementSchema', () => {
  const item = { name: 'Bottled Water 500ml', category: 'Drinks and Beverages', costPrice: 9.5 };
  it('fills in defaults for an item', () => {
    const r = inventoryItemSchema.parse(item);
    expect(r).toMatchObject({ unit: 'pcs', reorderLevel: 0, costPrice: 9.5 });
    expect(r.sellingPrice ?? null).toBeNull();
    expect(inventoryItemSchema.parse({ ...item, sellingPrice: null }).sellingPrice).toBeNull();
    expect(
      inventoryItemSchema.parse({ ...item, sellingPrice: '20', reorderLevel: '24' }),
    ).toMatchObject({
      sellingPrice: 20,
      reorderLevel: 24,
    });
  });
  it('rejects a bad item', () => {
    expect(messageFor(inventoryItemSchema, { ...item, name: 'W' })).toBe('Item name is required');
    expect(firstIssue(inventoryItemSchema, { ...item, category: 'Equipment' })?.path).toBe(
      'category',
    );
    expect(firstIssue(inventoryItemSchema, { ...item, reorderLevel: -1 })?.path).toBe(
      'reorderLevel',
    );
  });

  const movement = { itemId: ID, type: 'delivery', quantity: '5', movementDate: '2026-11-09' };
  it('accepts a stock movement and converts the quantity', () => {
    expect(stockMovementSchema.parse(movement)).toMatchObject({ quantity: 5, remarks: null });
  });
  it('rejects zero, part and unknown movements', () => {
    expect(messageFor(stockMovementSchema, { ...movement, quantity: 0 })).toBe(
      'Quantity must be at least 1',
    );
    expect(firstIssue(stockMovementSchema, { ...movement, quantity: 2.5 })?.path).toBe('quantity');
    expect(firstIssue(stockMovementSchema, { ...movement, type: 'stolen' })?.path).toBe('type');
    expect(messageFor(stockMovementSchema, { ...movement, movementDate: '2026-13-01' })).toBe(
      'Use a valid date (YYYY-MM-DD)',
    );
  });
});
