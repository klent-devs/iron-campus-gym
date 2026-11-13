import { addDays, computeEndDate, todayInGym } from '@icg/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DemoError,
  actions,
  buildDashboard,
  createDemoStore,
  createSeed,
  memberNotifications,
  memberView,
  membersView,
  STORAGE_KEY,
} from '../src/index.js';

// 10:52 AM in Manila on Tue 10 Nov 2026.
const NOW = new Date('2026-11-10T02:52:00Z');
const TODAY = todayInGym(NOW);

const seed = createSeed(NOW);
const owner = seed.staff.find((s) => s.username === 'marco.owner');
const desk = seed.staff.find((s) => s.username === 'joy.frontdesk');
const byName = (state, name) => membersView(state, TODAY).find((m) => m.name === name);
const run = (state, action, input, actor = desk) => action(state, input, { now: NOW, actor });
const plan = (state, name) => state.plans.find((p) => p.name === name);

describe('sample data seed', () => {
  it('is repeatable for the same day', () => {
    expect(createSeed(NOW).members.map((m) => m.code)).toEqual(seed.members.map((m) => m.code));
  });

  it('has unique Member IDs and transaction numbers, and the next Member ID follows the design', () => {
    const codes = seed.members.map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
    const txns = seed.payments.map((p) => p.txnNo);
    expect(new Set(txns).size).toBe(txns.length);
    expect(actions.nextMemberCode(seed, NOW)).toBe('ICG-2026-0643');
  });

  it('stock equals the sum of its movements and is never below 0', () => {
    for (const item of seed.items) {
      const sum = seed.movements
        .filter((m) => m.itemId === item.id)
        .reduce((s, m) => s + m.quantity, 0);
      expect(item.quantity).toBe(sum);
      expect(item.quantity).toBeGreaterThanOrEqual(0);
    }
    expect(seed.items.find((i) => i.name === 'Sports Drink 500ml').quantity).toBe(0);
  });

  it('shows the design’s members with the right status', () => {
    expect(byName(seed, 'Andrea Lim')).toMatchObject({ code: 'ICG-2025-0291', status: 'active' });
    expect(byName(seed, 'Paolo Reyes')).toMatchObject({ status: 'expiring_soon', daysLeft: 3 });
    expect(byName(seed, 'Jerome Castro')).toMatchObject({ status: 'expired', daysLeft: -12 });
    expect(byName(seed, 'Lea Gonzales')).toMatchObject({ status: 'suspended', balance: 1200 });
  });

  it('every paid membership period is linked to its payment', () => {
    for (const s of seed.subscriptions.filter((x) => x.paymentId)) {
      const p = seed.payments.find((x) => x.id === s.paymentId);
      expect(p.subscriptionId).toBe(s.id);
    }
  });
});

