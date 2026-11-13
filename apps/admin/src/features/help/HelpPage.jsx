import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon, PageHeader } from '../../components/ui/index.js';

/** Short how-to answers for the front desk, in plain words. */
const TOPICS = [
  {
    icon: 'qr',
    title: 'Check a member in or out',
    to: '/attendance',
    page: 'Attendance',
    steps: [
      'Open Attendance.',
      'Scan the member’s QR code (camera or USB scanner), or type their name or Member ID.',
      'Green means they may enter. Scanning again checks them out.',
    ],
  },
  {
    icon: 'userAdd',
    title: 'Add a new member',
    to: '/members/new',
    page: 'Add Member',
    steps: [
      'Members → + Add New Member.',
      'Fill in the name and number, pick a plan, record the payment.',
      'Print the QR card. If they were a walk-in, their history is linked automatically.',
    ],
  },
  {
    icon: 'refresh',
    title: 'Renew a membership',
    to: '/members/renew',
    page: 'Renew Membership',
    steps: [
      'Members → Renew Membership (or Renew on the member’s row).',
      'The new period starts the day after the current one ends, so no days are lost.',
      'The Member ID and QR code stay the same.',
    ],
  },
  {
    icon: 'walk',
    title: 'Register a walk-in',
    to: '/walk-ins',
    page: 'Walk-in Records',
    steps: [
      'Walk-in → Register Walk-in.',
      'Type the name (regulars are suggested), pick the fee and how they paid.',
      'When they leave, press Complete Visit.',
    ],
  },
  {
    icon: 'wallet',
    title: 'Payments and receipts',
    to: '/payments',
    page: 'Payments',
    steps: [
      'Payments → + Record Payment for products or money still owed.',
      'Open a payment to print the receipt or send it by SMS.',
      'Mistakes: ask the Owner to Void or Refund. Payments are never deleted.',
    ],
  },
  {
    icon: 'box',
    title: 'Stock in and stock out',
    to: '/inventory',
    page: 'Inventory',
    steps: [
      'Inventory → Add Stock for deliveries, Stock Out for items used, damaged or sold.',
      'Stock can’t go below 0. Every change is kept in the item’s history.',
    ],
  },
];

export function HelpPage() {
  useEffect(() => {
    document.title = 'Help · IRON CAMPUS GYM';
  }, []);
  return (
    <>
      <PageHeader title="Help" subtitle="Quick answers for the front desk." sample={false} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TOPICS.map((t) => (
          <section
            key={t.title}
            className="flex flex-col rounded-card border border-line bg-card p-5"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-card-2 text-brand-text">
                <Icon name={t.icon} />
              </span>
              <h2 className="text-[17px] font-semibold">{t.title}</h2>
            </div>
            <ol className="mt-3 flex-1 list-decimal space-y-1.5 pl-5 text-[15px] text-ink-soft">
              {t.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <Link
              to={t.to}
              className="mt-4 inline-flex min-h-touch items-center text-sm font-semibold text-brand-text hover:text-ink"
            >
              Open {t.page} →
            </Link>
          </section>
        ))}
      </div>
      <section className="rounded-card border border-line bg-card p-5 text-[15px] text-ink-soft">
        <b className="text-ink">Something not working?</b> Write down what you clicked and what the
        screen said, then tell the gym owner. Money and member records are never deleted, so nothing
        is lost.
      </section>
    </>
  );
}
