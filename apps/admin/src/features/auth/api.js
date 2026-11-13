/**
 * Staff sign-in, SAMPLE ONLY: checks the username/email and password against the sample staff
 * accounts (Settings → Staff Accounts) kept in this browser. Nothing is sent anywhere.
 *
 * TODO(auth): replace the body with the real sign-in (Supabase Auth, then the staff profile and
 * role from the API, with the offline session from docs/architecture.md). Keep the same shape:
 * resolve with the staff member, or throw an ApiError (from lib/apiClient.js) whose message can be
 * shown to staff as-is, e.g. "Wrong username or password." LoginPage needs no other change.
 *
 * @param {{ login: string, password: string, rememberMe: boolean }} credentials
 * @returns {Promise<{ name: string, role: 'owner' | 'receptionist' }>}
 */
import { actions } from '@icg/demo-data';
import { ApiError } from '../../lib/apiClient.js';
import { runAction, setSession } from '../../lib/demo.js';

export async function signIn({ login, password, rememberMe }) {
  await new Promise((resolve) => setTimeout(resolve, 600)); // lets staff see "Signing In…"
  try {
    const { staff } = runAction(actions.signIn, { identifier: login, password });
    setSession(staff.id, rememberMe);
    return { name: staff.name, role: staff.role };
  } catch (err) {
    throw new ApiError(err.message, { status: err.status ?? 400 });
  }
}

/** Sign out on this computer. TODO(auth): also sign out of Supabase. */
export function signOut() {
  setSession(null);
}
