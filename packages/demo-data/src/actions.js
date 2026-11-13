/**
 * Every change staff (or a member, in the portal) can make to the sample data.
 * Each action is `(state, input, ctx) => ({ state, result })` and never changes `state` itself.
 * `ctx` = { now: Date, actor: signed-in staff (or null), memberActor: signed-in member }.
 *
 * The gym rules from CLAUDE.md are applied here, like the API will: owner-only actions check the
 * role, payments are never deleted, stock can't go below 0, renewals keep the Member ID and QR,
 * walk-ins are linked instead of duplicated, and important changes write to the audit history.
 * Problems throw a DemoError with a message staff can read (and `fields` for form errors).
 */
import {
  MEMBERSHIP_STATUS,
  ROLES,
  STOCK_MOVEMENT_TYPES,
  addDays,
  canEnter,
  computeEndDate,
  daysBetween,
  formatMemberCode,
  formatPeso,
  formatTransactionNo,
  inventoryItemSchema,
  memberCreateSchema,
  memberUpdateSchema,
  paymentCorrectionSchema,
  planSchema,
  renewalStartDate,
  roundMoney,
  stockMovementSchema,
  suspendSchema,
  todayInGym,
  walkinVisitCreateSchema,
} from '@icg/shared';
import { newId, qrToken, tempPassword } from './ids.js';
import { periodText } from './seed.js';
import { dayOf, indexes, memberInfo } from './selectors.js';

