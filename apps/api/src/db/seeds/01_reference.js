/**
 * Reference data every installation needs. Safe to run again: existing rows are updated.
 * Prices are starting values — the owner changes them in Settings / Membership Plans.
 */
import { DEFAULT_PAYMENT_METHODS, ROLES } from '@icg/shared';

export const PLANS = [
  { name: 'Monthly', duration_months: 1, price: 1200, description: 'Full gym access, all opening hours.' },
  { name: 'Student Monthly', duration_months: 1, price: 900, description: 'Valid school ID required at sign-up and renewal.' },
  { name: 'Quarterly', duration_months: 3, price: 3300, description: 'Save ₱300 compared with paying monthly.' },
  { name: 'Annual', duration_months: 12, price: 12000, description: 'Best value. Includes 1 month free.' },
];

export async function seed(knex) {
  await knex('gym_settings')
    .insert({ singleton: true, gym_name: 'IRON CAMPUS GYM', max_capacity: 60 })
    .onConflict('singleton')
    .ignore();

  await knex('payment_methods')
    .insert(
      DEFAULT_PAYMENT_METHODS.map((m, i) => ({
        code: m.code,
        name: m.name,
        requires_reference: m.requiresReference,
        needs_owner_confirmation: m.needsOwnerConfirmation,
        sort_order: i,
      })),
    )
    .onConflict('code')
    .merge(['name', 'requires_reference', 'needs_owner_confirmation', 'sort_order']);

  await knex('membership_plans').insert(PLANS).onConflict('name').ignore();

  // First owner account. Link auth_user_id to the Supabase user at milestone 2.
  await knex('staff_profiles')
    .insert({ full_name: 'Gym Owner', username: 'owner', role: ROLES.OWNER })
    .onConflict('username')
    .ignore();
}
