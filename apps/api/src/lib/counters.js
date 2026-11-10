import { formatMemberCode, formatTransactionNo } from '@icg/shared';

/**
 * Atomically increments a named counter and returns the new value.
 * Safe when two receptionists save at the same moment.
 * @param {import('knex').Knex | import('knex').Knex.Transaction} db
 */
export async function nextCounterValue(db, key) {
  const { rows } = await db.raw(
    `INSERT INTO counters (key, value) VALUES (?, 1)
     ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
     RETURNING value`,
    [key],
  );
  return rows[0].value;
}

/** Next Member ID for the given year, e.g. ICG-2026-0643. */
export async function nextMemberCode(db, year) {
  return formatMemberCode(year, await nextCounterValue(db, `member:${year}`));
}

/** Next transaction number for the given month, e.g. TXN-2026-11-0391. */
export async function nextTransactionNo(db, year, month) {
  const key = `txn:${year}-${String(month).padStart(2, '0')}`;
  return formatTransactionNo(year, month, await nextCounterValue(db, key));
}
