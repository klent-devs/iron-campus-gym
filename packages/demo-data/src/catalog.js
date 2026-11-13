/**
 * Starting values for the sample data: plans, payment methods, products, staff and gym settings.
 * Prices match the reference seed (apps/api/src/db/seeds/01_reference.js) and the designs.
 */
import { DEFAULT_PAYMENT_METHODS, ROLES } from '@icg/shared';
import { seedId } from './ids.js';

/** Kinds of record, used to build repeatable seed IDs (see ids.js). */
export const KIND = Object.freeze({
  plan: 1,
  staff: 2,
  member: 3,
  sub: 4,
  payment: 5,
  checkIn: 6,
  customer: 7,
  visit: 8,
  item: 9,
  movement: 10,
  audit: 11,
  notice: 12,
  rejection: 13,
});

export const PLAN_SEED = Object.freeze([
  {
    name: 'Monthly',
    durationMonths: 1,
    price: 1200,
    description: 'Full gym access, all opening hours.',
    share: 0.58,
  },
  {
    name: 'Student Monthly',
    durationMonths: 1,
    price: 900,
    description: 'Valid school ID required at sign-up and renewal.',
    share: 0.23,
  },
  {
    name: 'Quarterly',
    durationMonths: 3,
    price: 3300,
    description: 'Save ₱300 compared with paying monthly.',
    share: 0.13,
  },
  {
    name: 'Annual',
    durationMonths: 12,
    price: 12000,
    description: 'Best value. Includes 1 month free.',
    share: 0.06,
  },
  {
    name: 'Summer Promo',
    durationMonths: 1,
    price: 1000,
    description: 'Seasonal plan for April – May.',
    share: 0,
    isActive: false,
  },
]).map((p, i) => ({
  id: seedId(KIND.plan, i + 1),
  durationDays: 0,
  isActive: true,
  ...p,
}));

/** Notes shown under each method in Settings (Settings.dc.html). */
const METHOD_NOTES = {
  cash: 'Front desk',
  gcash: 'Staff enters the reference number',
  bank_transfer: 'Owner confirms before it counts as paid',
  card: 'Turn on if you get a card terminal',
};

export const PAYMENT_METHOD_SEED = Object.freeze(
  [
    ...DEFAULT_PAYMENT_METHODS.map((m) => ({ ...m, enabled: true })),
    {
      code: 'card',
      name: 'Card (POS)',
      requiresReference: true,
      needsOwnerConfirmation: false,
      enabled: false,
    },
  ].map((m) => ({ ...m, note: METHOD_NOTES[m.code] ?? '' })),
);

export const SETTINGS_SEED = Object.freeze({
  gymName: 'IRON CAMPUS GYM',
  contactNumber: '',
  address: '',
  opensAt: '06:00',
  closesAt: '22:00',
  maxCapacity: 60,
  showCapacity: true,
  warningPct: 90,
  walkinFees: { regular: 100, student: 80 },
});

/**
 * Staff accounts (Staff.dc.html). Sample passwords only: real sign-in uses Supabase Auth.
 * TODO(auth): remove passwords from here when the teammate connects Supabase.
 */
export const STAFF_SEED = Object.freeze(
  [
    ['Marco Villanueva', 'marco.owner', ROLES.OWNER, 'active', 'owner1234'],
    ['Joy Mercado', 'joy.frontdesk', ROLES.RECEPTIONIST, 'active', 'frontdesk1'],
    ['Kevin Santos', 'kevin.s', ROLES.RECEPTIONIST, 'active', 'frontdesk2'],
    ['Aira Dela Paz', 'aira.d', ROLES.RECEPTIONIST, 'disabled', 'frontdesk3'],
  ].map(([name, username, role, status, password], i) => ({
    id: seedId(KIND.staff, i + 1),
    name,
    username,
    email: `${username.split('.')[0]}@ironcampusgym.ph`,
    role,
    status,
    password,
    lastLoginAt: null,
  })),
);

