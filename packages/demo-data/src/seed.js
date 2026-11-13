/**
 * Builds the starting sample data: about 300 members with their membership periods, payments,
 * check-ins, walk-ins, products and stock movements from the 1st of last month until now.
 * The people, times and amounts from the designs (docs/design/*.dc.html) are included so each
 * screen first opens looking like its design; everything else is made-up but repeatable.
 *
 * Shapes are listed in docs/demo-data.md.
 */
import {
  INVENTORY_CATEGORIES,
  addDays,
  addMonths,
  computeEndDate,
  formatTransactionNo,
  gymTimeParts,
  todayInGym,
} from '@icg/shared';
import {
  BARANGAYS,
  FIRST_NAMES,
  ITEM_SEED,
  KIND,
  LAST_NAMES,
  PAYMENT_METHOD_SEED,
  PLAN_SEED,
  SETTINGS_SEED,
  STAFF_IDS,
  STAFF_SEED,
} from './catalog.js';
import { qrToken, seedId } from './ids.js';
import { around, between, pick, pickShare, seeded } from './random.js';

/** Bump when the shape changes: browsers holding an older copy start again from a fresh seed. */
export const DATA_VERSION = 4;

const MINUTE = 60_000;

/** Gym date + minutes after midnight (Manila, UTC+8 all year) → ISO timestamp. */
export const gymTimestamp = (date, minutes) =>
  new Date(new Date(`${date}T00:00:00+08:00`).getTime() + minutes * MINUTE).toISOString();

// Arrival times: busy early morning and after work.
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => ({
  h,
  share: { 6: 0.1, 7: 0.09, 8: 0.07, 17: 0.12, 18: 0.15, 19: 0.11, 20: 0.06, 21: 0.02 }[h] ?? 0.035,
}));
const busyness = (date) => {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return weekday === 0 ? 0.75 : weekday === 6 ? 1.05 : 1;
};
const phoneFrom = (rand) =>
  `09${pick(rand, ['17', '18', '19', '20', '21', '27', '28', '38', '45', '56', '66', '77', '95', '98'])}${String(between(rand, 0, 9999999)).padStart(7, '0')}`;
const gcashRef = (rand) => String(between(rand, 1e12, 9.99e12 - 1)).slice(0, 13);

/**
 * The people from the designs. `left` = days left on the current period (negative = expired that
 * many days ago); `started` = days ago the current period started (instead of `left`).
 */
const DESIGN_MEMBERS = [
  {
    key: 'andrea',
    code: 'ICG-2025-0291',
    name: 'Andrea Lim',
    phone: '09053379021',
    email: 'andrea.lim@gmail.com',
    address: 'Sampaloc, Manila',
    since: '2025-02-04',
    plan: 'Monthly',
    started: 0,
    portalPassword: 'andrea2026',
    history: ['Monthly', 'Monthly', 'Quarterly'],
  },
  {
    key: 'paolo',
    code: 'ICG-2025-0318',
    name: 'Paolo Reyes',
    phone: '09982145567',
    plan: 'Quarterly',
    left: 3,
  },
  {
    key: 'bianca',
    code: 'ICG-2025-0402',
    name: 'Bianca Santos',
    phone: '09195520083',
    plan: 'Student Monthly',
    left: 1,
  },
  {
    key: 'miguel',
    code: 'ICG-2024-0107',
    name: 'Miguel Ramos',
    phone: '09278804412',
    plan: 'Annual',
    left: 125,
  },
  {
    key: 'trisha',
    code: 'ICG-2026-0611',
    name: 'Trisha Navarro',
    phone: '09157743390',
    plan: 'Student Monthly',
    left: 19,
  },
  {
    key: 'daniel',
    code: 'ICG-2026-0588',
    name: 'Daniel Cruz',
    phone: '09214458810',
    plan: 'Monthly',
    left: 17,
  },
  {
    key: 'kyla',
    code: 'ICG-2026-0642',
    name: 'Kyla Mae Dizon',
    phone: '09174821130',
    plan: 'Monthly',
    started: 1,
    isNew: true,
  },
  {
    key: 'jerome',
    code: 'ICG-2025-0356',
    name: 'Jerome Castro',
    phone: '09661027745',
    plan: 'Monthly',
    left: -12,
  },
  {
    key: 'lea',
    code: 'ICG-2025-0377',
    name: 'Lea Gonzales',
    phone: '09386612208',
    plan: 'Monthly',
    left: 7,
    suspended: { daysAgo: 7, reason: 'Unpaid balance' },
  },
  {
    key: 'mark',
    code: 'ICG-2025-0333',
    name: 'Mark Villanueva',
    phone: '09175560921',
    plan: 'Quarterly',
    left: 41,
  },
  {
    key: 'rica',
    code: 'ICG-2026-0590',
    name: 'Rica Mendoza',
    phone: '09951203380',
    plan: 'Monthly',
    left: 9,
  },
  {
    key: 'renz',
    code: 'ICG-2024-0233',
    name: 'Renz Aquino',
    phone: '09170096621',
    plan: 'Quarterly',
    left: -25,
  },
  {
    key: 'jasmine',
    code: 'ICG-2025-0334',
    name: 'Jasmine Uy',
    phone: '09189904417',
    plan: 'Monthly',
    left: 5,
  },
  {
    key: 'paoloG',
    code: 'ICG-2024-0090',
    name: 'Paolo Gutierrez',
    phone: '09208815532',
    plan: 'Monthly',
    left: -44,
  },
];

