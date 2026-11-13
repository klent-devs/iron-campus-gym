/**
 * One gym day's records in a simple shape for reports and the dashboard chart.
 * - From the 1st of last month (`meta.historyStart`) they come from the sample data, so anything
 *   staff add shows up in the reports.
 * - Before that there is no sample data, so made-up but repeatable numbers fill the gap
 *   (`syntheticDay`), at about the same size, so year-long reports and the 12-month chart look real.
 *
 * Day shape: { checkIns: [{ name, hour, minutes|null, missed }],
 *              memberEvents: [{ kind: 'new'|'renewed'|'expired', name, plan }],
 *              walkins: [{ name, feeType, fee, paid, voided, becameMember }],
 *              movements: [{ item, qty, type }],
 *              payments: [{ txnNo, type: 'membership'|'walkin'|'product', amount, name, what,
 *                           method, status }] }
 */
import { addDays, formatTransactionNo, todayInGym } from '@icg/shared';
import { FIRST_NAMES, ITEM_SEED, LAST_NAMES, PLAN_SEED, SETTINGS_SEED } from './catalog.js';
import { around, pick, pickShare, seeded } from './random.js';
import { dayOf, indexes, memo, methodName } from './selectors.js';

const PLANS = PLAN_SEED.filter((p) => p.share > 0);
const METHODS = [
  { name: 'Cash', share: 0.55 },
  { name: 'GCash', share: 0.37 },
  { name: 'Bank Transfer', share: 0.08 },
];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => ({
  h,
  share: { 6: 0.1, 7: 0.09, 8: 0.07, 17: 0.12, 18: 0.15, 19: 0.11, 20: 0.06, 21: 0.02 }[h] ?? 0.035,
}));

const ROSTER = (() => {
  const rand = seeded('roster');
  return Array.from({ length: 300 }, () => ({
    name: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
    plan: pickShare(rand, PLANS).name,
  }));
})();

const syntheticCache = new Map();

/** Made-up records for a day before the sample data starts. Same date → same records. */
export function syntheticDay(date) {
  if (syntheticCache.has(date)) return syntheticCache.get(date);
  const rand = seeded(date);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const busy = weekday === 0 ? 0.75 : weekday === 6 ? 1.05 : 1;

  const checkIns = Array.from({ length: around(rand, 100 * busy) }, () => ({
    name: pick(rand, ROSTER).name,
    hour: pickShare(rand, HOURS).h,
    minutes: 55 + Math.round(rand() * 80),
    missed: false,
  }));
  const memberEvents = [];
  for (const [kind, mean] of [
    ['new', 0.9],
    ['renewed', 3.6],
    ['expired', 0.8],
  ]) {
    for (let i = around(rand, mean * busy); i > 0; i--) {
      const m = pick(rand, ROSTER);
      memberEvents.push({ kind, name: m.name, plan: m.plan });
    }
  }
  const fees = SETTINGS_SEED.walkinFees;
  const walkins = Array.from({ length: around(rand, 21 * busy) }, () => {
    const feeType = rand() < 0.72 ? 'regular' : 'student';
    return {
      name: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
      feeType,
      fee: fees[feeType],
      paid: true,
      voided: false,
      becameMember: rand() < 0.02,
    };
  });
  const movements = [];
  for (const item of ITEM_SEED) {
    const out = Math.round(rand() * (item.costPrice < 100 ? 3.2 : 0.35) * busy);
    if (out)
      movements.push({ item: item.name, qty: -out, type: item.sellingPrice ? 'sold' : 'used' });
    if (rand() < 0.08)
      movements.push({
        item: item.name,
        qty: Math.max(6, item.reorderLevel * 2),
        type: 'delivery',
      });
  }
  const [y, mo, d] = date.split('-').map(Number);
  const payments = [];
  const pay = (type, amount, name, what, methods = METHODS) => {
    payments.push({
      txnNo: formatTransactionNo(y, mo, (d - 1) * 45 + payments.length + 1),
      type,
      amount,
      name,
      what,
      method: pickShare(rand, methods).name,
      status: rand() < 0.01 ? (rand() < 0.5 ? 'voided' : 'refunded') : 'paid',
    });
  };
  for (const e of memberEvents) {
    if (e.kind !== 'expired')
      pay('membership', PLANS.find((p) => p.name === e.plan).price, e.name, e.plan);
  }
  for (const w of walkins) pay('walkin', w.fee, w.name, 'Walk-in', METHODS.slice(0, 2));
  payments.forEach((p, i) => {
    if (p.type === 'walkin' && p.status !== 'paid') {
      const w = walkins[i - (payments.length - walkins.length)];
      if (w) w.voided = true;
    }
  });
  for (const mv of movements) {
    if (mv.type !== 'sold') continue;
    const item = ITEM_SEED.find((x) => x.name === mv.item);
    pay(
      'product',
      item.sellingPrice * -mv.qty,
      'Counter sale',
      `${mv.item} × ${-mv.qty}`,
      METHODS.slice(0, 2),
    );
  }
  const result = { checkIns, memberEvents, walkins, movements, payments };
  syntheticCache.set(date, result);
  return result;
}

