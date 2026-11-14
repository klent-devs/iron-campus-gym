/**
 * Reports — built from the SAMPLE DATA kept in this browser (packages/demo-data), not the database.
 *
 * Each day's records come from `dayRecords(state, date)`: the sample data from the 1st of last month
 * (so anything staff add or change shows up here), and made-up but repeatable numbers before that.
 * The reports agree with each other (walk-in fees in the Payment Report equal "Collected" in the
 * Walk-in Report) and with the Payments page.
 *
 * TODO(api): replace `dayRecords` / the sample data with the reports API (milestone 7). The build*()
 * functions only need records in the same shape. Payment reports are Owner-only: the page hides
 * them from receptionists, and the API must check the role too.
 */
import {
  INVENTORY_CATEGORIES,
  STOCK_STATUS,
  addDays,
  dateFormat,
  daysBetween,
  formatDate,
  formatPeso,
  stockStatus,
  todayInGym,
} from '@icg/shared';
import { dayRecords, membersView } from '@icg/demo-data';

/**
 * The reports staff can pick. `short` is the tab label; `searchable: false` hides the Search box
 * (the Payment Report is a summary by payment method, so a search there means little).
 */
export const REPORT_TYPES = Object.freeze([
  {
    key: 'mem',
    name: 'Membership Report',
    short: 'Membership',
    desc: 'New, renewed, expiring',
    icon: 'users',
    searchable: true,
  },
  {
    key: 'att',
    name: 'Attendance Report',
    short: 'Attendance',
    desc: 'Visits and time spent',
    icon: 'calendar',
    searchable: true,
  },
  {
    key: 'walk',
    name: 'Walk-in Report',
    short: 'Walk-in',
    desc: 'Day-pass visits and fees',
    icon: 'walk',
    searchable: true,
  },
  {
    key: 'pay',
    name: 'Payment Report',
    short: 'Payment',
    desc: 'Money received by type',
    icon: 'wallet',
    searchable: false,
    ownerOnly: true,
  },
  {
    key: 'inv',
    name: 'Inventory Report',
    short: 'Inventory',
    desc: 'Stock levels and movement',
    icon: 'box',
    searchable: true,
  },
]);

/** Longest period one report can cover. */
export const MAX_REPORT_DAYS = 366;

// ── Periods ──────────────────────────────────────────────────────────────────────────────────

/** Every date from `from` to `to`, newest first. */
export function datesBetween(from, to) {
  const n = daysBetween(from, to);
  return Array.from({ length: n + 1 }, (_, i) => addDays(to, -i));
}

/** Quick date choices: This month (default), Today, This week, Last month. */
export function quickPeriod(key, today) {
  if (key === 'today') return { from: today, to: today };
  if (key === 'week') {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    return { from: addDays(today, -((weekday + 6) % 7)), to: today };
  }
  if (key === 'lastMonth') {
    const firstThis = `${today.slice(0, 8)}01`;
    const lastPrev = addDays(firstThis, -1);
    return { from: `${lastPrev.slice(0, 8)}01`, to: lastPrev };
  }
  return { from: `${today.slice(0, 8)}01`, to: today };
}

/** A problem with the chosen dates, in plain words, or '' when they are fine. */
export function periodProblem({ from, to }, today) {
  if (!from || !to) return 'Choose both dates.';
  if (from > to) return 'The From date must be on or before the To date.';
  if (to > today) return 'The To date can’t be after today.';
  if (daysBetween(from, to) + 1 > MAX_REPORT_DAYS) return 'Choose a period of one year or less.';
  return '';
}

/** "01 – 09 Nov 2026", "28 Oct – 09 Nov 2026", "09 Nov 2026". */
export function formatPeriod({ from, to }) {
  if (from === to) return formatDate(from);
  const [a, b] = [formatDate(from), formatDate(to)];
  if (from.slice(0, 7) === to.slice(0, 7)) return `${a.slice(0, 2)} – ${b}`;
  if (from.slice(0, 4) === to.slice(0, 4)) return `${a.slice(0, 6)} – ${b}`;
  return `${a} – ${b}`;
}

const dayLabel = (date) =>
  `${dateFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )} ${formatDate(date).slice(0, 6)}`;
const num = (n) => n.toLocaleString('en-PH');
const days = (n) => `${num(n)} ${n === 1 ? 'day' : 'days'}`;
const hm = (minutes) =>
  minutes === null ? '—' : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
const hourRange = (h) => {
  const label = (x) => `${((x + 11) % 12) + 1}`;
  const ampm = (x) => (x < 12 ? 'AM' : 'PM');
  return ampm(h) === ampm(h + 1)
    ? `${label(h)}–${label(h + 1)} ${ampm(h)}`
    : `${label(h)} ${ampm(h)}–${label(h + 1)} ${ampm(h + 1)}`;
};
const busiest = (checkIns) => {
  if (!checkIns.length) return '—';
  const counts = new Map();
  checkIns.forEach((c) => counts.set(c.hour, (counts.get(c.hour) ?? 0) + 1));
  const [h] = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return hourRange(h);
};
const average = (list) => {
  const done = list.filter((c) => c.minutes !== null);
  return done.length ? Math.round(done.reduce((s, c) => s + c.minutes, 0) / done.length) : null;
};
const matches = (q, ...texts) => !q || texts.some((t) => t?.toLowerCase().includes(q));

