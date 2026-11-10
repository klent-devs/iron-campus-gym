import { z } from 'zod';
import { money, optionalPhMobile, optionalText, uuid } from './common.js';

/** Register Walk-in. Time in is set by the server when the visit is confirmed. */
export const walkinVisitCreateSchema = z.object({
  walkinCustomerId: uuid.optional().nullable(),
  customerName: z.string().trim().min(2, 'Enter the customer’s name').max(120),
  contactNumber: optionalPhMobile,
  fee: money,
  feeType: z.enum(['regular', 'student']).default('regular'),
  /** null = pay later (saved as unpaid) */
  paymentMethodCode: z.string().min(1).nullable(),
  referenceNo: optionalText(64),
});
