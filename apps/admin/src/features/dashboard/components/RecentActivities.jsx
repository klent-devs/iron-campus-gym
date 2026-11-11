import { Link } from 'react-router-dom';
import { Card, CardHeader, EmptyState, Icon } from '../../../components/ui/index.js';
import { activityTime, describeActivity } from '../format.js';

const TILE_TONES = {
  brand: 'bg-brand/[0.14] text-brand-text',
  success: 'bg-success/[0.14] text-success-text',
  neutral: 'bg-card-2 text-ink-soft',
};

/** Latest registrations, check-ins/outs, walk-ins and payments. */
export function RecentActivities({ activities, today }) {
  return (
    <Card className="flex min-w-0 flex-[2_1_480px] flex-col" aria-labelledby="activities-title">
      <CardHeader
        id="activities-title"
        title="Recent Activities"
        actions={
          <Link
            to="/attendance"
            className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-text hover:text-brand-text/80"
          >
            View all
          </Link>
        }
      />

      {activities.length === 0 ? (
        <EmptyState
          compact
          className="flex-1"
          icon="checkIn"
          title="No activity yet"
          // The hyphens in "walk-ins"/"check-ins" below are non-breaking (U+2011), so the word never splits over two lines.
          message="New members, check‑ins, walk‑ins and payments will show up here."
        />
      ) : (
        <ul className="mt-3 list-none p-0">
          {activities.map((activity) => {
            const view = describeActivity(activity);
            return (
              <li key={activity.id} className="flex items-center gap-3.5 border-t border-line py-3">
                <span
                  className={`inline-flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] ${TILE_TONES[view.tone]}`}
                >
                  <Icon name={view.icon} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{view.text}</div>
                  {view.sub && (
                    <div className="truncate text-[13px] text-ink-muted">{view.sub}</div>
                  )}
                </div>
                <time
                  dateTime={activity.at}
                  className="whitespace-nowrap text-[13px] text-ink-muted"
                >
                  {activityTime(activity.at, today)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
