import { z } from 'zod';
import './messages.js';

/**
 * Staff sign-in form (docs/design/AdminLogin.dc.html).
 * `login` is a username ("joy.frontdesk") or an email; the API decides which.
 * The password is not trimmed: spaces may be part of it.
 */
export const staffLoginSchema = z.object({
  login: z
    .string({ error: 'Enter your username or email' })
    .trim()
    .min(1, 'Enter your username or email')
    .max(254, 'That username or email is too long'),
  password: z
    .string({ error: 'Enter your password' })
    .min(1, 'Enter your password')
    .max(128, 'That password is too long'),
  rememberMe: z.boolean().default(true),
});