export const STAFF_IDS = Object.freeze({
  owner: STAFF_SEED[0].id,
  joy: STAFF_SEED[1].id,
  kevin: STAFF_SEED[2].id,
});

/**
 * Products: [name, category index, unit, cost, selling price (null = not sold), warn below,
 * quantity now]. The first nine are from Inventory.dc.html.
 */
export const ITEM_SEED = Object.freeze(
  [
    ['Bottled Water 500ml', 0, 'pcs', 9.5, 20, 24, 8],
    ['Sports Drink 500ml', 0, 'bottle', 28, 50, 12, 0],
    ['Protein Shake (ready-to-drink)', 1, 'bottle', 65, 120, 10, 26],
    ['Whey Sachet 30g', 1, 'sachet', 38, 70, 15, 6],
    ['Chalk Block', 2, 'pcs', 45, 80, 10, 30],
    ['Towel (rental)', 2, 'pcs', 90, 20, 15, 42],
    ['Disinfectant Spray 1L', 3, 'bottle', 160, null, 4, 2],
    ['Paper Towels', 3, 'roll', 38, null, 8, 18],
    ['Padlock', 4, 'pcs', 85, 150, 5, 14],
    ['Energy Drink', 0, 'can', 35, 60, 10, 22],
    ['Iced Coffee Can', 0, 'can', 30, 55, 10, 19],
    ['Protein Bar', 1, 'pcs', 48, 80, 15, 33],
    ['Creatine 300g', 1, 'pcs', 650, 950, 3, 5],
    ['Shaker Bottle', 2, 'pcs', 95, 180, 5, 18],
    ['Lifting Gloves', 2, 'pair', 180, 320, 4, 9],
    ['Resistance Band', 2, 'pcs', 120, 220, 4, 7],
    ['Alcohol 1L', 3, 'bottle', 120, null, 4, 9],
    ['Membership Card Holder', 4, 'pcs', 25, 50, 10, 37],
  ].map(([name, cat, unit, costPrice, sellingPrice, reorderLevel, quantity], i) => ({
    id: seedId(KIND.item, i + 1),
    name,
    categoryIndex: cat,
    unit,
    costPrice,
    sellingPrice,
    reorderLevel,
    quantity,
  })),
);

/** Units staff can pick for an item. */
export const ITEM_UNITS = Object.freeze(['pcs', 'bottle', 'can', 'sachet', 'roll', 'pair', 'box']);

export const FIRST_NAMES =
  'Andrea Paolo Bianca Miguel Trisha Daniel Kyla Jerome Lea Mark Rica Carlo Ella Kenji Lara Joanna Ryan Mae Nathan Sofia Gabriel Isabel Rafael Camille Joshua Patricia Vincent Angela Bea Marco Nicole Luis Kevin Janine Paula Enzo Ria Dennis Clarisse Arvin Hannah Jericho Mika Rodel Shaira Tristan Ysabel Zoe Aldrin Bianca Cedric Dana Elijah Faith'.split(
    ' ',
  );
export const LAST_NAMES =
  'Lim Reyes Santos Ramos Navarro Cruz Dizon Castro Gonzales Villanueva Mendoza Tan Bautista Gomez Lopez Flores Pascual Garcia Torres Aquino Rivera Mercado Domingo Salazar Valdez Ocampo Manalo Soriano Pineda Velasco Uy Chua Javier Ignacio Lacson Sarmiento Tolentino Ferrer Macaraeg Abad'.split(
    ' ',
  );

export const BARANGAYS = Object.freeze([
  'Sampaloc, Manila',
  'España, Manila',
  'Quiapo, Manila',
  'Santa Mesa, Manila',
  'Malate, Manila',
  'Paco, Manila',
  'Tondo, Manila',
  'San Juan City',
  'Mandaluyong City',
  'Quezon City',
]);
