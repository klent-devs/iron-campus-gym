/**
 * Read-only views of the sample data that the screens need: each member's status, payment rows
 * with their labels, walk-in visits with their payment status, stock status, and so on.
 * Results are cached per data version (the state object), so calling them on every render is cheap.
 */
import {
  MEMBERSHIP_STATUS,
  MEMBERSHIP_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
  STOCK_STATUS_LABELS,
  daysBetween,
  membershipStatus,
  stockStatus,
} from '@icg/shared';

const cache = new WeakMap();

/** Cache `build()` for this state object under `key`. */
export function memo(state, key, build) {
  let entry = cache.get(state);
  if (!entry) cache.set(state, (entry = new Map()));
  if (!entry.has(key)) entry.set(key, build());
  return entry.get(key);
}

const group = (list, key) => {
  const map = new Map();
  for (const x of list) {
    const k = x[key];
    if (k === null || k === undefined) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(x);
  }
  return map;
};
const byId = (list) => new Map(list.map((x) => [x.id, x]));

/** Lookups by ID and lists grouped by member / customer / item. */
export function indexes(state) {
  return memo(state, 'indexes', () => ({
    plan: byId(state.plans),
    member: byId(state.members),
    staff: byId(state.staff),
    customer: byId(state.customers),
    visit: byId(state.visits),
    item: byId(state.items),
    payment: byId(state.payments),
    sub: byId(state.subscriptions),
    subsByMember: group(
      [...state.subscriptions]
        .filter((s) => s.status !== 'cancelled')
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
      'memberId',
    ),
    paymentsByMember: group(state.payments, 'memberId'),
    checkInsByMember: group(state.checkIns, 'memberId'),
    visitsByCustomer: group(state.visits, 'customerId'),
    movementsByItem: group(state.movements, 'itemId'),
  }));
}

const MANILA_OFFSET_MS = 8 * 3_600_000; // UTC+8 all year (no daylight saving)

/**
 * Gym (Manila) date of a timestamp, 'YYYY-MM-DD'. Same answer as `todayInGym`, but much faster
 * (it runs for thousands of records), because Manila has no daylight saving time.
 */
export const dayOf = (timestamp) =>
  new Date(Date.parse(timestamp) + MANILA_OFFSET_MS).toISOString().slice(0, 10);

/** "Marco V." */
export const shortName = (name = '') => {
  const [first, ...rest] = name.split(' ');
  return rest.length ? `${first} ${rest.at(-1)[0]}.` : first;
};

/** 'EB' for Ella Bautista. */
export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function methodName(state, code) {
  if (!code) return '—';
  return state.paymentMethods.find((m) => m.code === code)?.name ?? code;
}

export function staffName(state, staffId) {
  return indexes(state).staff.get(staffId)?.name ?? 'Staff';
}

// ── Members ──────────────────────────────────────────────────────────────────────────────

/**
 * A member with their current plan, dates and status (shared `membershipStatus` rules).
 * - `endDate` is the end of the last paid period (renewals continue the chain).
 * - `balance` is money they still owe (pending payments with no method yet).
 */
export function memberInfo(state, member, today) {
  const ix = indexes(state);
  const subs = ix.subsByMember.get(member.id) ?? [];
  const current = subs.find((s) => s.startDate <= today && s.endDate >= today) ?? null;
  const latest = subs.at(-1) ?? null;
  const shown = current ?? latest;
  const endDate = subs.reduce((max, s) => (s.endDate > max ? s.endDate : max), '') || null;
  const status = membershipStatus({ endDate, suspended: member.suspended, today });
  const balance = (ix.paymentsByMember.get(member.id) ?? [])
    .filter((p) => p.status === 'pending' && !p.method)
    .reduce((s, p) => s + p.amount, 0);
  return {
    ...member,
    plan: shown?.planName ?? '—',
    planId: shown?.planId ?? null,
    startDate: shown?.startDate ?? null,
    periodEnd: shown?.endDate ?? null,
    endDate,
    status,
    statusLabel: MEMBERSHIP_STATUS_LABELS[status],
    daysLeft: endDate ? daysBetween(today, endDate) : null,
    balance,
    current,
    latest,
    upcoming: subs.filter((s) => s.startDate > today),
  };
}

/** Every member with `memberInfo`, newest Member ID first. */
export function membersView(state, today) {
  return memo(state, `members:${today}`, () =>
    state.members
      .map((m) => memberInfo(state, m, today))
      .sort((a, b) => b.memberSince.localeCompare(a.memberSince) || b.code.localeCompare(a.code)),
  );
}

export function memberView(state, memberId, today) {
  return membersView(state, today).find((m) => m.id === memberId) ?? null;
}

/** Badge colour for each membership status. */
export const STATUS_TONE = Object.freeze({
  [MEMBERSHIP_STATUS.ACTIVE]: 'ok',
  [MEMBERSHIP_STATUS.EXPIRING_SOON]: 'warn',
  [MEMBERSHIP_STATUS.EXPIRED]: 'bad',
  [MEMBERSHIP_STATUS.SUSPENDED]: 'mute',
  [MEMBERSHIP_STATUS.PENDING]: 'mute',
});