const PAYMENT_KIND = {
  membership_new: 'membership',
  membership_renewal: 'membership',
  walkin: 'walkin',
  product: 'product',
};

/** The sample data grouped by gym date (built once per data version). */
function byDate(state) {
  return memo(state, 'byDate', () => {
    const days = new Map();
    const day = (d) => {
      if (!days.has(d))
        days.set(d, { checkIns: [], visits: [], payments: [], movements: [], expired: [] });
      return days.get(d);
    };
    state.checkIns.forEach((c) => day(dayOf(c.timeIn)).checkIns.push(c));
    state.visits.forEach((v) => day(dayOf(v.timeIn)).visits.push(v));
    state.payments.forEach((p) => day(dayOf(p.at)).payments.push(p));
    state.movements.forEach((m) => day(m.date).movements.push(m));
    // A membership "expires" on the day after the end of its last period.
    for (const [memberId, subs] of indexes(state).subsByMember) {
      const last = subs.reduce((max, s) => (s.endDate > max ? s.endDate : max), '');
      if (last) day(addDays(last, 1)).expired.push(memberId);
    }
    return days;
  });
}

const HOUR = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Manila',
});
const EMPTY = { checkIns: [], visits: [], payments: [], movements: [], expired: [] };

/** Records of one day from the sample data. */
export function stateDay(state, date, now = new Date()) {
  const today = todayInGym(now);
  return memo(
    state,
    `day:${date}:${date === today ? Math.floor(now.getTime() / 60000) : ''}`,
    () => {
      const ix = indexes(state);
      const raw = byDate(state).get(date) ?? EMPTY;
      const nameOf = (memberId) => ix.member.get(memberId)?.name ?? 'Member';
      const lastVisit = new Map();
      for (const v of state.visits) {
        const prev = lastVisit.get(v.customerId);
        if (!prev || v.timeIn > prev.timeIn) lastVisit.set(v.customerId, v);
      }
      const checkIns = raw.checkIns.map((c) => ({
        name: nameOf(c.memberId),
        hour: Number(HOUR.format(new Date(c.timeIn))),
        minutes: c.timeOut ? Math.round((new Date(c.timeOut) - new Date(c.timeIn)) / 60000) : null,
        missed: !c.timeOut && date < today,
      }));
      const memberEvents = [];
      for (const p of raw.payments) {
        if (PAYMENT_KIND[p.type] !== 'membership' || !['paid', 'refunded'].includes(p.status))
          continue;
        const sub = p.subscriptionId ? ix.sub.get(p.subscriptionId) : null;
        memberEvents.push({
          kind: p.type === 'membership_new' ? 'new' : 'renewed',
          name: p.customerName,
          plan: sub?.planName ?? p.description.replace(/ membership$/, ''),
        });
      }
      if (date <= today) {
        for (const memberId of raw.expired) {
          const subs = ix.subsByMember.get(memberId) ?? [];
          memberEvents.push({
            kind: 'expired',
            name: nameOf(memberId),
            plan: subs.at(-1)?.planName ?? '—',
          });
        }
      }
      const walkins = raw.visits.map((v) => {
        const p = ix.payment.get(v.paymentId);
        const customer = ix.customer.get(v.customerId);
        return {
          name: customer?.name ?? 'Walk-in',
          feeType: v.feeType,
          fee: v.fee,
          paid: p?.status !== 'pending',
          voided: p?.status === 'voided' || p?.status === 'refunded',
          becameMember: Boolean(customer?.memberId) && lastVisit.get(v.customerId)?.id === v.id,
        };
      });
      const movements = raw.movements.map((m) => ({
        item: ix.item.get(m.itemId)?.name ?? 'Item',
        qty: m.quantity,
        type: m.type,
      }));
      const payments = raw.payments.map((p) => ({
        txnNo: p.txnNo,
        type: PAYMENT_KIND[p.type],
        amount: p.amount,
        name: p.customerName,
        what: p.description,
        method: methodName(state, p.method),
        status: p.status,
      }));
      return { checkIns, memberEvents, walkins, movements, payments };
    },
  );
}

/** Records of one day: sample data from `meta.historyStart`, made-up numbers before it. */
export function dayRecords(state, date, now = new Date()) {
  return date < state.meta.historyStart ? syntheticDay(date) : stateDay(state, date, now);
}

/** Paid money taken in a month ('YYYY-MM') up to `now`, for the dashboard chart. */
export function monthRevenue(state, month, now = new Date()) {
  const today = todayInGym(now);
  const { historyStart } = state.meta;
  let total = 0;
  for (
    let d = `${month}-01`;
    d.startsWith(month) && d <= today && d < historyStart;
    d = addDays(d, 1)
  ) {
    for (const p of syntheticDay(d).payments) if (p.status === 'paid') total += p.amount;
  }
  const days = byDate(state);
  for (let d = `${month}-01`; d.startsWith(month) && d <= today; d = addDays(d, 1)) {
    if (d < historyStart) continue;
    for (const p of days.get(d)?.payments ?? []) if (p.status === 'paid') total += p.amount;
  }
  return Math.round(total * 100) / 100;
}
