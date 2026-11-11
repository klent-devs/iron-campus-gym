import { Button, Card, CardHeader, EmptyState } from '../../../components/ui/index.js';
import { describeAlerts } from '../format.js';

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

/** Memberships expiring/expired and stock running out. Boxes with nothing to report are hidden. */
export function AlertsPanel({ alerts }) {
  const view = describeAlerts(alerts);
  const nothing = !view.expiring && !view.expired && !view.stock;

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
          message="No memberships or stock need attention right now."
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
          {view.expired && (
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
                  Add Stock
                </Button>
              }
            />
          )}
        </div>
      )}
    </Card>
  );
}