describe('members', () => {
  const input = (extra = {}) => ({
    fullName: 'Ana Cruz',
    contactNumber: '0917 555 0001',
    email: '',
    address: '',
    planId: plan(seed, 'Monthly').id,
    startDate: TODAY,
    payment: { paymentMethodCode: 'cash', amount: 1200, amountReceived: 1500 },
    ...extra,
  });

  it('Add Member creates the member, the first period and the payment', () => {
    const { state, result } = run(seed, actions.addMember, input());
    expect(result.member.code).toBe('ICG-2026-0643');
    expect(result.subscription.endDate).toBe(computeEndDate(TODAY, plan(seed, 'Monthly')));
    expect(result.payment).toMatchObject({ type: 'membership_new', status: 'paid', amount: 1200 });
    expect(memberView(state, result.member.id, TODAY).status).toBe('active');
  });

  it('links a walk-in customer with the same number instead of making a duplicate', () => {
    const { state, result } = run(
      seed,
      actions.addMember,
      input({ fullName: 'Carlo Tan', contactNumber: '0917 882 4410' }),
    );
    const carlo = state.customers.find((c) => c.name === 'Carlo Tan');
    expect(carlo.memberId).toBe(result.member.id);
    expect(result.member.walkinCustomerId).toBe(carlo.id);
  });

  it('rejects a number another member uses, a past start date and too little cash', () => {
    expect(() => run(seed, actions.addMember, input({ contactNumber: '09053379021' }))).toThrow(
      /Andrea Lim/,
    );
    expect(() => run(seed, actions.addMember, input({ startDate: addDays(TODAY, -1) }))).toThrow(
      /past/,
    );
    expect(() =>
      run(
        seed,
        actions.addMember,
        input({ payment: { paymentMethodCode: 'cash', amount: 1200, amountReceived: 1000 } }),
      ),
    ).toThrow(/less than/);
  });

  it('a bank transfer by a receptionist waits for the Owner; confirming starts the period', () => {
    const pay = { paymentMethodCode: 'bank_transfer', amount: 1200, referenceNo: 'BDO-1234' };
    const { state, result } = run(seed, actions.addMember, input({ payment: pay }));
    expect(result.payment.status).toBe('pending');
    expect(result.subscription).toBeNull();
    expect(memberView(state, result.member.id, TODAY).status).toBe('pending');
    expect(() => run(state, actions.confirmPayment, { paymentId: result.payment.id })).toThrow(
      /Only the Owner/,
    );
    const confirmed = run(
      state,
      actions.confirmPayment,
      { paymentId: result.payment.id },
      owner,
    ).state;
    expect(memberView(confirmed, result.member.id, TODAY).status).toBe('active');
  });

  it('renewal starts the day after the current period and keeps the Member ID and QR code', () => {
    const paolo = byName(seed, 'Paolo Reyes');
    const { state, result } = run(seed, actions.renewMember, {
      memberId: paolo.id,
      planId: plan(seed, 'Monthly').id,
      payment: { paymentMethodCode: 'gcash', amount: 1200, referenceNo: '7012448903100' },
    });
    expect(result.subscription.startDate).toBe(addDays(paolo.endDate, 1));
    const after = memberView(state, paolo.id, TODAY);
    expect(after).toMatchObject({ code: paolo.code, qrToken: paolo.qrToken, status: 'active' });
    expect(state.members).toHaveLength(seed.members.length);
  });

  it('an expired member’s renewal starts today; suspended members can’t renew', () => {
    const jerome = byName(seed, 'Jerome Castro');
    const pay = { paymentMethodCode: 'cash', amount: 1200 };
    const { result } = run(seed, actions.renewMember, {
      memberId: jerome.id,
      planId: plan(seed, 'Monthly').id,
      payment: pay,
    });
    expect(result.subscription.startDate).toBe(TODAY);
    const lea = byName(seed, 'Lea Gonzales');
    expect(() =>
      run(seed, actions.renewMember, {
        memberId: lea.id,
        planId: plan(seed, 'Monthly').id,
        payment: pay,
      }),
    ).toThrow(/suspended/);
  });

  it('suspending writes to the audit history; only the Owner lifts it and the days come back', () => {
    const andrea = byName(seed, 'Andrea Lim');
    const s1 = run(seed, actions.suspendMember, {
      memberId: andrea.id,
      reason: 'Rule violation',
    }).state;
    expect(memberView(s1, andrea.id, TODAY).status).toBe('suspended');
    expect(s1.auditLogs.at(-1)).toMatchObject({ action: 'suspend', reason: 'Rule violation' });
    expect(() => run(s1, actions.liftSuspension, { memberId: andrea.id })).toThrow(
      /Only the Owner/,
    );
    const later = new Date(NOW.getTime() + 5 * 86_400_000);
    const s2 = actions.liftSuspension(s1, { memberId: andrea.id }, { now: later, actor: owner });
    expect(s2.result.addedDays).toBe(5);
    expect(memberView(s2.state, andrea.id, todayInGym(later)).endDate).toBe(
      addDays(andrea.endDate, 5),
    );
  });
});

describe('attendance', () => {
  it('lets active members in once, and rejects expired and suspended members', () => {
    const daniel = byName(seed, 'Daniel Cruz');
    const s1 = run(seed, actions.checkIn, { memberId: daniel.id }).state;
    expect(() => run(s1, actions.checkIn, { memberId: daniel.id })).toThrow(/already checked in/);
    expect(() =>
      run(seed, actions.checkIn, { memberId: byName(seed, 'Jerome Castro').id }),
    ).toThrow(/Expired/);
    expect(() => run(seed, actions.checkIn, { memberId: byName(seed, 'Lea Gonzales').id })).toThrow(
      /Suspended/,
    );
  });
});

describe('payments', () => {
  it('voids and refunds are Owner-only, need a reason and keep the payment', () => {
    const p = seed.payments.find((x) => x.type === 'product' && x.status === 'paid');
    expect(() =>
      run(seed, actions.correctPayment, {
        paymentId: p.id,
        action: 'refund',
        reason: 'Product returned',
      }),
    ).toThrow(DemoError);
    expect(() =>
      run(seed, actions.correctPayment, { paymentId: p.id, action: 'refund', reason: '' }, owner),
    ).toThrow();
    const { state } = run(
      seed,
      actions.correctPayment,
      { paymentId: p.id, action: 'refund', reason: 'Product returned' },
      owner,
    );
    expect(state.payments).toHaveLength(seed.payments.length);
    expect(state.payments.find((x) => x.id === p.id).status).toBe('refunded');
    const line = p.items[0];
    const before = seed.items.find((i) => i.id === line.itemId).quantity;
    expect(state.items.find((i) => i.id === line.itemId).quantity).toBe(before + line.quantity);
    expect(state.auditLogs.at(-1)).toMatchObject({ action: 'refund', reason: 'Product returned' });
  });

  it('voiding a membership payment cancels the period it paid for', () => {
    const p = seed.payments.find(
      (x) => x.subscriptionId && x.status === 'paid' && x.customerName === 'Andrea Lim',
    );
    const { state } = run(
      seed,
      actions.correctPayment,
      { paymentId: p.id, action: 'void', reason: 'Entered twice' },
      owner,
    );
    expect(state.subscriptions.find((s) => s.id === p.subscriptionId).status).toBe('cancelled');
  });

  it('selling a product takes it out of stock, but never below 0', () => {
    const item = seed.items.find((i) => i.name === 'Bottled Water 500ml');
    const { state } = run(seed, actions.sellProduct, {
      itemId: item.id,
      quantity: 2,
      method: 'cash',
    });
    expect(state.items.find((i) => i.id === item.id).quantity).toBe(item.quantity - 2);
    expect(() =>
      run(seed, actions.sellProduct, {
        itemId: item.id,
        quantity: item.quantity + 1,
        method: 'cash',
      }),
    ).toThrow(/Only/);
  });
});

