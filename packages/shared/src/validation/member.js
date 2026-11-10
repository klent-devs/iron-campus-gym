import { z } from 'zod';
import { isoDate, money, optionalText, phMobile, uuid } from './common.js';

export const paymentInput = z.object({
  paymentMethodCode: z.string().min(1, 'Choose a payment method'),
  amount: money,
  amountReceived: money.optional(),
  referenceNo: optionalText(64),
});

/** Add New Member form (admin). */
export const memberCreateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(120),
  contactNumber: phMobile,
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).optional().transform((v) => v || null),
  address: optionalText(255),
  planId: uuid,
  startDate: isoDate,
  payment: paymentInput,
  /** When converting a walk-in customer, link the existing record instead of duplicating. */
  walkinCustomerId: uuid.optional().nullable(),
});

export const memberUpdateSchema = memberCreateSchema
  .pick({ fullName: true, contactNumber: true, email: true, address: true })
  .partial();

/** Renewal wizard. */
export const renewalSchema = z.object({
  memberId: uuid,
  planId: uuid,
  startDate: isoDate,
  payment: paymentInput,
});

export const suspendSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason').max(255),
});
