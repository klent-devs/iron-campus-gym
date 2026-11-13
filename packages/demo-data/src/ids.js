/**
 * IDs for sample records. They look like real UUIDs so the shared zod schemas accept them.
 * Seeded records get repeatable IDs; records added by staff get random ones.
 */

const hex = (n, width) => n.toString(16).padStart(width, '0');

/** Repeatable UUID for seeded record number `n` of kind `kind` (0–255). */
export function seedId(kind, n) {
  return `00000000-${hex(kind, 4)}-4000-8000-${hex(n, 12)}`;
}

function randomHex(bytes) {
  const out = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(out);
  return [...out].map((b) => hex(b, 2)).join('');
}

/** A new random UUID (v4). */
export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const h = randomHex(16);
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/**
 * QR token: 24 random characters (letters, digits, _ and -). Never personal data.
 * Pass `rand` for a repeatable token (seed), otherwise it uses the browser's secure random.
 */
export function qrToken(rand) {
  let bytes;
  if (rand) bytes = Array.from({ length: 24 }, () => Math.floor(rand() * 256));
  else {
    bytes = new Uint8Array(24);
    globalThis.crypto.getRandomValues(bytes);
  }
  return [...bytes].map((b) => TOKEN_CHARS[b % 64]).join('');
}

/** Short password for a new member's app login, e.g. "iron-4821". */
export function tempPassword(rand = Math.random) {
  return `iron-${String(1000 + Math.floor(rand() * 9000))}`;
}
