/** Member ID shown on cards and receipts: ICG-2026-0643 */
export function formatMemberCode(year, sequence) {
  return `ICG-${year}-${String(sequence).padStart(4, '0')}`;
}

export const MEMBER_CODE_PATTERN = /^ICG-\d{4}-\d{4,}$/;

export function isMemberCode(value) {
  return typeof value === 'string' && MEMBER_CODE_PATTERN.test(value.trim().toUpperCase());
}

/** Transaction number: TXN-2026-11-0391 (sequence restarts every month). */
export function formatTransactionNo(year, month, sequence) {
  return `TXN-${year}-${String(month).padStart(2, '0')}-${String(sequence).padStart(4, '0')}`;
}

/** QR codes carry only an opaque token with this prefix — never personal data. */
export const QR_PREFIX = 'ICG:';

export function parseQrPayload(text) {
  if (typeof text !== 'string' || !text.startsWith(QR_PREFIX)) return null;
  const token = text.slice(QR_PREFIX.length).trim();
  return /^[A-Za-z0-9_-]{20,}$/.test(token) ? token : null;
}

export function buildQrPayload(token) {
  return `${QR_PREFIX}${token}`;
}
