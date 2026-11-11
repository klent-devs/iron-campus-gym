import { formatClock, formatShortDate } from '@icg/shared';
import { useNow } from '../../lib/useNow.js';
import { Icon } from '../ui/Icon.jsx';

/**
 * Clock in the top bar, on every page: "2:43 PM" with "Wed, 11 Nov 2026" underneath, always in
 * Philippine time. Same icon-circle + two-line layout as the signed-in staff block next to it.
 * Icon, time and date are always shown. Updates on each new minute, and only this block re-renders.
 */
export function TopbarClock() {
  const now = useNow(60_000);
  const time = formatClock(now, { seconds: false });
  const date = formatShortDate(now);

  return (
    <time
      dateTime={now.toISOString()}
      title="Philippine time"
      className="flex h-[52px] items-center gap-3 pl-1 pr-2"
    >
      <span
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-card-2 text-ink-muted"
        aria-hidden="true"
      >
        <Icon name="clock" />
      </span>
      <span className="text-left leading-tight">
        <b className="block whitespace-nowrap text-[15px] tabular-nums">{time}</b>
        <span className="block whitespace-nowrap text-[13px] text-ink-muted">{date}</span>
      </span>
    </time>
  );
}
