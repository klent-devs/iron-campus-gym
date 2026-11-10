/** An error with a message that is safe and helpful to show to front-desk staff. */
export class ApiError extends Error {
  constructor(message, { status = 0, offline = false, fields } = {}) {
    super(message);
    this.status = status;
    this.offline = offline;
    this.fields = fields;
  }
}

const SERVER_UNREACHABLE =
  "Can't reach the gym server. Make sure it is running (npm run dev), then try again.";

/**
 * GET /api/<path> and return the JSON body. Throws ApiError with a friendly message.
 * TODO(auth): send the Supabase session token once login is built.
 */
export async function apiGet(path, { signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(SERVER_UNREACHABLE, { offline: true });
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    // No JSON on a 5xx usually means the dev proxy couldn't reach the API at all.
    if (!body && res.status >= 500)
      throw new ApiError(SERVER_UNREACHABLE, { status: res.status, offline: true });
    throw new ApiError(body?.error ?? 'Something went wrong. Please try again.', {
      status: res.status,
      fields: body?.fields,
    });
  }
  return body;
}
