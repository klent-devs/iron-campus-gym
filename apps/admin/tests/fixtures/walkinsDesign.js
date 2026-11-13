/**
 * Walk-in visits from docs/design/WalkInRecords.dc.html, for testing the walk-in page helpers.
 * (The app itself uses the shared sample data in packages/demo-data.)
 */
import { DEMO_FEES } from '../../src/features/walkins/demoData.js';

const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;

/**
 * Sample walk-ins from docs/design/WalkInRecords.dc.html. Times are set back from `now` by the
 * same gaps as in the design (where it is 10:52 AM), so the screen looks right at any hour.
 */
export function createDemoData(now = new Date()) {
  const at = (minutesAgo) => new Date(now.getTime() - minutesAgo * MINUTE).toISOString();
  const customers = [
    { id: 'c1', name: 'Ella Bautista', phone: null },
    { id: 'c2', name: 'Kenji Ramos', phone: '09173301182' },
    { id: 'c3', name: 'Trisha Gomez', phone: '09951203381' },
    { id: 'c4', name: 'Nathan Lopez', phone: null },
    { id: 'c5', name: 'Lara Santos', phone: '09664102259' },
    { id: 'c6', name: 'Joanna Flores', phone: '09163305590' },
    { id: 'c7', name: 'Ryan Pascual', phone: '09190042287' },
    { id: 'c8', name: 'Mae Dizon', phone: null },
  ];
  const visit = (id, customerId, feeType, inAgo, outAgo, paymentMethod, status) => ({
    id,
    customerId,
    feeType,
    fee: DEMO_FEES[feeType],
    timeIn: at(inAgo),
    timeOut: outAgo === null ? null : at(outAgo),
    paymentStatus: status ?? (paymentMethod ? 'paid' : 'unpaid'),
    paymentMethod,
  });
  const visits = [
    visit('v1', 'c1', 'regular', 8, null, 'cash'),
    visit('v2', 'c2', 'regular', 50, null, 'cash'),
    visit('v3', 'c3', 'regular', 97, null, 'gcash'),
    visit('v4', 'c4', 'regular', 132, null, null),
    visit('v5', 'c5', 'student', 72, 22, 'gcash'),
    visit('v6', 'c6', 'regular', 202, 107, 'cash'),
    visit('v7', 'c7', 'regular', 237, 152, 'cash'),
    visit('v8', 'c8', 'student', 272, 191, 'cash', 'refunded'),
    // Ryan's earlier visits, so View History has something to show.
    visit('v9', 'c7', 'regular', 3 * DAY_MINUTES + 242, 3 * DAY_MINUTES + 167, 'cash'),
    visit('v10', 'c7', 'regular', 6 * DAY_MINUTES + 230, 6 * DAY_MINUTES + 141, 'gcash'),
    visit('v11', 'c7', 'regular', 8 * DAY_MINUTES + 157, 8 * DAY_MINUTES + 72, 'cash'),
  ];
  return { customers, visits };
}
