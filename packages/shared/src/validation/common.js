import { z } from 'zod';
import { isIsoDate } from '../utils/dates.js';

/** Accepts "0917 482 1130", "09174821130" or "+63 917 482 1130"; stores "09174821130". */
export const phMobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^\+63/, '0'))
  .refine((v) => /^09\d{9}$/.test(v), { message: 'Enter 11 digits, like 0917 123 4567' });

export const optionalPhMobile = z
  .union([z.literal(''), z.null(), z.undefined(), phMobile])
  .transform((v) => (v ? v : null));

export const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const isoDate = z.string().refine(isIsoDate, { message: 'Use a valid date (YYYY-MM-DD)' });

export const uuid = z.string().uuid();

/** Money in pesos with up to 2 decimals, e.g. 1200 or 1200.50 */
export const money = z.coerce
  .number({ invalid_type_error: 'Amount is required' })
  .nonnegative('Amount cannot be negative')
  .refine((v) => Math.round(v * 100) === v * 100, { message: 'Use at most 2 decimals' });