// ── Reports ──────────────────────────────────────────────────────────────────────────────────
// Each returns { summary: [{ label, value, tone?, size? }], columns: [{ label, align? }],
//                rows: string[][], total: string[] }.
// tone: 'good' | 'bad' | 'brand' | 'quietWarn' (muted number with an amber dot).
// size: 'lg' for the one number that matters most, 'sm' for a minor one.

function membershipReport(dates, q, ctx) {
  const events = dates
    .flatMap((d) => ctx.records(d).memberEvents)
    .filter((e) => matches(q, e.name));
  const count = (plan, kind) => events.filter((e) => e.plan === plan && e.kind === kind).length;
  const activeNow = (plan) =>
    ctx.members.filter((m) => m.plan === plan && m.active && matches(q, m.name)).length;
  const rows = ctx.planNames
    .map((p) => [p, count(p, 'new'), count(p, 'renewed'), count(p, 'expired'), activeNow(p)])
    .filter((r) => r.slice(1).some(Boolean));
  const sum = (i) => rows.reduce((s, r) => s + r[i], 0);
  return {
    summary: [
      { label: 'New members', value: num(sum(1)) },
      { label: 'Renewals', value: num(sum(2)), tone: 'good' },
      { label: 'Expired, not renewed', value: num(sum(3)), tone: 'bad' },
    ],
    columns: [
      { label: 'Plan' },
      ...['New', 'Renewed', 'Expired', 'Active now'].map((label) => ({ label, align: 'right' })),
    ],
    rows: rows.map((r) => [r[0], ...r.slice(1).map(num)]),
    total: ['Total', num(sum(1)), num(sum(2)), num(sum(3)), num(sum(4))],
  };
}

function attendanceReport(dates, q, ctx) {
  const perDay = dates.map((d) => ({
    d,
    list: ctx.records(d).checkIns.filter((c) => matches(q, c.name)),
  }));
  const all = perDay.flatMap((x) => x.list);
  const rows = perDay
    .filter((x) => !q || x.list.length)
    .map(({ d, list }) => [
      dayLabel(d),
      num(list.length),
      busiest(list),
      hm(average(list)),
      num(list.filter((c) => c.missed).length),
    ]);
  return {
    summary: [
      { label: 'Total check-ins', value: num(all.length) },
      { label: 'Daily average', value: num(Math.round(all.length / dates.length)) },
      { label: 'Average stay', value: hm(average(all)), tone: 'brand' },
    ],
    columns: [
      { label: 'Date' },
      { label: 'Check-ins', align: 'right' },
      { label: 'Busiest hour' },
      { label: 'Average stay' },
      { label: 'Missed check-outs', align: 'right' },
    ],
    rows,
    total: [
      days(dates.length),
      num(all.length),
      busiest(all),
      hm(average(all)),
      num(all.filter((c) => c.missed).length),
    ],
  };
}

function walkinReport(dates, q, ctx) {
  const perDay = dates.map((d) => ({
    d,
    list: ctx.records(d).walkins.filter((w) => matches(q, w.name)),
  }));
  const collected = (list) =>
    list.filter((w) => w.paid && !w.voided).reduce((s, w) => s + w.fee, 0);
  const all = perDay.flatMap((x) => x.list);
  const row = (list) => [
    num(list.filter((w) => w.feeType === 'regular').length),
    num(list.filter((w) => w.feeType === 'student').length),
    num(list.filter((w) => !w.paid).length),
    formatPeso(collected(list)),
  ];
  return {
    summary: [
      { label: 'Walk-in visits', value: num(all.length) },
      { label: 'Collected', value: formatPeso(collected(all)), tone: 'good' },
      {
        label: 'Became members',
        value: num(all.filter((w) => w.becameMember).length),
        tone: 'brand',
      },
    ],
    columns: [
      { label: 'Date' },
      { label: `Regular (${formatPeso(ctx.fees.regular)})`, align: 'right' },
      { label: `Student (${formatPeso(ctx.fees.student)})`, align: 'right' },
      { label: 'Unpaid', align: 'right' },
      { label: 'Collected', align: 'right' },
    ],
    rows: perDay
      .filter((x) => !q || x.list.length)
      .map(({ d, list }) => [dayLabel(d), ...row(list)]),
    total: [days(dates.length), ...row(all)],
  };
}