/** Search by name, Member ID or mobile number (with or without spaces). */
export function memberMatches(member, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (member.name.toLowerCase().includes(q) || member.code.toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D/g, '');
  return digits.length >= 3 && Boolean(member.phone?.includes(digits));
}

/** All periods of a member, newest first (cancelled ones too, marked). */
export function memberPeriods(state, memberId) {
  return state.subscriptions
    .filter((s) => s.memberId === memberId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

// ── Payments ─────────────────────────────────────────────────────────────────────────────

/** What a payment row shows: labels, the customer's ID, who changed it and why. */
export function paymentInfo(state, p) {
  const ix = indexes(state);
  const member = p.memberId ? ix.member.get(p.memberId) : null;
  const visit = p.walkinVisitId ? ix.visit.get(p.walkinVisitId) : null;
  const customer = visit ? ix.customer.get(visit.customerId) : null;
  let typeLabel = PAYMENT_TYPE_LABELS[p.type];
  if (p.type === 'product' && p.items?.length === 1) typeLabel = `Product · ${p.items[0].name}`;
  let note = p.note ?? '';
  if (p.correction) {
    const who = shortName(staffName(state, p.correction.by));
    note = `${p.correction.action === 'void' ? 'Voided' : 'Refunded'} by ${who} · ${p.correction.reason.toLowerCase()}`;
  } else if (!note && p.type === 'walkin') note = 'Walk-in';
  else if (!note && p.type === 'membership_new' && member?.walkinCustomerId)
    note = 'Converted from walk-in';
  return {
    ...p,
    typeLabel,
    statusLabel: PAYMENT_STATUS_LABELS[p.status],
    methodLabel: methodName(state, p.method),
    staffName: staffName(state, p.staffId),
    customerId: member?.code ?? (visit ? 'Walk-in' : null),
    phone: member?.phone ?? customer?.phone ?? null,
    note,
    member,
    visit,
  };
}

/** Payments newest first, with `paymentInfo`. */
export function paymentsView(state) {
  return memo(state, 'payments', () =>
    [...state.payments].sort((a, b) => b.at.localeCompare(a.at)).map((p) => paymentInfo(state, p)),
  );
}

export const PAYMENT_TONE = Object.freeze({
  paid: 'ok',
  pending: 'warn',
  voided: 'bad',
  refunded: 'mute',
});

// ── Walk-ins ─────────────────────────────────────────────────────────────────────────────

/** Visit payment state for the walk-in screens: paid | unpaid | refunded. */
const VISIT_PAYMENT = { paid: 'paid', pending: 'unpaid', voided: 'unpaid', refunded: 'refunded' };

/** `{ customers, visits }` in the shape the walk-in pages use (features/walkins/demoData.js). */
export function walkinView(state) {
  return memo(state, 'walkins', () => {
    const ix = indexes(state);
    return {
      customers: state.customers,
      visits: [...state.visits]
        .sort((a, b) => b.timeIn.localeCompare(a.timeIn))
        .map((v) => {
          const p = ix.payment.get(v.paymentId);
          const paymentStatus = VISIT_PAYMENT[p?.status ?? 'pending'];
          return {
            ...v,
            paymentStatus,
            paymentMethod: paymentStatus === 'unpaid' ? null : (p?.method ?? null),
            txnNo: p?.txnNo ?? null,
          };
        }),
    };
  });
}

// ── Attendance ───────────────────────────────────────────────────────────────────────────

/** `{ members, checkIns, rejections }` in the shape the attendance pages use. */
export function attendanceView(state, today) {
  return memo(state, `attendance:${today}`, () => ({
    members: membersView(state, today).map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      plan: m.plan,
      endDate: m.endDate,
      suspended: m.suspended,
      suspendedOn: m.suspendedOn,
      suspendReason: m.suspendReason,
      balance: m.balance,
      qrToken: m.qrToken,
    })),
    checkIns: [...state.checkIns].sort((a, b) => b.timeIn.localeCompare(a.timeIn)),
    rejections: state.rejections,
  }));
}

// ── Inventory ────────────────────────────────────────────────────────────────────────────

export const STOCK_TONE = Object.freeze({ in_stock: 'ok', low_stock: 'low', out_of_stock: 'bad' });

export function itemsView(state) {
  return memo(state, 'items', () =>
    state.items.map((item) => {
      const status = stockStatus(item.quantity, item.reorderLevel);
      return {
        ...item,
        status,
        statusLabel: STOCK_STATUS_LABELS[status],
        tone: STOCK_TONE[status],
      };
    }),
  );
}

/** Stock movements of one item, newest first. */
export function itemHistory(state, itemId) {
  return [...(indexes(state).movementsByItem.get(itemId) ?? [])].sort((a, b) =>
    b.at.localeCompare(a.at),
  );
}

// ── Staff ────────────────────────────────────────────────────────────────────────────────

/** Audit history newest first, with the staff member's name. */
export function auditView(state) {
  return memo(state, 'audit', () =>
    [...state.auditLogs]
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((a) => ({ ...a, staffName: staffName(state, a.staffId) })),
  );
}
