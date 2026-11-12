/**
 * Staff sign-in, DEMO ONLY for now: any username/email and password is accepted after a short
 * pause, so the screen can be tried end to end. Nothing is checked and no session is created.
 *
 * TODO(auth): replace the body with the real sign-in (Supabase Auth, then the staff profile and
 * role from the API, with the offline session from docs/architecture.md). Keep the same shape:
 * resolve with the staff member, or throw an ApiError (from lib/apiClient.js) whose message can be
 * shown to staff as-is, e.g. "Wrong username or password." LoginPage needs no other change.
 *
 * @param {{ login: string, password: string, rememberMe: boolean }} credentials
 * @returns {Promise<{ name: string, role: 'owner' | 'receptionist' }>}
 */
export async function signIn({ login }) {
  await new Promise((resolve) => setTimeout(resolve, 600)); // lets staff see "Signing In…"
  return { name: login, role: 'owner' };
}