function paymentReport(dates, q, ctx) {
  const all = dates
    .flatMap((d) => ctx.records(d).payments)
    .filter((p) => matches(q, p.name, p.txnNo, p.what));
  const paid = all.filter((p) => p.status === 'paid');
  const total = (list) => list.reduce((s, p) => s + p.amount, 0);
  const cell = (list) => (list.length ? formatPeso(total(list)) : '—');
  const types = ['membership', 'walkin', 'product'];
  const rows = ctx.methodNames
    .map((name) => {
      const byMethod = paid.filter((p) => p.method === name);
      return [
        name,
        ...types.map((t) => cell(byMethod.filter((p) => p.type === t))),
        cell(byMethod),
      ];
    })
    .filter((r) => r[4] !== '—');
  return {
    summary: [
      // "Gross" until real totals (net of voids/refunds) come from the API.
      { label: 'Gross collected', value: formatPeso(total(paid)), tone: 'good', size: 'lg' },
      { label: 'Payments', value: num(paid.length) },
      {
        label: 'Voided / refunded',
        value: formatPeso(total(all.filter((p) => p.status !== 'paid'))),
        tone: 'quietWarn',
        size: 'sm',
      },
    ],
    columns: [
      { label: 'Payment Method' },
      ...['Memberships', 'Walk-ins', 'Products', 'Total'].map((label) => ({
        label,
        align: 'right',
      })),
    ],
    rows,
    total: ['Total', ...types.map((t) => cell(paid.filter((p) => p.type === t))), cell(paid)],
  };
}

function inventoryReport(dates, q, ctx) {
  const items = ctx.items.filter((i) => matches(q, i.name, i.category));
  const moves = dates.flatMap((d) => ctx.records(d).movements);
  const qty = (names, sign) =>
    moves
      .filter((m) => names.has(m.item) && Math.sign(m.qty) === sign)
      .reduce((s, m) => s + Math.abs(m.qty), 0);
  const row = (list) => {
    const names = new Set(list.map((i) => i.name));
    return [
      num(list.length),
      num(qty(names, 1)),
      num(qty(names, -1)),
      num(list.reduce((s, i) => s + i.quantity, 0)),
    ];
  };
  const status = items.map((i) => stockStatus(i.quantity, i.reorderLevel));
  const low = status.filter((s) => s === STOCK_STATUS.LOW_STOCK).length;
  const out = status.filter((s) => s === STOCK_STATUS.OUT_OF_STOCK).length;
  return {
    summary: [
      { label: 'Items', value: num(items.length) },
      {
        label: 'Stock value (cost)',
        value: formatPeso(items.reduce((s, i) => s + i.costPrice * i.quantity, 0)),
      },
      {
        label: 'Low / out of stock',
        value: `${low} / ${out}`,
        tone: low + out ? 'brand' : undefined,
      },
    ],
    columns: [
      { label: 'Category' },
      ...['Items', 'Stock in', 'Stock out', 'On hand'].map((label) => ({ label, align: 'right' })),
    ],
    rows: INVENTORY_CATEGORIES.map((c) => [c, items.filter((i) => i.category === c)])
      .filter(([, list]) => list.length)
      .map(([c, list]) => [c, ...row(list)]),
    total: ['Total', ...row(items)],
  };
}

const BUILDERS = {
  mem: membershipReport,
  att: attendanceReport,
  walk: walkinReport,
  pay: paymentReport,
  inv: inventoryReport,
};

/**
 * Build one report for a period from the sample data.
 * @param {{ type: string, from: string, to: string, search?: string }} params
 * @param {object} state  the sample data (lib/demo.js `useDemoData()`)
 * @param {Date} [now]
 */
export function buildReport({ type, from, to, search = '' }, state, now = new Date()) {
  const meta = REPORT_TYPES.find((r) => r.key === type);
  const q = meta.searchable ? search.trim() : ''; // no search on reports that hide the box
  const today = todayInGym(now);
  const ctx = {
    records: (d) => dayRecords(state, d, now),
    members: membersView(state, today).map((m) => ({
      name: m.name,
      plan: m.plan,
      active: m.status === 'active' || m.status === 'expiring_soon',
    })),
    planNames: state.plans.map((p) => p.name),
    methodNames: [
      ...new Set(['Cash', 'GCash', 'Bank Transfer', ...state.paymentMethods.map((m) => m.name)]),
    ],
    fees: state.settings.walkinFees,
    items: state.items,
  };
  const body = BUILDERS[type](datesBetween(from, to), q.toLowerCase(), ctx);
  return { ...meta, type, from, to, search: q, ...body };
}

/** The report as CSV text (opens in Excel). The ₱ sign needs the BOM at the start. */
export function reportToCsv(report, generatedAt = new Date()) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const line = (cells) => cells.map(esc).join(',');
  return (
    '﻿' +
    [
      line([`IRON CAMPUS GYM · ${report.name}`]),
      line([`Period: ${formatPeriod(report)}`]),
      line([`Generated: ${formatDate(todayInGym(generatedAt))}`]),
      ...(report.search ? [line([`Search: ${report.search}`])] : []),
      '',
      ...report.summary.map((s) => line([s.label, s.value])),
      '',
      line(report.columns.map((c) => c.label)),
      ...report.rows.map(line),
      line(report.total),
    ].join('\r\n')
  );
}

/** "iron-campus-gym-payment-report-2026-11-01-to-2026-11-09.csv" */
export function reportFileName(report, ext) {
  const slug = report.name.toLowerCase().replace(/\s+/g, '-');
  const period = report.from === report.to ? report.from : `${report.from}-to-${report.to}`;
  return `iron-campus-gym-${slug}-${period}.${ext}`;
}
