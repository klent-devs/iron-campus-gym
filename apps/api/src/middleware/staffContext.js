import { ROLES } from '@icg/shared';

/**
 * Sets `req.staff` = the staff member making the request.
 *
 * TODO(auth): Supabase Auth login is not built yet (milestone 2). Replace this with real
 * verification of the Supabase JWT (SUPABASE_JWT_SECRET) → staff_profiles row, and reject
 * requests without a valid session. Until then every request is treated as the owner, which is
 * only acceptable because the API listens on 127.0.0.1 (this PC only) — see API_HOST.
 */
export function staffContext(req, _res, next) {
  req.staff = { id: null, role: ROLES.OWNER, isPlaceholder: true };
  next();
}