export class DemoError extends Error {
  constructor(message, { fields, status = 400 } = {}) {
    super(message);
    this.name = 'DemoError';
    this.fields = fields;
    this.status = status;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────────────────

const today = (ctx) => todayInGym(ctx.now);
const iso = (ctx) => ctx.now.toISOString();
const replace = (list, id, patch) =>
  list.map((x) =>
    x.id === id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x,
  );

/** Turn a zod result into a DemoError with one message per field. */
function parse(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  throw new DemoError(Object.values(fields)[0] ?? 'Check the form.', { fields });
}

function requireStaff(ctx) {
  if (!ctx.actor) throw new DemoError('Please sign in first.', { status: 401 });
  return ctx.actor;
}

function requireOwner(ctx) {
  const actor = requireStaff(ctx);
  if (actor.role !== ROLES.OWNER) {
    throw new DemoError('Only the Owner can do this.', { status: 403 });
  }
  return actor;
}

function audit(state, ctx, action, text, reason = null) {
  return [
    ...state.auditLogs,
    { id: newId(), at: iso(ctx), staffId: ctx.actor?.id ?? null, action, text, reason },
  ];
}

/** Next transaction number in this month: TXN-2026-11-0407. */
export function nextTxnNo(state, now) {
  const [y, m] = todayInGym(now).split('-').map(Number);
  const prefix = formatTransactionNo(y, m, 0).slice(0, -4);
  const max = state.payments
    .filter((p) => p.txnNo?.startsWith(prefix))
    .reduce((n, p) => Math.max(n, Number(p.txnNo.slice(-4))), 0);
  return formatTransactionNo(y, m, max + 1);
}

/** Next Member ID this year: ICG-2026-0643. */
export function nextMemberCode(state, now) {
  const year = Number(todayInGym(now).slice(0, 4));
  const max = state.members
    .filter((m) => m.code.startsWith(`ICG-${year}-`))
    .reduce((n, m) => Math.max(n, Number(m.code.slice(9))), 0);
  return formatMemberCode(year, max + 1);
}

/**
 * Check a payment method and reference number.
 * @returns {{ method, status: 'paid'|'pending' }} bank transfers by a receptionist wait for the owner.
 */
function checkMethod(state, ctx, code, referenceNo, { requireReference = true } = {}) {
  const method = state.paymentMethods.find((m) => m.code === code);
  if (!method || !method.enabled) {
    throw new DemoError('Choose a payment method.', {
      fields: { method: 'Choose a payment method' },
    });
  }
  if (requireReference && method.requiresReference && !referenceNo?.trim()) {
    throw new DemoError(`Enter the ${method.name} reference number.`, {
      fields: { referenceNo: `Enter the ${method.name} reference number` },
    });
  }
  const waits = method.needsOwnerConfirmation && ctx.actor?.role !== ROLES.OWNER;
  return { method, status: waits ? 'pending' : 'paid' };
}

function newPayment(state, ctx, fields) {
  return {
    id: newId(),
    txnNo: nextTxnNo(state, ctx.now),
    at: iso(ctx),
    memberId: null,
    walkinVisitId: null,
    subscriptionId: null,
    referenceNo: null,
    status: 'paid',
    staffId: ctx.actor?.id ?? null,
    items: null,
    correction: null,
    sms: null,
    pendingRenewal: null,
    detail: '',
    note: null,
    ...fields,
  };
}

function checkAmount(price, amountReceived, methodCode) {
  if (methodCode !== 'cash' || amountReceived === undefined || amountReceived === null) return;
  if (roundMoney(amountReceived) < roundMoney(price)) {
    throw new DemoError(`Amount received is less than ${formatPeso(price)}.`, {
      fields: { amountReceived: `Must be at least ${formatPeso(price)}` },
    });
  }
}

const findOr404 = (map, id, what) => {
  const x = map.get(id);
  if (!x) throw new DemoError(`${what} not found. It may have been removed.`, { status: 404 });
  return x;
};

// ── Sign-in ──────────────────────────────────────────────────────────────────────────────

/**
 * Staff sign-in with username or email. SAMPLE ONLY — TODO(auth): Supabase Auth replaces this.
 * @returns {{ staff }}
 */
export function signIn(state, { identifier, password }, ctx) {
  const key = identifier.trim().toLowerCase();
  const staff = state.staff.find(
    (s) => s.username.toLowerCase() === key || s.email.toLowerCase() === key,
  );
  if (!staff || staff.password !== password) {
    throw new DemoError('Wrong username or password. Check them and try again.', { status: 401 });
  }
  if (staff.status !== 'active') {
    throw new DemoError('This account is turned off. Ask the gym owner to turn it back on.', {
      status: 403,
    });
  }
  return {
    state: { ...state, staff: replace(state.staff, staff.id, { lastLoginAt: iso(ctx) }) },
    result: { staff },
  };
}

/** Member portal sign-in with Member ID or email. SAMPLE ONLY. */
export function memberSignIn(state, { identifier, password }) {
  const key = identifier.trim().toLowerCase();
  const member = state.members.find(
    (m) => m.code.toLowerCase() === key || (m.email && m.email.toLowerCase() === key),
  );
  if (!member || member.portalPassword !== password) {
    throw new DemoError('Wrong Member ID, email or password. Check them and try again.', {
      status: 401,
    });
  }
  return { state, result: { member } };
}

// ── Members ──────────────────────────────────────────────────────────────────────────────

function checkDuplicatePhone(state, phone, exceptId = null) {
  const other = state.members.find((m) => m.phone === phone && m.id !== exceptId);
  if (other) {
    throw new DemoError(`${other.name} (${other.code}) already uses this number.`, {
      fields: { contactNumber: `Already used by ${other.name} (${other.code})` },
    });
  }
}

/** A walk-in customer with this number who isn't a member yet (to link instead of duplicate). */
export function walkinMatch(state, phone) {
  if (!phone) return null;
  return state.customers.find((c) => c.phone === phone && !c.memberId) ?? null;
}

/**
 * Add New Member: member, first membership period and payment, in one go.
 * @returns {{ member, payment, subscription|null, portalPassword }}
 */
export function addMember(state, input, ctx) {
  requireStaff(ctx);
  const data = parse(memberCreateSchema, input);
  const ix = indexes(state);
  const plan = findOr404(ix.plan, data.planId, 'Plan');
  if (!plan.isActive) throw new DemoError(`${plan.name} is turned off. Choose another plan.`);
  const t = today(ctx);
  if (data.startDate < t) {
    throw new DemoError('The start date can’t be in the past.', {
      fields: { startDate: 'Use today or a later date' },
    });
  }
  checkDuplicatePhone(state, data.contactNumber);
  const { method, status } = checkMethod(
    state,
    ctx,
    data.payment.paymentMethodCode,
    data.payment.referenceNo,
  );
  checkAmount(plan.price, data.payment.amountReceived, method.code);

  const customer = data.walkinCustomerId
    ? findOr404(ix.customer, data.walkinCustomerId, 'Walk-in customer')
    : walkinMatch(state, data.contactNumber);
  if (customer?.memberId) throw new DemoError(`${customer.name} is already a member.`);

  const portalPassword = tempPassword();
  const member = {
    id: newId(),
    code: nextMemberCode(state, ctx.now),
    name: data.fullName,
    phone: data.contactNumber,
    email: data.email,
    address: data.address,
    memberSince: t,
    qrToken: qrToken(),
    suspended: false,
    suspendedOn: null,
    suspendReason: null,
    walkinCustomerId: customer?.id ?? null,
    portalPassword,
    readNotifications: [],
    createdAt: iso(ctx),
  };
  const endDate = computeEndDate(data.startDate, plan);
  const period = {
    planId: plan.id,
    planName: plan.name,
    startDate: data.startDate,
    endDate,
    price: plan.price,
  };
  const subscription =
    status === 'paid'
      ? { id: newId(), memberId: member.id, ...period, status: 'active', createdAt: iso(ctx) }
      : null;
  const payment = newPayment(state, ctx, {
    type: 'membership_new',
    memberId: member.id,
    customerName: member.name,
    description: `${plan.name} membership`,
    detail: periodText(data.startDate, endDate),
    amount: plan.price,
    method: method.code,
    referenceNo: data.payment.referenceNo,
    status,
    subscriptionId: subscription?.id ?? null,
    pendingRenewal: subscription ? null : period,
    note: status === 'pending' ? 'Waiting for the owner to confirm the transfer' : null,
  });
  if (subscription) subscription.paymentId = payment.id;

  return {
    state: {
      ...state,
      members: [...state.members, member],
      subscriptions: subscription ? [...state.subscriptions, subscription] : state.subscriptions,
      payments: [...state.payments, payment],
      customers: customer
        ? replace(state.customers, customer.id, { memberId: member.id })
        : state.customers,
      auditLogs: audit(
        state,
        ctx,
        'registration',
        `registered member ${member.name}${customer ? ' (from walk-in)' : ''}`,
      ),
    },
    result: { member, payment, subscription, portalPassword, linkedCustomer: customer ?? null },
  };
}

/** Edit Information (name, number, email, address). */
export function updateMember(state, { memberId, ...fields }, ctx) {
  requireStaff(ctx);
  const member = findOr404(indexes(state).member, memberId, 'Member');
  const data = parse(memberUpdateSchema, fields);
  if (data.contactNumber) checkDuplicatePhone(state, data.contactNumber, memberId);
  const patch = {};
  if (data.fullName !== undefined) patch.name = data.fullName;
  if (data.contactNumber !== undefined) patch.phone = data.contactNumber;
  if ('email' in fields) patch.email = data.email ?? null;
  if ('address' in fields) patch.address = data.address ?? null;
  return {
    state: {
      ...state,
      members: replace(state.members, memberId, patch),
      auditLogs: audit(state, ctx, 'member', `edited the details of ${member.name}`),
    },
    result: { member: { ...member, ...patch } },
  };
}

/** Suspend Membership: QR is rejected until lifted; days remaining are paused. */
export function suspendMember(state, { memberId, reason }, ctx) {
  requireStaff(ctx);
  const member = findOr404(indexes(state).member, memberId, 'Member');
  if (member.suspended) throw new DemoError(`${member.name} is already suspended.`);
  const data = parse(suspendSchema, { reason });
  return {
    state: {
      ...state,
      members: replace(state.members, memberId, {
        suspended: true,
        suspendedOn: today(ctx),
        suspendReason: data.reason,
      }),
      auditLogs: audit(state, ctx, 'suspend', `suspended ${member.name}`, data.reason),
    },
    result: {},
  };
}

/** Lift Suspension (Owner): the paused days are added back to the end of the membership. */
export function liftSuspension(state, { memberId }, ctx) {
  requireOwner(ctx);
  const ix = indexes(state);
  const member = findOr404(ix.member, memberId, 'Member');
  if (!member.suspended) throw new DemoError(`${member.name} is not suspended.`);
  const t = today(ctx);
  const paused = Math.max(0, daysBetween(member.suspendedOn, t));
  const subs = ix.subsByMember.get(memberId) ?? [];
  const last = subs.at(-1);
  let subscriptions = state.subscriptions;
  let added = 0;
  if (last && last.endDate >= member.suspendedOn && paused > 0) {
    subscriptions = replace(subscriptions, last.id, { endDate: addDays(last.endDate, paused) });
    added = paused;
  }
  return {
    state: {
      ...state,
      subscriptions,
      members: replace(state.members, memberId, {
        suspended: false,
        suspendedOn: null,
        suspendReason: null,
      }),
      auditLogs: audit(
        state,
        ctx,
        'suspend',
        `lifted the suspension of ${member.name}${added ? ` (+${added} days)` : ''}`,
      ),
    },
    result: { addedDays: added },
  };
}

/** Cancel the member's QR code and give them a new one (lost phone or printed card). */
export function replaceQr(state, { memberId }, ctx) {
  requireStaff(ctx);
  const member = findOr404(indexes(state).member, memberId, 'Member');
  return {
    state: {
      ...state,
      members: replace(state.members, memberId, { qrToken: qrToken() }),
      auditLogs: audit(state, ctx, 'member', `replaced the QR code of ${member.name}`),
    },
    result: {},
  };
}

/**
 * Renew Membership: a new period after the current one (or from today if expired).
 * Same member, same Member ID and QR code.
 * @returns {{ payment, subscription|null }}
 */
export function renewMember(state, input, ctx) {
  requireStaff(ctx);
  const ix = indexes(state);
  const member = findOr404(ix.member, input.memberId, 'Member');
  const plan = findOr404(ix.plan, input.planId, 'Plan');
  if (!plan.isActive) throw new DemoError(`${plan.name} is turned off. Choose another plan.`);
  if (member.suspended) {
    throw new DemoError(`${member.name} is suspended. Lift the suspension first.`);
  }
  const t = today(ctx);
  const info = memberInfo(state, member, t);
  const earliest = renewalStartDate(info.endDate, t);
  const startDate = input.startDate ?? earliest;
  if (startDate < earliest) {
    throw new DemoError('The new period would overlap the current one.', {
      fields: { startDate: `Start on ${earliest} or later` },
    });
  }
  const pay = input.payment ?? {};
  const { method, status } = checkMethod(state, ctx, pay.paymentMethodCode, pay.referenceNo);
  checkAmount(plan.price, pay.amountReceived, method.code);
  const endDate = computeEndDate(startDate, plan);
  const period = { planId: plan.id, planName: plan.name, startDate, endDate, price: plan.price };
  const subscription =
    status === 'paid'
      ? { id: newId(), memberId: member.id, ...period, status: 'active', createdAt: iso(ctx) }
      : null;
  const payment = newPayment(state, ctx, {
    type: 'membership_renewal',
    memberId: member.id,
    customerName: member.name,
    description: `${plan.name} membership`,
    detail: periodText(startDate, endDate),
    amount: plan.price,
    method: method.code,
    referenceNo: pay.referenceNo ?? null,
    status,
    subscriptionId: subscription?.id ?? null,
    pendingRenewal: subscription ? null : period,
    note: status === 'pending' ? 'Waiting for the owner to confirm the transfer' : null,
  });
  if (subscription) subscription.paymentId = payment.id;
  return {
    state: {
      ...state,
      subscriptions: subscription ? [...state.subscriptions, subscription] : state.subscriptions,
      payments: [...state.payments, payment],
      auditLogs: audit(state, ctx, 'registration', `renewed ${member.name} · ${plan.name}`),
    },
    result: { payment, subscription, period },
  };
}

// ── Payments ─────────────────────────────────────────────────────────────────────────────

/** Sell products at the front desk: a product payment plus a "Sold" stock movement. */
export function sellProduct(state, input, ctx) {
  requireStaff(ctx);
  const ix = indexes(state);
  const item = findOr404(ix.item, input.itemId, 'Item');
  if (item.sellingPrice === null) throw new DemoError(`${item.name} is not for sale.`);
  const quantity = Math.floor(Number(input.quantity));
  if (!(quantity >= 1)) {
    throw new DemoError('Quantity must be at least 1.', { fields: { quantity: 'At least 1' } });
  }
  if (quantity > item.quantity) {
    throw new DemoError(`Only ${item.quantity} ${item.unit} of ${item.name} left.`, {
      fields: { quantity: `Only ${item.quantity} left` },
    });
  }
  const member = input.memberId ? findOr404(ix.member, input.memberId, 'Member') : null;
  const { method } = checkMethod(state, ctx, input.method, input.referenceNo);
  const amount = roundMoney(item.sellingPrice * quantity);
  checkAmount(amount, input.amountReceived, method.code);
  const payment = newPayment(state, ctx, {
    type: 'product',
    memberId: member?.id ?? null,
    customerName: member?.name ?? (input.customerName?.trim() || 'Counter sale'),
    description: `${item.name} × ${quantity}`,
    amount,
    method: method.code,
    referenceNo: input.referenceNo ?? null,
    items: [{ itemId: item.id, name: item.name, quantity, price: item.sellingPrice }],
  });
  const movement = {
    id: newId(),
    itemId: item.id,
    type: 'sold',
    quantity: -quantity,
    date: today(ctx),
    at: iso(ctx),
    remarks: `Sold at front desk · ${payment.txnNo}`,
    staffId: ctx.actor.id,
    paymentId: payment.id,
  };
  return {
    state: {
      ...state,
      payments: [...state.payments, payment],
      movements: [...state.movements, movement],
      items: replace(state.items, item.id, { quantity: item.quantity - quantity }),
    },
    result: { payment },
  };
}

/** Collect a payment that is still owed (unpaid walk-in, balance). */
export function collectPayment(state, { paymentId, method: code, referenceNo }, ctx) {
  requireStaff(ctx);
  const p = findOr404(indexes(state).payment, paymentId, 'Payment');
  if (p.status !== 'pending' || p.method) {
    throw new DemoError(`${p.txnNo} has already been paid or changed.`);
  }
  const { method, status } = checkMethod(state, ctx, code, referenceNo, {
    requireReference: p.type !== 'walkin',
  });
  const patch = {
    method: method.code,
    referenceNo: referenceNo || null,
    status,
    at: iso(ctx),
    staffId: ctx.actor.id,
    note: status === 'pending' ? 'Waiting for the owner to confirm the transfer' : null,
  };
  let next = { ...state, payments: replace(state.payments, p.id, patch) };
  if (status === 'paid' && p.pendingRenewal) next = activateRenewal(next, { ...p, ...patch }, ctx);
  return { state: next, result: { payment: { ...p, ...patch } } };
}

function activateRenewal(state, payment, ctx) {
  const t = today(ctx);
  const member = indexes(state).member.get(payment.memberId);
  const info = memberInfo(state, member, t);
  const r = payment.pendingRenewal;
  const plan = indexes(state).plan.get(r.planId) ?? { durationMonths: 1, durationDays: 0 };
  // If time passed while waiting, start the period when it can start now.
  const earliest = renewalStartDate(info.endDate, t);
  const startDate = r.startDate < earliest ? earliest : r.startDate;
  const endDate = startDate === r.startDate ? r.endDate : computeEndDate(startDate, plan);
  const sub = {
    id: newId(),
    memberId: payment.memberId,
    planId: r.planId,
    planName: r.planName,
    price: r.price,
    startDate,
    endDate,
    status: 'active',
    paymentId: payment.id,
    createdAt: iso(ctx),
  };
  return {
    ...state,
    subscriptions: [...state.subscriptions, sub],
    payments: replace(state.payments, payment.id, {
      subscriptionId: sub.id,
      pendingRenewal: null,
      detail: periodText(startDate, endDate),
    }),
  };
}

/** Owner confirms a bank transfer: the payment counts and the membership period starts. */
export function confirmPayment(state, { paymentId }, ctx) {
  requireOwner(ctx);
  const p = findOr404(indexes(state).payment, paymentId, 'Payment');
  if (p.status !== 'pending' || !p.method) {
    throw new DemoError(`${p.txnNo} is not waiting for confirmation.`);
  }
  let next = {
    ...state,
    payments: replace(state.payments, p.id, { status: 'paid', note: null, confirmedAt: iso(ctx) }),
    auditLogs: audit(state, ctx, 'payment', `confirmed ${p.txnNo} (${formatPeso(p.amount)})`),
  };
  if (p.pendingRenewal) next = activateRenewal(next, p, ctx);
  return { state: next, result: {} };
}

/** Void (entered by mistake) or refund (money given back). Owner only; history is kept. */
export function correctPayment(state, { paymentId, action, reason }, ctx) {
  const owner = requireOwner(ctx);
  const data = parse(paymentCorrectionSchema, { action, reason });
  const ix = indexes(state);
  const p = findOr404(ix.payment, paymentId, 'Payment');
  if (data.action === 'refund' && p.status !== 'paid') {
    throw new DemoError('Only a paid payment can be refunded.');
  }
  if (data.action === 'void' && !['paid', 'pending'].includes(p.status)) {
    throw new DemoError(`${p.txnNo} is already ${p.status}.`);
  }
  const status = data.action === 'void' ? 'voided' : 'refunded';
  let next = {
    ...state,
    payments: replace(state.payments, p.id, {
      status,
      pendingRenewal: null,
      correction: { action: data.action, reason: data.reason, by: owner.id, at: iso(ctx) },
    }),
    auditLogs: audit(
      state,
      ctx,
      data.action,
      `${status} ${p.txnNo} (${formatPeso(p.amount)})`,
      data.reason,
    ),
  };
  // A membership period paid by this payment no longer counts.
  if (p.subscriptionId) {
    next.subscriptions = replace(next.subscriptions, p.subscriptionId, { status: 'cancelled' });
  }
  // Products go back on the shelf.
  if (p.type === 'product' && p.status === 'paid' && p.items) {
    let items = next.items;
    const movements = [...next.movements];
    for (const line of p.items) {
      const item = indexes(state).item.get(line.itemId);
      if (!item) continue;
      items = replace(items, item.id, (x) => ({ quantity: x.quantity + line.quantity }));
      movements.push({
        id: newId(),
        itemId: item.id,
        type: data.action === 'refund' ? 'return' : 'count_add',
        quantity: line.quantity,
        date: today(ctx),
        at: iso(ctx),
        remarks: `${data.action === 'refund' ? 'Refunded' : 'Voided'} ${p.txnNo}`,
        staffId: owner.id,
      });
    }
    next = { ...next, items, movements };
  }
  return { state: next, result: {} };
}

/** Note that the receipt was sent by SMS (the SMS itself needs the cloud service). */
export function markReceiptSent(state, { paymentId, to }, ctx) {
  requireStaff(ctx);
  const p = findOr404(indexes(state).payment, paymentId, 'Payment');
  if (p.status !== 'paid') throw new DemoError('Only a paid payment has a receipt to send.');
  if (!/^09\d{9}$/.test(String(to).replace(/\D/g, ''))) {
    throw new DemoError('Enter 11 digits, like 0917 123 4567', {
      fields: { to: 'Enter 11 digits, like 0917 123 4567' },
    });
  }
  return {
    state: {
      ...state,
      payments: replace(state.payments, p.id, {
        sms: { to: String(to).replace(/\D/g, ''), at: iso(ctx), by: ctx.actor.id },
      }),
    },
    result: {},
  };
}

// ── Walk-ins ─────────────────────────────────────────────────────────────────────────────

/**
 * Register Walk-in: time in is now. Reuses the customer if they've been before (same number, or
 * same name with no number), so no duplicate person is made.
 * @returns {{ visit, customer, returning, payment }}
 */
export function registerVisit(state, input, ctx) {
  requireStaff(ctx);
  const data = parse(walkinVisitCreateSchema, input);
  const ix = indexes(state);
  let existing = data.walkinCustomerId ? ix.customer.get(data.walkinCustomerId) : null;
  if (!existing && data.contactNumber) {
    existing = state.customers.find((c) => c.phone === data.contactNumber) ?? null;
  }
  if (!existing && !data.contactNumber) {
    const key = data.customerName.toLowerCase();
    existing = state.customers.find((c) => !c.phone && c.name.toLowerCase() === key) ?? null;
  }
  const customer = existing ?? {
    id: newId(),
    name: data.customerName,
    phone: data.contactNumber,
    memberId: null,
  };
  const open = state.visits.find(
    (v) => v.customerId === customer.id && !v.timeOut && dayOf(v.timeIn) === today(ctx),
  );
  if (open) throw new DemoError(`${customer.name} is already inside. Complete that visit first.`);
  const method = data.paymentMethodCode
    ? checkMethod(state, ctx, data.paymentMethodCode, data.referenceNo, { requireReference: false })
        .method
    : null;
  const fee = state.settings.walkinFees[data.feeType] ?? data.fee;
  const visit = {
    id: newId(),
    customerId: customer.id,
    feeType: data.feeType,
    fee,
    timeIn: iso(ctx),
    timeOut: null,
    paymentId: null,
  };
  const payment = newPayment(state, ctx, {
    type: 'walkin',
    walkinVisitId: visit.id,
    customerName: customer.name,
    description: 'Walk-in day pass',
    detail: data.feeType === 'student' ? 'Student rate' : 'Regular rate',
    amount: fee,
    method: method?.code ?? null,
    referenceNo: data.referenceNo,
    status: method ? 'paid' : 'pending',
  });
  visit.paymentId = payment.id;
  return {
    state: {
      ...state,
      customers: existing ? state.customers : [...state.customers, customer],
      visits: [...state.visits, visit],
      payments: [...state.payments, payment],
    },
    result: { visit, customer, returning: Boolean(existing), payment },
  };
}

export function payVisit(state, { visitId, method, referenceNo }, ctx) {
  const visit = findOr404(indexes(state).visit, visitId, 'Visit');
  return collectPayment(state, { paymentId: visit.paymentId, method, referenceNo }, ctx);
}

export function completeVisit(state, { visitId }, ctx) {
  requireStaff(ctx);
  const visit = findOr404(indexes(state).visit, visitId, 'Visit');
  if (visit.timeOut) return { state, result: { visit } };
  return {
    state: { ...state, visits: replace(state.visits, visitId, { timeOut: iso(ctx) }) },
    result: { visit: { ...visit, timeOut: iso(ctx) } },
  };
}

// ── Attendance ───────────────────────────────────────────────────────────────────────────

/** Check a member in. Rules: allowed status, and not already inside today. */
export function checkIn(state, { memberId }, ctx) {
  requireStaff(ctx);
  const member = findOr404(indexes(state).member, memberId, 'Member');
  const t = today(ctx);
  const info = memberInfo(state, member, t);
  if (info.status === MEMBERSHIP_STATUS.SUSPENDED || !canEnter(info.status)) {
    throw new DemoError(`${member.name} can’t check in: membership ${info.statusLabel}.`);
  }
  if (state.checkIns.some((c) => c.memberId === memberId && !c.timeOut && dayOf(c.timeIn) === t)) {
    throw new DemoError(`${member.name} is already checked in.`);
  }
  const record = { id: newId(), memberId, timeIn: iso(ctx), timeOut: null, fix: null };
  return {
    state: { ...state, checkIns: [...state.checkIns, record] },
    result: { checkIn: record },
  };
}

export function checkOut(state, { checkInId }, ctx) {
  requireStaff(ctx);
  const record = state.checkIns.find((c) => c.id === checkInId);
  if (!record || record.timeOut) throw new DemoError('This visit is already checked out.');
  const updated = { ...record, timeOut: iso(ctx) };
  return {
    state: { ...state, checkIns: replace(state.checkIns, checkInId, { timeOut: updated.timeOut }) },
    result: { checkIn: updated },
  };
}

export function recordRejection(state, { kind, memberId }, ctx) {
  const rejection = { id: newId(), at: iso(ctx), kind, memberId: memberId ?? null };
  return {
    state: { ...state, rejections: [...state.rejections, rejection] },
    result: { rejection },
  };
}

/** Fix a missed check-out: the time out staff entered and why (written to the audit history). */
export function fixTimeOut(state, { checkInId, timeOut, reason }, ctx) {
  requireStaff(ctx);
  const record = state.checkIns.find((c) => c.id === checkInId);
  if (!record || record.timeOut) throw new DemoError('This visit already has a time out.');
  if (!reason?.trim()) throw new DemoError('Choose why.', { fields: { reason: 'Choose why' } });
  if (timeOut <= record.timeIn || timeOut > iso(ctx)) {
    throw new DemoError('The time out must be after the time in and not in the future.');
  }
  const member = indexes(state).member.get(record.memberId);
  return {
    state: {
      ...state,
      checkIns: replace(state.checkIns, checkInId, { timeOut, fix: { reason, at: iso(ctx) } }),
      auditLogs: audit(
        state,
        ctx,
        'attendance',
        `fixed missed check-out for ${member?.name ?? 'a member'}`,
        reason,
      ),
    },
    result: {},
  };
}

// ── Inventory ────────────────────────────────────────────────────────────────────────────

/** Add Item or Save Changes on an item. Owner only (prices). Quantity changes only by movements. */
export function saveItem(state, { id, ...fields }, ctx) {
  requireOwner(ctx);
  const data = parse(inventoryItemSchema, {
    ...fields,
    sellingPrice: fields.sellingPrice === '' ? null : fields.sellingPrice,
  });
  const key = data.name.toLowerCase();
  if (state.items.some((i) => i.name.toLowerCase() === key && i.id !== id)) {
    throw new DemoError(`${data.name} is already in the list.`, {
      fields: { name: 'An item with this name already exists' },
    });
  }
  const values = {
    name: data.name,
    category: data.category,
    unit: data.unit,
    costPrice: data.costPrice,
    sellingPrice: data.sellingPrice ?? null,
    reorderLevel: data.reorderLevel,
  };
  if (!id) {
    const item = { id: newId(), ...values, quantity: 0, createdAt: iso(ctx) };
    return {
      state: {
        ...state,
        items: [...state.items, item],
        auditLogs: audit(state, ctx, 'stock', `added item ${item.name}`),
      },
      result: { item },
    };
  }
  const old = findOr404(indexes(state).item, id, 'Item');
  const changes = [];
  if (old.sellingPrice !== values.sellingPrice) {
    changes.push(
      `${old.name} price ${old.sellingPrice === null ? '—' : formatPeso(old.sellingPrice)} → ${values.sellingPrice === null ? '—' : formatPeso(values.sellingPrice)}`,
    );
  }
  return {
    state: {
      ...state,
      items: replace(state.items, id, values),
      auditLogs: changes.length
        ? audit(state, ctx, 'price', `changed ${changes.join(', ')}`)
        : state.auditLogs,
    },
    result: { item: { ...old, ...values } },
  };
}

/** Stock In / Stock Out. Stock can never go below 0. */
export function moveStock(state, input, ctx) {
  requireStaff(ctx);
  const data = parse(stockMovementSchema, input);
  const item = findOr404(indexes(state).item, data.itemId, 'Item');
  const direction = STOCK_MOVEMENT_TYPES[data.type].direction;
  const change = direction * data.quantity;
  if (item.quantity + change < 0) {
    throw new DemoError(`You can’t remove more than the ${item.quantity} ${item.unit} in stock.`, {
      fields: { quantity: `Only ${item.quantity} in stock` },
    });
  }
  if (data.movementDate > today(ctx)) {
    throw new DemoError('The date can’t be in the future.', {
      fields: { movementDate: 'Not in the future' },
    });
  }
  const movement = {
    id: newId(),
    itemId: item.id,
    type: data.type,
    quantity: change,
    date: data.movementDate,
    at: iso(ctx),
    remarks: data.remarks,
    staffId: ctx.actor.id,
  };
  const label = STOCK_MOVEMENT_TYPES[data.type].label;
  return {
    state: {
      ...state,
      movements: [...state.movements, movement],
      items: replace(state.items, item.id, { quantity: item.quantity + change }),
      auditLogs:
        direction < 0
          ? audit(state, ctx, 'stock', `stock out · ${data.quantity} × ${item.name} (${label})`)
          : state.auditLogs,
    },
    result: { movement, quantity: item.quantity + change },
  };
}

// ── Plans, settings and staff (Owner) ────────────────────────────────────────────────────

/** Add or edit a membership plan. Price changes apply to new sign-ups and renewals only. */
export function savePlan(state, { id, ...fields }, ctx) {
  requireOwner(ctx);
  const data = parse(planSchema, fields);
  const key = data.name.toLowerCase();
  if (state.plans.some((p) => p.name.toLowerCase() === key && p.id !== id)) {
    throw new DemoError(`A plan called ${data.name} already exists.`, {
      fields: { name: 'This name is already used' },
    });
  }
  const values = {
    name: data.name,
    durationMonths: data.durationMonths,
    durationDays: data.durationDays,
    price: data.price,
    description: data.description,
    isActive: data.isActive,
  };
  if (!id) {
    const plan = { id: newId(), ...values };
    return {
      state: {
        ...state,
        plans: [...state.plans, plan],
        auditLogs: audit(
          state,
          ctx,
          'price',
          `added plan ${plan.name} (${formatPeso(plan.price)})`,
        ),
      },
      result: { plan },
    };
  }
  const old = findOr404(indexes(state).plan, id, 'Plan');
  const auditLogs =
    old.price !== values.price
      ? audit(
          state,
          ctx,
          'price',
          `changed ${old.name} price ${formatPeso(old.price)} → ${formatPeso(values.price)}`,
        )
      : audit(state, ctx, 'price', `edited plan ${values.name}`);
  return {
    state: { ...state, plans: replace(state.plans, id, values), auditLogs },
    result: { plan: { ...old, ...values } },
  };
}

export function setPlanActive(state, { planId, isActive }, ctx) {
  requireOwner(ctx);
  const plan = findOr404(indexes(state).plan, planId, 'Plan');
  return {
    state: {
      ...state,
      plans: replace(state.plans, planId, { isActive }),
      auditLogs: audit(
        state,
        ctx,
        'price',
        `${isActive ? 'turned on' : 'turned off'} plan ${plan.name}`,
      ),
    },
    result: {},
  };
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Gym Information and Gym Capacity. */
export function updateSettings(state, patch, ctx) {
  requireOwner(ctx);
  const fields = {};
  const next = { ...state.settings, ...patch };
  if (!next.gymName?.trim()) fields.gymName = 'Enter the gym name';
  if (
    next.contactNumber &&
    !/^09\d{9}$|^0\d{1,2}\d{7,8}$/.test(String(next.contactNumber).replace(/[\s-]/g, ''))
  ) {
    fields.contactNumber = 'Enter a mobile or landline number';
  }
  if (!HH_MM.test(next.opensAt)) fields.opensAt = 'Choose a time';
  if (!HH_MM.test(next.closesAt)) fields.closesAt = 'Choose a time';
  if (HH_MM.test(next.opensAt) && HH_MM.test(next.closesAt) && next.closesAt <= next.opensAt) {
    fields.closesAt = 'Must be after the opening time';
  }
  const cap = Number(next.maxCapacity);
  if (!Number.isInteger(cap) || cap < 1 || cap > 1000) fields.maxCapacity = 'Enter 1 to 1,000';
  for (const k of ['regular', 'student']) {
    const fee = Number(next.walkinFees?.[k]);
    if (!(fee > 0)) fields[`walkinFees.${k}`] = 'Enter an amount above ₱0';
  }
  if (Object.keys(fields).length) throw new DemoError(Object.values(fields)[0], { fields });
  const settings = {
    ...next,
    gymName: next.gymName.trim(),
    contactNumber: String(next.contactNumber ?? '').trim(),
    address: String(next.address ?? '').trim(),
    maxCapacity: cap,
    warningPct: Number(next.warningPct),
    walkinFees: {
      regular: Number(next.walkinFees.regular),
      student: Number(next.walkinFees.student),
    },
  };
  const feeChanged =
    settings.walkinFees.regular !== state.settings.walkinFees.regular ||
    settings.walkinFees.student !== state.settings.walkinFees.student;
  return {
    state: {
      ...state,
      settings,
      auditLogs: audit(
        state,
        ctx,
        feeChanged ? 'price' : 'settings',
        feeChanged
          ? `changed walk-in fees to ${formatPeso(settings.walkinFees.regular)} / ${formatPeso(settings.walkinFees.student)}`
          : 'updated gym settings',
      ),
    },
    result: { settings },
  };
}

export function setPaymentMethod(state, { code, enabled }, ctx) {
  requireOwner(ctx);
  if (!enabled && state.paymentMethods.filter((m) => m.enabled).length <= 1) {
    throw new DemoError('Keep at least one payment method turned on.');
  }
  const method = state.paymentMethods.find((m) => m.code === code);
  return {
    state: {
      ...state,
      paymentMethods: state.paymentMethods.map((m) => (m.code === code ? { ...m, enabled } : m)),
      auditLogs: audit(
        state,
        ctx,
        'settings',
        `${enabled ? 'turned on' : 'turned off'} ${method?.name ?? code}`,
      ),
    },
    result: {},
  };
}

export function addPaymentMethod(state, { name, note, requiresReference }, ctx) {
  requireOwner(ctx);
  const clean = name?.trim() ?? '';
  if (clean.length < 2) throw new DemoError('Enter a name.', { fields: { name: 'Enter a name' } });
  const code = clean
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  if (
    state.paymentMethods.some(
      (m) => m.code === code || m.name.toLowerCase() === clean.toLowerCase(),
    )
  ) {
    throw new DemoError(`${clean} is already in the list.`, {
      fields: { name: 'Already in the list' },
    });
  }
  const method = {
    code,
    name: clean,
    note: note?.trim() ?? '',
    requiresReference: Boolean(requiresReference),
    needsOwnerConfirmation: false,
    enabled: true,
  };
  return {
    state: {
      ...state,
      paymentMethods: [...state.paymentMethods, method],
      auditLogs: audit(state, ctx, 'settings', `added payment method ${clean}`),
    },
    result: { method },
  };
}

const USERNAME = /^[a-z0-9._-]{3,30}$/;

export function saveStaff(state, { id, name, username, role, password }, ctx) {
  requireOwner(ctx);
  const fields = {};
  const cleanName = name?.trim() ?? '';
  const cleanUser = username?.trim().toLowerCase() ?? '';
  if (cleanName.length < 2) fields.name = 'Enter the full name';
  if (!USERNAME.test(cleanUser)) fields.username = '3–30 letters, numbers, dots or dashes';
  else if (state.staff.some((s) => s.username === cleanUser && s.id !== id)) {
    fields.username = 'This username is taken';
  }
  if (![ROLES.OWNER, ROLES.RECEPTIONIST].includes(role)) fields.role = 'Choose a role';
  if (!id && (password ?? '').length < 8) fields.password = 'Use at least 8 characters';
  if (id === ctx.actor.id && role !== ROLES.OWNER)
    fields.role = 'You can’t remove your own Owner access';
  if (Object.keys(fields).length) throw new DemoError(Object.values(fields)[0], { fields });
  if (!id) {
    const staff = {
      id: newId(),
      name: cleanName,
      username: cleanUser,
      email: `${cleanUser.split('.')[0]}@ironcampusgym.ph`,
      role,
      status: 'active',
      password,
      lastLoginAt: null,
    };
    return {
      state: {
        ...state,
        staff: [...state.staff, staff],
        auditLogs: audit(state, ctx, 'staff', `added staff account ${cleanUser}`),
      },
      result: { staff },
    };
  }
  return {
    state: {
      ...state,
      staff: replace(state.staff, id, { name: cleanName, username: cleanUser, role }),
      auditLogs: audit(state, ctx, 'staff', `edited staff account ${cleanUser}`),
    },
    result: {},
  };
}

export function setStaffStatus(state, { staffId, status }, ctx) {
  requireOwner(ctx);
  const staff = findOr404(indexes(state).staff, staffId, 'Staff account');
  if (staffId === ctx.actor.id) throw new DemoError('You can’t turn off your own account.');
  return {
    state: {
      ...state,
      staff: replace(state.staff, staffId, { status }),
      auditLogs: audit(
        state,
        ctx,
        'staff',
        `${status === 'active' ? 'enabled' : 'disabled'} account ${staff.username}`,
      ),
    },
    result: {},
  };
}

/** Owner sets a new temporary password for a staff member. Returns it to show once. */
export function resetStaffPassword(state, { staffId }, ctx) {
  requireOwner(ctx);
  const staff = findOr404(indexes(state).staff, staffId, 'Staff account');
  const password = tempPassword();
  return {
    state: {
      ...state,
      staff: replace(state.staff, staffId, { password }),
      auditLogs: audit(state, ctx, 'staff', `reset the password of ${staff.username}`),
    },
    result: { password },
  };
}

export function changeOwnPassword(state, { current, next, confirm }, ctx) {
  const actor = requireStaff(ctx);
  const me = indexes(state).staff.get(actor.id);
  const fields = {};
  if (!me || me.password !== current) fields.current = 'This is not your current password';
  if ((next ?? '').length < 8) fields.next = 'Use at least 8 characters';
  else if (next === current) fields.next = 'Choose a different password';
  if (confirm !== next) fields.confirm = 'The two new passwords don’t match';
  if (Object.keys(fields).length) throw new DemoError(Object.values(fields)[0], { fields });
  return {
    state: { ...state, staff: replace(state.staff, actor.id, { password: next }) },
    result: {},
  };
}

// ── Member portal ────────────────────────────────────────────────────────────────────────

export function memberUpdateContact(state, { memberId, email, contactNumber }) {
  const member = findOr404(indexes(state).member, memberId, 'Member');
  const data = parse(memberUpdateSchema.required({ contactNumber: true }), {
    email,
    contactNumber,
  });
  checkDuplicatePhone(state, data.contactNumber, memberId);
  return {
    state: {
      ...state,
      members: replace(state.members, memberId, {
        email: data.email ?? null,
        phone: data.contactNumber,
      }),
    },
    result: { member },
  };
}

export function memberChangePassword(state, { memberId, current, next, confirm }) {
  const member = findOr404(indexes(state).member, memberId, 'Member');
  const fields = {};
  if (member.portalPassword !== current) fields.current = 'This is not your current password';
  if ((next ?? '').length < 8) fields.next = 'Use at least 8 characters';
  if (confirm !== next) fields.confirm = 'The two new passwords don’t match';
  if (Object.keys(fields).length) throw new DemoError(Object.values(fields)[0], { fields });
  return {
    state: { ...state, members: replace(state.members, memberId, { portalPassword: next }) },
    result: {},
  };
}

export function markNotificationsRead(state, { memberId, ids }) {
  const member = findOr404(indexes(state).member, memberId, 'Member');
  const read = new Set([...(member.readNotifications ?? []), ...ids]);
  return {
    state: {
      ...state,
      members: replace(state.members, memberId, { readNotifications: [...read] }),
    },
    result: {},
  };
}
