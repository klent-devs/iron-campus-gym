import {
  MEMBERSHIP_STATUS,
  MEMBERSHIP_STATUS_LABELS,
  formatDate,
  formatDuration,
  formatPeso,
  formatTime,
} from '@icg/shared';
import { Button } from '../../../components/ui/Button.jsx';
import { Icon } from '../../../components/ui/Icon.jsx';
import { checkedInPhrase, initials } from '../demoData.js';

/**
 * Colours for each result (docs/design/Attendance.dc.html, the `result` tweak).
 * box = border, head = coloured header, icon = icon colour inside the white circle.
 */
const LOOKS = {
  ready: {
    box: 'border-line',
    head: 'bg-card-2 text-ink',
    icon: 'qr',
    iconTone: 'text-ink-muted',
    circle: 'bg-card',
  },
  granted: {
    box: 'border-success',
    head: 'bg-success text-ink',
    icon: 'check',
    iconTone: 'text-success',
  },
  checkout: {
    box: 'border-brand',
    head: 'bg-card-2 text-ink',
    icon: 'logout',
    iconTone: 'text-brand',
  },
  expired: {
    box: 'border-danger',
    head: 'bg-danger text-ink',
    icon: 'close',
    iconTone: 'text-danger',
  },
  suspended: {
    box: 'border-ink-faint',
    head: 'bg-ink-faint text-ink',
    icon: 'close',
    iconTone: 'text-ink-faint',
  },
  invalid: {
    box: 'border-warning',
    head: 'bg-warning text-sidebar',
    icon: 'question',
    iconTone: 'text-warning',
  },
};

const statusTone = (status) =>
  ({
    active: 'text-success-text',
    expiring_soon: 'text-warning-text',
    expired: 'text-danger-text',
    suspended: 'text-ink-soft',
  })[status] ?? 'text-ink';

const days = (n) => `${n} ${Math.abs(n) === 1 ? 'day' : 'days'}`;

/** Title, subtitle, facts, note and buttons for one result. */
function describe(result) {
  const { kind, member, status, daysLeft, checkIn, at, visits, missed } = result;
  const statusFact = [
    'Membership Status',
    MEMBERSHIP_STATUS_LABELS[status] ?? '—',
    statusTone(status),
  ];
  const missedNote = missed
    ? ` Their visit ${checkedInPhrase(missed.timeIn).replace('checked in ', 'on ')} has no time out — fix it in Attendance Records.`
    : '';

  if (kind === 'granted') {
    const soon = status === MEMBERSHIP_STATUS.EXPIRING_SOON;
    return {
      title: 'ACCESS GRANTED',
      sub: `Checked in at ${formatTime(at)}`,
      facts: [
        ['Membership Plan', member.plan],
        statusFact,
        ['Time In', formatTime(at)],
        [
          'Expires',
          `${formatDate(member.endDate)} (${daysLeft === 0 ? 'today' : days(daysLeft)})`,
          soon ? 'text-warning-text' : '',
        ],
      ],
      note:
        (soon
          ? `Membership ends ${daysLeft === 0 ? 'today' : `in ${days(daysLeft)}`}. Remind them to renew. `
          : '') +
        'Scan their code again when they leave to record the time out.' +
        missedNote,
      actions: [{ label: 'Next Scan', next: true, variant: 'primary' }],
    };
  }
  if (kind === 'checkout') {
    return {
      title: 'CHECKED OUT',
      sub: `Time out recorded at ${formatTime(at)}`,
      facts: [
        ['Time In', formatTime(checkIn.timeIn)],
        ['Time Out', formatTime(checkIn.timeOut)],
        ['Duration', formatDuration(checkIn.timeIn, checkIn.timeOut), 'text-brand-text'],
        ['Visits this month', String(visits)],
      ],
      note: 'They were already inside, so this closed their open visit instead of creating a second check-in.',
      actions: [{ label: 'Next Scan', next: true, variant: 'primary' }],
    };
  }
  if (kind === 'expired') {
    const never = !member.endDate;
    return {
      title: never ? 'NO ACTIVE MEMBERSHIP' : 'MEMBERSHIP EXPIRED',
      sub: 'Entry not allowed',
      facts: never
        ? [['Membership Plan', '—'], statusFact]
        : [
            ['Membership Plan', member.plan],
            statusFact,
            ['Expired on', formatDate(member.endDate)],
            ['Days since', days(-daysLeft)],
          ],
      note: 'Offer a renewal, or register today’s visit as a walk-in.',
      actions: [
        { label: 'Renew Membership', to: `/members/renew?member=${member.id}`, variant: 'primary' },
        { label: 'Register Walk-in', walkIn: true },
      ],
    };
  }
  if (kind === 'suspended') {
    return {
      title: 'MEMBERSHIP SUSPENDED',
      sub: 'Entry not allowed',
      facts: [
        ['Suspended on', formatDate(member.suspendedOn)],
        statusFact,
        ['Reason', member.suspendReason ?? '—'],
        ['Balance', member.balance ? formatPeso(member.balance) : '₱0.00'],
      ],
      note: 'Only the Owner can lift a suspension. Ask the member to settle the balance first.',
      actions: [{ label: 'View Profile', to: `/members/${member.id}` }],
    };
  }
  return {
    title: 'INVALID QR CODE',
    sub: 'Code not recognized',
    facts: [],
    note: 'This code is old, was refreshed in the app, or isn’t an IRON CAMPUS GYM code. Ask the member to open My QR in the app, or type their Member ID below the scanner.',
    actions: [{ label: 'Try Again', next: true, variant: 'primary' }],
  };
}

