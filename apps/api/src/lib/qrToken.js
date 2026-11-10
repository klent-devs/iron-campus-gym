import { randomBytes } from 'node:crypto';
import { buildQrPayload, parseQrPayload } from '@icg/shared';

/** 32-character random token (192 bits). Contains no personal data. */
export function generateQrToken() {
  return randomBytes(24).toString('base64url');
}

/**
 * Gives a member a new QR token, revoking any current one.
 * Used at registration and when a phone is lost. Renewals do NOT call this.
 * @returns {Promise<{ token: string, payload: string }>}
 */
export async function issueQrToken(trx, memberId, reason = 'Reissued') {
  await trx('qr_tokens')
    .where({ member_id: memberId })
    .whereNull('revoked_at')
    .update({ revoked_at: trx.fn.now(), revoked_reason: reason });

  const token = generateQrToken();
  await trx('qr_tokens').insert({ member_id: memberId, token });
  return { token, payload: buildQrPayload(token) };
}

/**
 * Looks up the member for a scanned QR payload.
 * @returns {Promise<{ memberId: string } | { error: 'invalid' | 'revoked' }>}
 */
export async function resolveQrPayload(db, scannedText) {
  const token = parseQrPayload(scannedText);
  if (!token) return { error: 'invalid' };

  const row = await db('qr_tokens').where({ token }).first('member_id', 'revoked_at');
  if (!row) return { error: 'invalid' };
  if (row.revoked_at) return { error: 'revoked' };
  return { memberId: row.member_id };
}
