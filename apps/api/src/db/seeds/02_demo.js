/**
 * Demo data for development only (sample names from the design). Dates are relative to
 * today so the statuses stay realistic: active, expiring soon, expired, suspended.
 * Skipped in production and when members already exist.
 */
import { ROLES, addDays, computeEndDate, todayInGym } from '@icg/shared';
import { nextMemberCode, nextTransactionNo } from '../../lib/counters.js';
import { generateQrToken } from '../../lib/qrToken.js';

export async function seed(knex) {
  if (process.env.NODE_ENV === 'production') return;
  const existing = await knex('members').count('* as n').first();
  if (Number(existing.n) > 0) return;

  const today = todayInGym();
  const [year, month] = today.split('-').map(Number);

  await knex.transaction(async (trx) => {
    const [owner] = await trx('staff_profiles').where({ username: 'owner' }).select('id');
    const [desk] = await trx('staff_profiles')
      .insert({ full_name: 'Joy Mercado', username: 'joy.frontdesk', role: ROLES.RECEPTIONIST })
      .onConflict('username')
      .merge()
      .returning('id');

    const plans = Object.fromEntries((await trx('membership_plans').select()).map((p) => [p.name, p]));
    const methods = Object.fromEntries((await trx('payment_methods').select()).map((m) => [m.code, m]));

    // [name, phone, plan, start offset in days from today, suspended reason]
    const people = [
      ['Andrea Lim', '09053379021', 'Monthly', 0, null],
      ['Paolo Reyes', '09982145567', 'Quarterly', -88, null],
      ['Miguel Ramos', '09278804412', 'Annual', -239, null],
      ['Bianca Santos', '09195520083', 'Student Monthly', -29, null],
      ['Jerome Castro', '09661027745', 'Monthly', -42, null],
      ['Lea Gonzales', '09389990011', 'Monthly', -19, 'Unpaid balance'],
      ['Kyla Mae Dizon', '09174821130', 'Monthly', 0, null],
    ];

    for (const [fullName, phone, planName, offset, suspendedReason] of people) {
      const plan = plans[planName];
      const startDate = addDays(today, offset);
      const endDate = computeEndDate(startDate, { durationMonths: plan.duration_months, durationDays: plan.duration_days });

      const [member] = await trx('members')
        .insert({
          member_code: await nextMemberCode(trx, year),
          full_name: fullName,
          contact_number: phone,
          email: `${fullName.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
          is_suspended: Boolean(suspendedReason),
          suspended_reason: suspendedReason,
          suspended_at: suspendedReason ? trx.fn.now() : null,
          suspended_by: suspendedReason ? owner.id : null,
          registered_by: desk.id,
        })
        .returning('id');

      const [sub] = await trx('subscriptions')
        .insert({
          member_id: member.id,
          plan_id: plan.id,
          plan_name: plan.name,
          price: plan.price,
          start_date: startDate,
          end_date: endDate,
          created_by: desk.id,
        })
        .returning('id');

      await trx('payments').insert({
        transaction_no: await nextTransactionNo(trx, year, month),
        type: offset === 0 ? 'membership_new' : 'membership_renewal',
        member_id: member.id,
        subscription_id: sub.id,
        description: `${plan.name} membership`,
        amount: plan.price,
        payment_method_id: methods.cash.id,
        status: 'paid',
        paid_at: trx.fn.now(),
        processed_by: desk.id,
      });

      await trx('qr_tokens').insert({ member_id: member.id, token: generateQrToken() });
    }

    // Andrea is inside the gym right now.
    const andrea = await trx('members').where({ full_name: 'Andrea Lim' }).first('id');
    await trx('attendance_sessions').insert({ member_id: andrea.id, checked_in_by: desk.id });

    // Walk-ins: one still inside and unpaid, one completed and paid.
    const [ella, ryan] = await trx('walkin_customers')
      .insert([
        { full_name: 'Ella Bautista', contact_number: null },
        { full_name: 'Ryan Pascual', contact_number: '09190042287' },
      ])
      .returning('id');
    await trx('walkin_visits').insert({ walkin_customer_id: ella.id, visit_date: today, fee: 100, registered_by: desk.id });
    const [ryanVisit] = await trx('walkin_visits')
      .insert({
        walkin_customer_id: ryan.id,
        visit_date: today,
        time_in: trx.raw("now() - interval '3 hours'"),
        time_out: trx.raw("now() - interval '90 minutes'"),
        fee: 100,
        registered_by: desk.id,
        completed_by: desk.id,
      })
      .returning('id');
    await trx('payments').insert({
      transaction_no: await nextTransactionNo(trx, year, month),
      type: 'walkin',
      walkin_visit_id: ryanVisit.id,
      description: 'Walk-in day pass',
      amount: 100,
      payment_method_id: methods.cash.id,
      status: 'paid',
      paid_at: trx.fn.now(),
      processed_by: desk.id,
    });

    // Inventory: quantities come only from stock movements.
    const items = [
      ['Bottled Water 500ml', 'Drinks and Beverages', 'pcs', 9.5, 20, 24, 8],
      ['Sports Drink 500ml', 'Drinks and Beverages', 'btl', 28, 50, 12, 0],
      ['Protein Shake (ready-to-drink)', 'Protein Products', 'btl', 65, 120, 10, 26],
      ['Whey Sachet 30g', 'Protein Products', 'sachet', 38, 70, 15, 6],
      ['Chalk Block', 'Gym Supplies', 'pcs', 45, 80, 10, 30],
      ['Disinfectant Spray 1L', 'Cleaning Materials', 'btl', 160, null, 4, 2],
      ['Padlock', 'Other Products', 'pcs', 85, 150, 5, 14],
    ];
    for (const [name, category, unit, cost, price, reorder, qty] of items) {
      const [item] = await trx('inventory_items')
        .insert({ name, category, unit, cost_price: cost, selling_price: price, reorder_level: reorder })
        .returning('id');
      if (qty > 0) {
        await trx('stock_movements').insert({
          item_id: item.id,
          type: 'delivery',
          quantity: qty,
          quantity_change: qty,
          movement_date: today,
          remarks: 'Opening stock',
          created_by: owner.id,
        });
      }
    }
  });
}