/** Walk-in customers from WalkInRecords.dc.html, plus Carlo Tan (AddMember.dc.html). */
const DESIGN_CUSTOMERS = [
  ['ella', 'Ella Bautista', null],
  ['kenji', 'Kenji Ramos', '09173301182'],
  ['trishaG', 'Trisha Gomez', '09951203381'],
  ['nathan', 'Nathan Lopez', null],
  ['lara', 'Lara Santos', '09664102259'],
  ['joanna', 'Joanna Flores', '09163305590'],
  ['ryan', 'Ryan Pascual', '09190042287'],
  ['mae', 'Mae Dizon', null],
  ['carlo', 'Carlo Tan', '09178824410'],
];

/**
 * @param {Date} now
 * @returns {object} the whole sample data set (see docs/demo-data.md)
 */
export function createSeed(now = new Date()) {
  const today = todayInGym(now);
  const { hours, minutes } = gymTimeParts(now);
  const nowMinutes = hours * 60 + minutes;
  const historyStart = addMonths(`${today.slice(0, 8)}01`, -1);
  const rand = seeded(`icg-${today}`);
  const nowIso = now.toISOString();
  const ago = (mins) => new Date(now.getTime() - mins * MINUTE).toISOString();
  const counters = {};
  const nextId = (kind) => seedId(KIND[kind], (counters[kind] = (counters[kind] ?? 0) + 1));

  const plans = PLAN_SEED.map(({ share: _share, ...p }) => ({ ...p }));
  const planByName = Object.fromEntries(plans.map((p) => [p.name, p]));
  const sellablePlans = PLAN_SEED.filter((p) => p.share > 0);

  const members = [];
  const subscriptions = [];
  const payments = [];
  const checkIns = [];
  const customers = [];
  const visits = [];
  const movements = [];
  const auditLogs = [];
  const designMember = {};
  const designCustomer = {};
  const usedCodes = new Set(DESIGN_MEMBERS.map((m) => m.code));

  // ── Members and their membership periods ─────────────────────────────────────────────────

  /** Membership periods ending on `endDate`, going back until before the history window. */
  function buildChain(lastPlan, endDate, { earlierPlans = [], firstIsNew = false } = {}) {
    const chain = [];
    let plan = lastPlan;
    let end = endDate;
    for (let i = 0; i < 12; i++) {
      const start = addMonths(addDays(end, 1), -plan.durationMonths);
      chain.unshift({ plan, start, end: computeEndDate(start, plan) });
      if (start < historyStart || (firstIsNew && i === 0)) break;
      plan = planByName[earlierPlans[i]] ?? plan;
      end = addDays(start, -1);
    }
    return chain;
  }

  function addMember(spec, chain, extra = {}) {
    const id = nextId('member');
    const firstStart = chain[0].start;
    const member = {
      id,
      code: spec.code,
      name: spec.name,
      phone: spec.phone,
      email: spec.email ?? null,
      address: spec.address ?? null,
      memberSince: spec.since && spec.since < firstStart ? spec.since : firstStart,
      qrToken: qrToken(rand),
      suspended: false,
      suspendedOn: null,
      suspendReason: null,
      walkinCustomerId: null,
      portalPassword: spec.portalPassword ?? spec.phone,
      readNotifications: [],
      createdAt: gymTimestamp(spec.since && spec.since < firstStart ? spec.since : firstStart, 600),
      ...extra,
    };
    members.push(member);
    chain.forEach((period, i) => {
      const sub = {
        id: nextId('sub'),
        memberId: id,
        planId: period.plan.id,
        planName: period.plan.name,
        price: period.plan.price,
        startDate: period.start,
        endDate: period.end,
        status: 'active',
        paymentId: null,
        createdAt: gymTimestamp(period.start, 540),
      };
      subscriptions.push(sub);
      // Every period that has started was paid for. (Reports and the dashboard use made-up
      // numbers before historyStart, so these older payments only show in lists and profiles.)
      if (period.start <= today) {
        const isNew = i === 0 && member.memberSince === period.start;
        const minutesOfDay =
          period.start === today
            ? Math.max(360, nowMinutes - between(rand, 30, 200))
            : between(rand, 370, 1290);
        const p = addPayment({
          at: gymTimestamp(period.start, minutesOfDay),
          type: isNew ? 'membership_new' : 'membership_renewal',
          memberId: id,
          customerName: member.name,
          description: `${period.plan.name} membership`,
          detail: periodText(period.start, period.end),
          amount: period.plan.price,
          method: pickShare(rand, [
            { code: 'cash', share: 0.55 },
            { code: 'gcash', share: 0.37 },
            { code: 'bank_transfer', share: 0.08 },
          ]).code,
          subscriptionId: sub.id,
        });
        sub.paymentId = p.id;
        if (isNew) sub.createdAt = p.at;
      }
    });
    return member;
  }

  function addPayment(fields) {
    const payment = {
      id: nextId('payment'),
      txnNo: null,
      walkinVisitId: null,
      memberId: null,
      subscriptionId: null,
      referenceNo: null,
      status: 'paid',
      staffId: rand() < 0.7 ? STAFF_IDS.joy : STAFF_IDS.kevin,
      items: null,
      correction: null,
      sms: null,
      pendingRenewal: null,
      detail: '',
      ...fields,
    };
    if (payment.method === 'gcash' || payment.method === 'bank_transfer') {
      payment.referenceNo ??= gcashRef(rand);
    }
    payments.push(payment);
    return payment;
  }

  for (const spec of DESIGN_MEMBERS) {
    const plan = planByName[spec.plan];
    const end =
      spec.left !== undefined
        ? addDays(today, spec.left)
        : computeEndDate(addDays(today, -spec.started), plan);
    const chain = buildChain(plan, end, {
      earlierPlans: spec.history ?? [],
      firstIsNew: spec.isNew,
    });
    const since = spec.isNew
      ? chain[0].start
      : (spec.since ?? addDays(chain[0].start, -between(rand, 30, 400)));
    designMember[spec.key] = addMember({ ...spec, since }, chain);
  }
  {
    const lea = designMember.lea;
    lea.suspended = true;
    lea.suspendedOn = addDays(today, -7);
    lea.suspendReason = 'Unpaid balance';
  }

  // Generated members: about 285 more, with codes that don't clash with the designs'.
  const nextSeq = {};
  const codeFor = (year) => {
    let code;
    do {
      nextSeq[year] =
        (nextSeq[year] ?? (year === Number(today.slice(0, 4)) ? 380 : 40)) + between(rand, 1, 2);
      code = `ICG-${year}-${String(nextSeq[year]).padStart(4, '0')}`;
    } while (usedCodes.has(code));
    usedCodes.add(code);
    return code;
  };
  const generated = [];
  const takenNames = new Set([
    ...DESIGN_MEMBERS.map((m) => m.name),
    ...DESIGN_CUSTOMERS.map((c) => c[1]),
  ]);
  for (let i = 0; i < 285; i++) {
    const plan = planByName[pickShare(rand, sellablePlans).name];
    const days = plan.durationMonths * 30;
    const r = rand();
    let left;
    if (r < 0.8) left = between(rand, 8, days - 1);
    else if (r < 0.86) left = between(rand, 0, 7);
    else if (r < 0.985) left = -between(rand, 1, 50);
    else left = between(rand, 8, days - 1);
    const chain = buildChain(plan, addDays(today, left), {
      earlierPlans: Array.from({ length: 12 }, () =>
        rand() < 0.85 ? plan.name : pickShare(rand, sellablePlans).name,
      ),
      firstIsNew: rand() < 0.1,
    });
    const isNewInWindow = chain[0].start >= historyStart && chain.length < 3 && rand() < 0.5;
    const since = isNewInWindow ? chain[0].start : addDays(chain[0].start, -between(rand, 0, 700));
    let name;
    do name = `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`;
    while (takenNames.has(name));
    takenNames.add(name);
    const member = addMember(
      {
        code: codeFor(Number(since.slice(0, 4))),
        name,
        phone: phoneFrom(rand),
        email:
          rand() < 0.55
            ? `${name.toLowerCase().replace(/[^a-z]+/g, '.')}${between(rand, 1, 99)}@gmail.com`
            : null,
        address: rand() < 0.7 ? pick(rand, BARANGAYS) : null,
        since,
      },
      chain,
    );
    member.visitRate = 0.25 + rand() * 0.45; // how often they come
    if (r >= 0.985) {
      member.suspended = true;
      member.suspendedOn = addDays(today, -between(rand, 1, 20));
      member.suspendReason = pick(rand, ['Rule violation', 'Member request (freeze)']);
    }
    generated.push(member);
  }

  // ── Check-ins ────────────────────────────────────────────────────────────────────────────

  const covering = new Map(); // memberId → periods, for "was this member allowed in on that day?"
  for (const s of subscriptions) {
    if (!covering.has(s.memberId)) covering.set(s.memberId, []);
    covering.get(s.memberId).push(s);
  }
  const activeOn = (member, date) =>
    (!member.suspended || date < member.suspendedOn) &&
    covering.get(member.id).some((s) => s.startDate <= date && s.endDate >= date);

  const addCheckIn = (memberId, timeIn, timeOut, extra = {}) =>
    checkIns.push({ id: nextId('checkIn'), memberId, timeIn, timeOut, fix: null, ...extra });

  for (let d = historyStart; d <= today; d = addDays(d, 1)) {
    const busy = busyness(d);
    for (const member of generated) {
      if (!activeOn(member, d) || rand() > member.visitRate * busy) continue;
      const start = pickShare(rand, HOURS).h * 60 + between(rand, 0, 59);
      if (d === today && start > nowMinutes - 2) continue;
      const stay = between(rand, 55, 135);
      const out = start + stay;
      addCheckIn(
        member.id,
        gymTimestamp(d, start),
        d === today && out > nowMinutes ? null : gymTimestamp(d, Math.min(out, 22 * 60)),
      );
    }
  }
  // Design members: earlier visits, then today's from Attendance.dc.html.
  const DAY = 24 * 60;
  const dm = designMember;
  for (let back = 30; back >= 2; back--) {
    const d = addDays(today, -back);
    for (const key of [
      'andrea',
      'paolo',
      'miguel',
      'daniel',
      'trisha',
      'mark',
      'rica',
      'bianca',
      'jasmine',
    ]) {
      if (!activeOn(dm[key], d) || rand() > 0.5) continue;
      const start = pickShare(rand, HOURS).h * 60 + between(rand, 0, 50);
      addCheckIn(
        dm[key].id,
        gymTimestamp(d, start),
        gymTimestamp(d, start + between(rand, 70, 115)),
      );
    }
  }
  [
    ['andrea', 4, null],
    ['paolo', 22, null],
    ['miguel', 44, null],
    ['kyla', 71, null],
    ['bianca', 145, 37],
    ['trisha', 277, 194],
    ['daniel', 280, 181],
    // Yesterday: two people never scanned out (they show as missed check-outs).
    ['mark', DAY - 380, null],
    ['rica', DAY - 478, null],
    ['kyla', DAY - 332, DAY - 441],
    ['andrea', DAY + 120, DAY + 22],
  ].forEach(([key, inAgo, outAgo]) => {
    const timeIn = ago(inAgo);
    if (todayInGym(new Date(timeIn)) < historyStart) return;
    addCheckIn(dm[key].id, timeIn, outAgo === null ? null : ago(outAgo));
  });

  const rejections = [
    { id: nextId('rejection'), at: ago(130), kind: 'expired', memberId: dm.jerome.id },
    { id: nextId('rejection'), at: ago(95), kind: 'invalid', memberId: null },
    { id: nextId('rejection'), at: ago(60), kind: 'suspended', memberId: dm.lea.id },
  ];

  // ── Walk-ins ─────────────────────────────────────────────────────────────────────────────

  const fees = SETTINGS_SEED.walkinFees;
  const addCustomer = (name, phone) => {
    const c = { id: nextId('customer'), name, phone, memberId: null };
    customers.push(c);
    return c;
  };
  for (const [key, name, phone] of DESIGN_CUSTOMERS) designCustomer[key] = addCustomer(name, phone);

  function addVisit(customer, feeType, timeIn, timeOut, method, { status, staffId, refund } = {}) {
    const visit = {
      id: nextId('visit'),
      customerId: customer.id,
      feeType,
      fee: fees[feeType],
      timeIn,
      timeOut,
      paymentId: null,
    };
    visits.push(visit);
    const p = addPayment({
      at: timeIn,
      type: 'walkin',
      walkinVisitId: visit.id,
      customerName: customer.name,
      description: 'Walk-in day pass',
      detail: feeType === 'student' ? 'Student rate' : 'Regular rate',
      amount: visit.fee,
      method,
      status: status ?? (method ? 'paid' : 'pending'),
      ...(staffId ? { staffId } : {}),
      ...(refund ? { correction: refund } : {}),
    });
    visit.paymentId = p.id;
    return visit;
  }

  const pool = [];
  for (let d = historyStart; d < today; d = addDays(d, 1)) {
    for (let n = around(rand, 21 * busyness(d)); n > 0; n--) {
      let customer;
      if (pool.length > 20 && rand() < 0.35) customer = pick(rand, pool);
      else {
        customer = addCustomer(
          `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
          rand() < 0.6 ? phoneFrom(rand) : null,
        );
        pool.push(customer);
      }
      const start = pickShare(rand, HOURS).h * 60 + between(rand, 0, 59);
      const feeType = rand() < 0.72 ? 'regular' : 'student';
      addVisit(
        customer,
        feeType,
        gymTimestamp(d, start),
        gymTimestamp(d, Math.min(start + between(rand, 50, 130), 22 * 60)),
        rand() < 0.62 ? 'cash' : 'gcash',
      );
    }
  }
  const dc = designCustomer;
  // Carlo Tan: 3 earlier visits (he can be converted to a member in Add New Member).
  for (const back of [3, 9, 16]) {
    addVisit(
      dc.carlo,
      'regular',
      gymTimestamp(addDays(today, -back), 1100),
      gymTimestamp(addDays(today, -back), 1190),
      'cash',
    );
  }
  // Ryan's earlier visits (View History shows the Monthly-plan hint).
  for (const [inAgo, outAgo, m] of [
    [3 * DAY + 242, 3 * DAY + 167, 'cash'],
    [6 * DAY + 230, 6 * DAY + 141, 'gcash'],
    [8 * DAY + 157, 8 * DAY + 72, 'cash'],
  ]) {
    if (todayInGym(new Date(ago(inAgo))) >= historyStart)
      addVisit(dc.ryan, 'regular', ago(inAgo), ago(outAgo), m);
  }
  // Today, from WalkInRecords.dc.html.
  [
    ['ella', 'regular', 8, null, 'cash'],
    ['kenji', 'regular', 50, null, 'cash'],
    ['trishaG', 'regular', 97, null, 'gcash'],
    ['nathan', 'regular', 132, null, null],
    ['lara', 'student', 72, 22, 'gcash'],
    ['joanna', 'regular', 202, 107, 'cash'],
    ['ryan', 'regular', 237, 152, 'cash'],
  ].forEach(([key, feeType, inAgo, outAgo, method]) =>
    addVisit(dc[key], feeType, ago(inAgo), outAgo === null ? null : ago(outAgo), method),
  );
  addVisit(dc.mae, 'student', ago(272), ago(191), 'cash', {
    status: 'refunded',
    refund: { action: 'refund', reason: 'Left early', by: STAFF_IDS.owner, at: ago(185) },
  });

  // ── Products: sales, use and deliveries (worked out backwards from today's stock) ────────

  const items = ITEM_SEED.map(({ categoryIndex, ...item }) => ({
    ...item,
    category: INVENTORY_CATEGORIES[categoryIndex],
    createdAt: gymTimestamp(historyStart, 420),
  }));
  const memberBuyers = generated.slice(0, 120);
  for (const item of items) {
    let level = item.quantity; // stock at the end of the day being looked at
    const sells = item.sellingPrice !== null;
    for (let d = today; d >= historyStart; d = addDays(d, -1)) {
      const out = Math.round(rand() * (item.costPrice < 100 ? 3.2 : 0.35) * busyness(d));
      if (out && !(d === today && nowMinutes < 420)) {
        const at = gymTimestamp(
          d,
          d === today
            ? between(rand, 400, Math.max(401, nowMinutes - 5))
            : between(rand, 400, 1300),
        );
        const buyer = rand() < 0.3 ? pick(rand, memberBuyers) : null;
        movements.push({
          id: nextId('movement'),
          itemId: item.id,
          type: sells ? 'sold' : 'used',
          quantity: -out,
          date: d,
          at,
          remarks: sells ? 'Sold at front desk' : 'Used by gym',
          staffId: rand() < 0.7 ? STAFF_IDS.joy : STAFF_IDS.kevin,
        });
        if (sells) {
          const p = addPayment({
            at,
            type: 'product',
            memberId: buyer?.id ?? null,
            customerName: buyer?.name ?? 'Counter sale',
            description: `${item.name} × ${out}`,
            amount: item.sellingPrice * out,
            method: rand() < 0.7 ? 'cash' : 'gcash',
            items: [{ itemId: item.id, name: item.name, quantity: out, price: item.sellingPrice }],
          });
          movements[movements.length - 1].paymentId = p.id;
        }
      }
      let before = level + out; // stock at the start of the day, after any delivery
      if (d > historyStart && before > item.reorderLevel * 2 && rand() < 0.12) {
        const delivered = Math.min(before, Math.max(6, Math.round(item.reorderLevel * 2.5)));
        movements.push({
          id: nextId('movement'),
          itemId: item.id,
          type: 'delivery',
          quantity: delivered,
          date: d,
          at: gymTimestamp(d, 555),
          remarks: `Supplier delivery · DR-${between(rand, 55000, 56999)}`,
          staffId: STAFF_IDS.kevin,
        });
        before -= delivered;
      }
      level = before;
    }
    if (level > 0) {
      movements.push({
        id: nextId('movement'),
        itemId: item.id,
        type: 'count_add',
        quantity: level,
        date: historyStart,
        at: gymTimestamp(historyStart, 400),
        remarks: 'Opening stock count',
        staffId: STAFF_IDS.owner,
      });
    }
  }

  // ── Payments and changes from the designs ────────────────────────────────────────────────

  // Trisha bought a protein shake today (Payments.dc.html).
  {
    const shake = items.find((i) => i.name.startsWith('Protein Shake'));
    const at = ago(37);
    const p = addPayment({
      at,
      type: 'product',
      memberId: dm.trisha.id,
      customerName: dm.trisha.name,
      description: `${shake.name} × 1`,
      amount: shake.sellingPrice,
      method: 'cash',
      items: [{ itemId: shake.id, name: shake.name, quantity: 1, price: shake.sellingPrice }],
    });
    movements.push({
      id: nextId('movement'),
      itemId: shake.id,
      type: 'sold',
      quantity: -1,
      date: today,
      at,
      remarks: 'Sold at front desk',
      staffId: STAFF_IDS.joy,
      paymentId: p.id,
    });
    // Keep the quantity the design shows: the sale came out of a slightly larger opening count.
    const opening = movements.find((m) => m.itemId === shake.id && m.type === 'count_add');
    if (opening) opening.quantity += 1;
    else
      movements.push({
        id: nextId('movement'),
        itemId: shake.id,
        type: 'count_add',
        quantity: 1,
        date: historyStart,
        at: gymTimestamp(historyStart, 400),
        remarks: 'Opening stock count',
        staffId: STAFF_IDS.owner,
      });
  }
  // Miguel paid next year's Annual plan by bank transfer; the owner hasn't confirmed it yet.
  {
    const current = subscriptions.filter((s) => s.memberId === dm.miguel.id).at(-1);
    const start = addDays(current.endDate, 1);
    const plan = planByName.Annual;
    addPayment({
      at: gymTimestamp(addDays(today, -1), 18 * 60 + 30),
      type: 'membership_renewal',
      memberId: dm.miguel.id,
      customerName: dm.miguel.name,
      description: 'Annual membership',
      detail: periodText(start, computeEndDate(start, plan)),
      amount: plan.price,
      method: 'bank_transfer',
      status: 'pending',
      note: 'Bank ref awaiting check',
      pendingRenewal: {
        planId: plan.id,
        planName: plan.name,
        startDate: start,
        endDate: computeEndDate(start, plan),
        price: plan.price,
      },
    });
  }
  // Lea owes this month's fee (why she is suspended).
  addPayment({
    at: gymTimestamp(addDays(today, -8), 17 * 60 + 5),
    type: 'membership_renewal',
    memberId: dm.lea.id,
    customerName: dm.lea.name,
    description: 'Monthly membership',
    detail: 'Balance to settle',
    amount: 1200,
    method: null,
    status: 'pending',
    note: 'Unpaid balance',
  });
  // Jasmine's renewal was entered twice yesterday; the owner voided the copy.
  {
    const at = gymTimestamp(addDays(today, -1), 17 * 60 + 12);
    const start = addDays(today, 6);
    const plan = planByName.Monthly;
    const sub = {
      id: nextId('sub'),
      memberId: dm.jasmine.id,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      startDate: start,
      endDate: computeEndDate(start, plan),
      status: 'cancelled',
      paymentId: null,
      createdAt: at,
    };
    subscriptions.push(sub);
    const p = addPayment({
      at,
      type: 'membership_renewal',
      memberId: dm.jasmine.id,
      customerName: dm.jasmine.name,
      description: 'Monthly membership',
      detail: periodText(sub.startDate, sub.endDate),
      amount: plan.price,
      method: 'cash',
      status: 'voided',
      subscriptionId: sub.id,
      staffId: STAFF_IDS.joy,
      correction: {
        action: 'void',
        reason: 'Entered twice',
        by: STAFF_IDS.owner,
        at: gymTimestamp(addDays(today, -1), 18 * 60 + 20),
      },
    });
    sub.paymentId = p.id;
  }

  // Transaction numbers: one sequence per month, in time order.
  payments.sort((a, b) => a.at.localeCompare(b.at));
  const seqByMonth = {};
  for (const p of payments) {
    const [y, m] = todayInGym(new Date(p.at)).split('-').map(Number);
    const key = `${y}-${m}`;
    seqByMonth[key] = (seqByMonth[key] ?? 0) + 1;
    p.txnNo = formatTransactionNo(y, m, seqByMonth[key]);
  }

  // ── Audit history (Staff.dc.html) ────────────────────────────────────────────────────────

  const audit = (at, staffId, action, text, extra = {}) =>
    auditLogs.push({ id: nextId('audit'), at, staffId, action, text, reason: null, ...extra });
  const jasminePay = payments.find((p) => p.memberId === dm.jasmine.id && p.status === 'voided');
  const maePay = payments.find((p) => p.walkinVisitId && p.status === 'refunded');
  audit(
    gymTimestamp(addDays(today, -62), 1180),
    STAFF_IDS.owner,
    'staff',
    'disabled account aira.d',
  );
  audit(
    gymTimestamp(addDays(today, -6), 1212),
    STAFF_IDS.owner,
    'price',
    'changed Quarterly price ₱3,000.00 → ₱3,300.00',
  );
  audit(
    gymTimestamp(addDays(today, -5), 1170),
    STAFF_IDS.kevin,
    'stock',
    'stock out · 12 × Bottled Water 500ml (Sold)',
  );
  audit(
    gymTimestamp(addDays(today, -7), 600),
    STAFF_IDS.owner,
    'suspend',
    `suspended ${dm.lea.name}`,
    { reason: 'Unpaid balance' },
  );
  audit(
    jasminePay.correction.at,
    STAFF_IDS.owner,
    'void',
    `voided ${jasminePay.txnNo} (₱1,200.00)`,
    { reason: 'Entered twice' },
  );
  audit(maePay.correction.at, STAFF_IDS.owner, 'refund', `refunded ${maePay.txnNo} (₱80.00)`, {
    reason: 'Left early',
  });
  audit(ago(160), STAFF_IDS.joy, 'registration', `renewed ${dm.andrea.name} · Monthly`);

  const staff = STAFF_SEED.map((s, i) => ({
    ...s,
    lastLoginAt: [
      nowIso,
      gymTimestamp(today, 352),
      gymTimestamp(addDays(today, -1), 841),
      gymTimestamp(addDays(today, -60), 600),
    ][i],
  }));

  const notices = [
    {
      id: nextId('notice'),
      at: gymTimestamp(addDays(today, -2), 540),
      title: 'Holiday hours',
      body: 'On holidays the gym opens 8:00 AM – 4:00 PM only.',
    },
  ];

  return {
    meta: { version: DATA_VERSION, seededAt: nowIso, historyStart },
    settings: { ...SETTINGS_SEED, walkinFees: { ...SETTINGS_SEED.walkinFees } },
    paymentMethods: PAYMENT_METHOD_SEED.map((m) => ({ ...m })),
    plans,
    staff,
    members: members.map(({ visitRate: _v, ...m }) => m),
    subscriptions,
    payments,
    checkIns,
    rejections,
    customers,
    visits,
    items: items.map((item) => ({
      ...item,
      quantity: movements.filter((m) => m.itemId === item.id).reduce((s, m) => s + m.quantity, 0),
    })),
    movements,
    auditLogs,
    notices,
  };
}

/** "09 Nov – 08 Dec 2026" or "09 Nov 2026 – 08 Feb 2027". */
export function periodText(start, end) {
  const fmt = (d) => {
    const [y, m, day] = d.split('-');
    return `${day} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1]} ${y}`;
  };
  const a = fmt(start);
  const b = fmt(end);
  return start.slice(0, 4) === end.slice(0, 4) ? `${a.slice(0, 6)} – ${b}` : `${a} – ${b}`;
}
