import { z } from 'zod';
import { PAYMENT_TYPE_LIST } from '../constants/paymentStatus.js';
import { money, optionalText, uuid } from './common.js';

export const paymentCreateSchema = z
  .object({
    type: z.enum(PAYMENT_TYPE_LIST),
    memberId: uuid.optional().nullable(),
    walkinVisitId: uuid.optional().nullable(),
    description: z.string().trim().min(2).max(160),
    amount: money.refine((v) => v > 0, 'Amount must be more than ₱0'),
    paymentMethodCode: z.string().min(1, 'Choose a payment method'),
    referenceNo: optionalText(64),
  })
  .refine((p) => p.memberId || p.walkinVisitId || p.type === 'product', {
    message: 'Link the payment to a member or walk-in visit',
    path: ['memberId'],
  });

/** Void or refund: owner only, reason required, history kept. */
export const paymentCorrectionSchema = z.object({
  action: z.enum(['void', 'refund']),
  reason: z.string().trim().min(3, 'Give a reason').max(255),
});
