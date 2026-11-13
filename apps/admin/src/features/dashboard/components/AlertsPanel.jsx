import { formatPeso, formatTime } from '@icg/shared';
import { Button, Card, CardHeader, EmptyState } from '../../../components/ui/index.js';
import { describeAlerts, plural } from '../format.js';

const BOX_TONES = {
  warn: { box: 'border-warning/35 bg-warning/[0.08]', title: 'text-warning-text' },
  bad: { box: 'border-danger/35 bg-danger/[0.08]', title: 'text-danger-text' },
  neutral: { box: 'border-line bg-card-2', title: 'text-ink' },
};

function AlertBox({ tone, title, text, action }) {
  const t = BOX_TONES[tone];
  return (
    <div className={`rounded-btn border p-3.5 ${t.box}`}>
      <b className={t.title}>{title}</b>
      <p className="mb-2.5 mt-1 text-[13px] text-ink-soft">{text}</p>
      {action}
    </div>
  );
}

/** "Ella Bautista and 2 more", "Mark Villanueva, Rica Mendoza" */
function names(list, count) {
  if (count <= 2) return list.slice(0, count).join(', ');
  return `${list[0]} and ${count - 1} more`;
}

/**
 * Memberships expiring/expired and stock running out. Boxes with nothing to report are hidden.
 * The Receptionist (`frontDesk` given) gets the front-desk version: expiring soon, unpaid walk-ins,
 * missed check-outs and low stock (expired memberships stay on the Members page).
 */
export function AlertsPanel({ alerts, frontDesk = null }) {
  const view = describeAlerts(alerts);
  const desk = frontDesk && {
    unpaid: frontDesk.unpaidWalkIns.count > 0 && {
      title: `${plural(frontDesk.unpaidWalkIns.count, 'walk-in')} still unpaid · ${formatPeso(frontDesk.unpaidWalkIns.amount)}`,
      text: frontDesk.unpaidWalkIns.first
        ? `${frontDesk.unpaidWalkIns.first.name} · in since ${formatTime(frontDesk.unpaidWalkIns.first.timeIn)}`
        : '',
    },
    missed: frontDesk.missedCheckOuts.count > 0 && {
      title: `${plural(frontDesk.missedCheckOuts.count, 'missed check-out')} from an earlier day`,
      text: `${names(frontDesk.missedCheckOuts.names, frontDesk.missedCheckOuts.count)} · set their time out`,
    },
  };
  const showExpired = !desk && view.expired;
  const nothing =
    !view.expiring && !showExpired && !view.stock && !(desk && (desk.unpaid || desk.missed));

  return (
    <Card className="flex flex-[1_1_340px] flex-col" aria-labelledby="alerts-title">
      <CardHeader id="alerts-title" title="Alerts" />
      {nothing ? (
        <EmptyState
          compact
          className="flex-1"
          tone="success"
          icon="check"
          title="All clear"
          message={
            desk
              ? 'No memberships, payments, check-outs or stock need attention right now.'
              : 'No memberships or stock need attention right now.'
          }
        />
      ) : (
        <div className="mt-3.5 flex flex-col gap-3">
          {view.expiring && (
            <AlertBox
              tone="warn"
              {...view.expiring}
              action={
                <Button to="/members?status=expiring_soon" size="sm">
                  See members
                </Button>
              }
            />
          )}
          {desk?.unpaid && (
            <AlertBox
              tone="bad"
              {...desk.unpaid}
              action={
                <Button to="/walk-ins" size="sm">
                  Record Payment
                </Button>
              }
            />
          )}
          {desk?.missed && (
            <AlertBox
              tone="warn"
              {...desk.missed}
              action={
                <Button to="/attendance/records" size="sm">
                  Fix Time Out
                </Button>
              }
            />
          )}
          {showExpired && (
            <AlertBox
              tone="bad"
              {...view.expired}
              action={
                <Button to="/members?status=expired" size="sm">
                  Renew Membership
                </Button>
              }
            />
          )}
          {view.stock && (
            <AlertBox
              tone="neutral"
              {...view.stock}
              action={
                <Button to="/inventory" size="sm">
                  {desk ? 'See Inventory' : 'Add Stock'}
                </Button>
              }
            />
          )}
        </div>
      )}
    </Card>
  );
}