/**
 * Big result card next to the scanner. Shows "Ready to scan" until the first scan.
 * @param {{ result: object|null, onNext: () => void, onWalkIn: (member: object) => void }} props
 */
export function ScanResultPanel({ result, onNext, onWalkIn }) {
  const kind = result?.kind ?? 'ready';
  const look = LOOKS[kind];
  const d = result
    ? describe(result)
    : {
        title: 'READY TO SCAN',
        sub: 'Waiting for a member’s QR code',
        facts: [],
        note: 'Scan the QR code on the member’s phone, or type their Member ID or name under the scanner. The result shows here.',
        actions: [],
      };
  const member = result?.member;

  return (
    <section
      aria-live="polite"
      aria-label="Scan result"
      // A new key per scan replays the entrance, so staff notice every new result.
      key={result?.at ?? 'ready'}
      className={`flex min-w-0 flex-[1_1_380px] flex-col overflow-hidden rounded-card border-2 bg-card motion-safe:animate-dialog-in ${look.box}`}
    >
      <div className={`flex items-center gap-4 px-6 py-5 ${look.head}`}>
        <span
          className={`inline-flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full ${
            look.circle ?? 'bg-ink'
          } ${result ? 'motion-safe:animate-ring-out' : ''}`}
        >
          <Icon
            name={look.icon}
            size={30}
            strokeWidth={kind === 'ready' ? 2 : 3}
            className={look.iconTone}
          />
        </span>
        <div className="min-w-0">
          <div className="font-heading text-[26px] font-extrabold leading-tight tracking-[0.03em] sm:text-[28px]">
            {d.title}
          </div>
          <div className="text-[15px] opacity-90">{d.sub}</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-[18px] p-6">
        {member && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex h-[88px] w-[88px] flex-none items-center justify-center rounded-full bg-line font-heading text-[30px] font-bold">
                {initials(member.name)}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[24px] font-semibold">{member.name}</h3>
                <div className="mt-1 font-mono text-[15px] text-ink-soft">{member.code}</div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              {d.facts.map(([k, v, tone]) => (
                <div key={k} className="min-w-0 rounded-btn bg-card-2 p-3.5">
                  <dt className="text-[13px] text-ink-muted">{k}</dt>
                  <dd className={`mt-1 truncate text-[17px] font-bold ${tone || 'text-ink'}`}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
        {!result && (
          <div className="flex flex-1 items-center justify-center py-6 text-ink-faint">
            <Icon name="qr" size={96} strokeWidth={1.2} />
          </div>
        )}
        <p className="text-[15px] leading-relaxed text-ink-soft">{d.note}</p>
        {d.actions.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2.5">
            {d.actions.map((a) => (
              <Button
                key={a.label}
                variant={a.variant ?? 'secondary'}
                to={a.to}
                onClick={a.next ? onNext : a.walkIn ? () => onWalkIn(member) : undefined}
                className="h-[50px] flex-1 text-[15px]"
              >
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
