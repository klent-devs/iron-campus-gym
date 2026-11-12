/**
 * Walk-ins — SAMPLE DATA AND SCREEN LOGIC, NOT CONNECTED TO THE DATABASE YET.
 * Everything here lives in the browser and is lost on reload.
 *
 * TODO(api): when the walk-in API is built (milestone 5), load visits/customers from it and send
 * Register / Record Payment / Complete Visit to it. The filtering, counting and wording helpers
 * below can stay as they are: they only need visits and customers in the same shape.
 *
 * Shapes:
 *   customer: { id, name, phone: '09171234567' | null }
 *   visit:    { id, customerId, feeType: 'regular'|'student', fee, timeIn, timeOut: ISO|null,
 *               paymentStatus: 'paid'|'unpaid'|'refunded', paymentMethod: 'cash'|'gcash'|null }
 */
import { DEFAULT_PAYMENT_METHODS, addDays, formatPeso, todayInGym } from '@icg/shared';

/** Day-pass prices. TODO(api): read from gym settings (the owner sets them in Settings). */
export const DEMO_FEES = Object.freeze({ regular: 100, student: 80 });
/** Monthly plan price, for the "make them a member" hint. TODO(api): read from plans. */
export const DEMO_MONTHLY_PLAN_PRICE = 1200;

export const FEE_TYPE_LABELS = Object.freeze({ regular: 'Regular', student: 'Student' });

/** Walk-ins can pay with these (the design shows Cash and GCash). */
export const WALKIN_PAYMENT_METHODS = DEFAULT_PAYMENT_METHODS.filter((m) =>
  ['cash', 'gcash'].includes(m.code),
).map(({ code, name }) => ({ code, name }));

const METHOD_NAMES = Object.fromEntries(DEFAULT_PAYMENT_METHODS.map((m) => [m.code, m.name]));
export const methodName = (code) => METHOD_NAMES[code] ?? code;

export const DATE_RANGES = Object.freeze({
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This week',
  month: 'This month',
});

export const STATUS_FILTERS = Object.freeze(['All', 'Inside', 'Completed', 'Unpaid']);

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

/** Gym (Manila) date of a visit, 'YYYY-MM-DD'. */
export const visitDate = (visit) => todayInGym(new Date(visit.timeIn));

const isInside = (v) => !v.timeOut;
const isUnpaid = (v) => v.paymentStatus === 'unpaid';

/** First and last date (inclusive) for a date filter. Weeks start on Monday. */
export function dateRange(key, today) {
  if (key === 'yesterday') return { from: addDays(today, -1), to: addDays(today, -1) };
  if (key === 'week') {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
    return { from: addDays(today, -((weekday + 6) % 7)), to: today };
  }
  if (key === 'month') return { from: `${today.slice(0, 8)}01`, to: today };
  return { from: today, to: today };
}

export function visitsInRange(visits, key, today) {
  const { from, to } = dateRange(key, today);
  return visits.filter((v) => {
    const d = visitDate(v);
    return d >= from && d <= to;
  });
}

export function matchesStatus(visit, status) {
  if (status === 'Inside') return isInside(visit);
  if (status === 'Completed') return !isInside(visit);
  if (status === 'Unpaid') return isUnpaid(visit);
  return true;
}

export function countByStatus(visits) {
  return Object.fromEntries(
    STATUS_FILTERS.map((s) => [s, visits.filter((v) => matchesStatus(v, s)).length]),
  );
}

/** Search by name, or by contact number with or without spaces. */
export function matchesSearch(customer, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (customer?.name.toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D/g, '');
  return Boolean(digits && customer?.phone?.includes(digits));
}

/** Numbers for the summary boxes and the table footer. */
export function summarize(visits) {
  const paid = visits.filter((v) => v.paymentStatus === 'paid');
  const unpaid = visits.filter(isUnpaid);
  return {
    total: visits.length,
    inside: visits.filter(isInside).length,
    collected: paid.reduce((sum, v) => sum + v.fee, 0),
    unpaidCount: unpaid.length,
    unpaidAmount: unpaid.reduce((sum, v) => sum + v.fee, 0),
  };
}

export function paymentLabel(visit) {
  if (visit.paymentStatus === 'unpaid') return { text: 'Unpaid', tone: 'bad' };
  if (visit.paymentStatus === 'refunded') return { text: 'Refunded', tone: 'mute' };
  return { text: `Paid · ${methodName(visit.paymentMethod)}`, tone: 'ok' };
}

const ordinal = (n) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
};

/** "Regular", or "Regular · 4th visit this month" from the second visit in a month. */
export function visitMeta(visit, visits) {
  const month = visitDate(visit).slice(0, 7);
  const sameMonth = visits
    .filter((v) => v.customerId === visit.customerId && visitDate(v).slice(0, 7) === month)
    .sort((a, b) => a.timeIn.localeCompare(b.timeIn));
  const n = sameMonth.findIndex((v) => v.id === visit.id) + 1;
  const label = FEE_TYPE_LABELS[visit.feeType];
  return n >= 2 ? `${label} · ${ordinal(n)} visit this month` : label;
}

/** "0917 330 1182", or "—" when there is no number. */
export function formatPhone(phone) {
  if (!phone) return '—';
  return phone.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3');
}

/** Everything the View History panel shows for one customer. */
export function customerHistory(customer, visits, today) {
  const own = visits
    .filter((v) => v.customerId === customer.id)
    .sort((a, b) => b.timeIn.localeCompare(a.timeIn));
  const month = today.slice(0, 7);
  const thisMonth = own.filter((v) => visitDate(v).slice(0, 7) === month);
  const spent = thisMonth
    .filter((v) => v.paymentStatus === 'paid')
    .reduce((sum, v) => sum + v.fee, 0);
  const firstName = customer.name.split(' ')[0];
  const fee = DEMO_FEES.regular;
  const breakEven = Math.ceil(DEMO_MONTHLY_PLAN_PRICE / fee);
  const suggestion =
    thisMonth.length >= 4
      ? `${firstName} has spent ${formatPeso(spent)} this month. A Monthly plan ` +
        `(${formatPeso(DEMO_MONTHLY_PLAN_PRICE)}) pays off at ${breakEven} visits — worth ` +
        'offering if they train 3× a week.'
      : '';
  return {
    visits: own,
    monthCount: thisMonth.length,
    monthSpent: spent,
    firstVisit: own.length ? visitDate(own[own.length - 1]) : null,
    suggestion,
  };
}

/**
 * The customer this walk-in already is, so no duplicate person is made: same contact number, or
 * (when no number is given) the same name with no number on file.
 */
export function findExistingCustomer(customers, { name, phone }) {
  if (phone) return customers.find((c) => c.phone === phone) ?? null;
  const key = name.trim().toLowerCase();
  return customers.find((c) => !c.phone && c.name.toLowerCase() === key) ?? null;
}
