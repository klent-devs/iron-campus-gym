import { z } from 'zod';
import { money, optionalText } from './common.js';

export const planSchema = z
  .object({
    name: z.string().trim().min(2, 'Plan name is required').max(60),
    durationMonths: z.coerce.number().int().min(0).max(36).default(0),
    durationDays: z.coerce.number().int().min(0).max(366).default(0),
    price: money,
    description: optionalText(255),
    isActive: z.boolean().default(true),
  })
  .refine((p) => p.durationMonths > 0 || p.durationDays > 0, {
    message: 'Set a duration in months or days',
    path: ['durationMonths'],
  });