describe('walk-ins and stock', () => {
  it('reuses a walk-in customer by number and uses the fee from Settings', () => {
    const changed = run(
      seed,
      actions.updateSettings,
      { walkinFees: { regular: 120, student: 90 } },
      owner,
    ).state;
    const { result } = run(changed, actions.registerVisit, {
      customerName: 'Joanna F.',
      contactNumber: '0916 330 5590',
      fee: 100,
      feeType: 'regular',
      paymentMethodCode: 'cash',
    });
    expect(result.returning).toBe(true);
    expect(result.customer.name).toBe('Joanna Flores');
    expect(result.visit.fee).toBe(120);
  });

  it('stock out can’t remove more than is in stock', () => {
    const item = seed.items.find((i) => i.name === 'Whey Sachet 30g');
    const input = {
      itemId: item.id,
      type: 'sold',
      quantity: item.quantity + 1,
      movementDate: TODAY,
    };
    expect(() => run(seed, actions.moveStock, input)).toThrow(/can’t remove more/);
    const { state } = run(seed, actions.moveStock, { ...input, type: 'delivery', quantity: 24 });
    expect(state.items.find((i) => i.id === item.id).quantity).toBe(item.quantity + 24);
  });

  it('only the Owner changes prices and settings', () => {
    expect(() =>
      run(seed, actions.savePlan, {
        name: 'Weekly',
        durationMonths: 0,
        durationDays: 7,
        price: 400,
      }),
    ).toThrow(/Only the Owner/);
    expect(() => run(seed, actions.updateSettings, { maxCapacity: 80 })).toThrow(/Only the Owner/);
  });
});

describe('sign-in', () => {
  it('checks the password and turned-off accounts', () => {
    expect(
      run(seed, actions.signIn, { identifier: 'Marco.Owner', password: 'owner1234' }).result.staff
        .id,
    ).toBe(owner.id);
    expect(() =>
      run(seed, actions.signIn, { identifier: 'marco.owner', password: 'nope' }),
    ).toThrow(/Wrong/);
    expect(() =>
      run(seed, actions.signIn, { identifier: 'aira.d', password: 'frontdesk3' }),
    ).toThrow(/turned off/);
  });
});

describe('dashboard and notifications', () => {
  it('counts every member and hides revenue from receptionists', () => {
    const d = buildDashboard(seed, { now: NOW, includeRevenue: false });
    expect(d.members.total).toBe(seed.members.length);
    expect(d.revenue).toBeNull();
    expect(d.alerts.stock).toMatchObject({ lowCount: 3, outCount: 1 });
    expect(
      buildDashboard(seed, { now: NOW, includeRevenue: true }).revenueChart.months,
    ).toHaveLength(12);
  });

  it('gives a member their payment and check-in notifications', () => {
    const andrea = byName(seed, 'Andrea Lim');
    const list = memberNotifications(seed, andrea.id, NOW);
    expect(list.some((n) => n.kind === 'pay' && n.unread)).toBe(true);
    expect(list.some((n) => n.kind === 'in')).toBe(true);
  });
});

describe('store', () => {
  let storage;
  beforeEach(() => {
    const data = new Map();
    storage = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: (k) => data.delete(k),
    };
  });

  it('saves changes in the browser and loads them again', () => {
    const a = createDemoStore({
      storage,
      now: () => NOW,
      getActor: (s) => s.staff[1],
      listen: false,
    });
    const paolo = byName(a.getState(), 'Paolo Reyes');
    a.run(actions.suspendMember, { memberId: paolo.id, reason: 'Rule violation' });
    expect(storage.getItem(STORAGE_KEY)).toContain('Rule violation');
    const b = createDemoStore({ storage, now: () => NOW, listen: false });
    expect(memberView(b.getState(), paolo.id, TODAY).status).toBe('suspended');
    b.reset();
    expect(memberView(b.getState(), paolo.id, TODAY).status).toBe('expiring_soon');
  });

  it('keeps working without storage (private window)', () => {
    const blocked = {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {},
    };
    const s = createDemoStore({
      storage: blocked,
      now: () => NOW,
      getActor: (x) => x.staff[1],
      listen: false,
    });
    expect(s.persistent).toBe(false);
    expect(s.getState().members.length).toBeGreaterThan(200);
  });
});
