import { addDays, dateFormat, formatDate, formatTime } from '@icg/shared';
import { actions, dayOf, memberNotifications } from '@icg/demo-data';
import { Icon } from '../../components/Icon.jsx';
import { Screen } from '../../components/ui.jsx';
import { runAction, useDemoData, useMember, useToday } from '../../lib/demo.js';

const ICON = {
  pay: ['check', 'text-success-text'],
  in: ['in', 'text-brand-text'],
  info: ['info', 'text-ink-soft'],
  clock: ['clock', 'text-warning-text'],
  x: ['x', 'text-danger-text'],
};

/** "10:31 AM" today, "Sat" this week, else "01 Nov". */
function when(at, today) {
  const d = dayOf(at);
  if (d === today) return formatTime(at);
  if (d > addDays(today, -7))
    return dateFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(
      new Date(`${d}T00:00:00Z`),
    );
  return formatDate(d).slice(0, 6);
}

/** Notifications (docs/design/MNotifications.dc.html). Tapping one marks it read. */
export function NotificationsPage() {
  const state = useDemoData();
  const member = useMember();
  const today = useToday();
  const list = memberNotifications(state, member.id);
  const unread = list.filter((n) => n.unread);
  const read = (ids) =>
    ids.length && runAction(actions.markNotificationsRead, { memberId: member.id, ids });

  return (
    <Screen
      title="Notifications"
      back="/"
      action={
        <button
          type="button"
          onClick={() => read(unread.map((n) => n.id))}
          className="h-12 px-1 text-sm font-semibold text-brand-text"
        >
          Mark all read
        </button>
      }
    >
      <p className="mb-3.5 text-sm text-ink-muted">
        {unread.length ? `${unread.length} new` : 'You’re all caught up'}
      </p>
      <div className="flex flex-col gap-2.5">
        {list.map((n) => {
          const [icon, tone] = ICON[n.kind];
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => n.unread && read([n.id])}
              className={`flex w-full items-start gap-3 rounded-[18px] border p-4 text-left ${n.unread ? 'border-brand/45 bg-[#1A1513]' : 'border-line bg-card'}`}
            >
              <span
                className={`inline-flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-card-2 ${tone}`}
              >
                <Icon name={icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2">
                  <b className={`text-[15px] ${n.unread ? 'font-bold' : 'font-semibold'}`}>
                    {n.title}
                  </b>
                  <span className="whitespace-nowrap text-xs text-ink-muted">
                    {when(n.at, today)}
                  </span>
                </span>
                <span className="mt-1 block text-sm leading-snug text-ink-soft">{n.body}</span>
              </span>
              <span
                className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${n.unread ? 'bg-brand' : 'bg-transparent'}`}
              />
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
