/**
 * "Remember Me" on the sign-in page: keeps the staff member's username or email on this PC so it
 * is filled in next time. Only the username/email is kept, never the password.
 * Browser storage can be blocked or missing; then nothing is remembered and nothing breaks.
 */
export const REMEMBERED_LOGIN_KEY = 'icg.admin.rememberedLogin';

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The remembered username/email, or '' when there is none. */
export function readRememberedLogin(storage = defaultStorage()) {
  try {
    return storage?.getItem(REMEMBERED_LOGIN_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Save the username/email when Remember Me is ticked, forget it when it isn't. */
export function saveRememberedLogin(login, remember, storage = defaultStorage()) {
  try {
    if (remember && login) storage?.setItem(REMEMBERED_LOGIN_KEY, login);
    else storage?.removeItem(REMEMBERED_LOGIN_KEY);
  } catch {
    // Storage blocked (private window, full disk): sign-in still works, it just isn't remembered.
  }
}
