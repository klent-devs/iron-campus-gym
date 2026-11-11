import { formatSidebarClock } from '@icg/shared';
import { useNow } from '../../lib/useNow.js';

/**
 * Small one-line clock under the logo in the sidebar, on every page: "Wed Nov 11 2:26PM".
 * Always Philippine time. It updates on each new minute, and only this line re-renders.
 *
 * Justified to the logo's width: the characters are spread evenly from the left edge of the
 * logo icon to the right edge of "IRON CAMPUS" (CSS can't justify a single line on its own).
 */
export function SidebarClock() {
  const now = useNow(60_000);
  const text = formatSidebarClock(now);
  return (
    <time
      dateTime={now.toISOString()}
      title="Philippine time"
      className="mt-2 flex justify-between self-stretch text-[13px] font-semibold tabular-nums text-ink-soft"
    >
      {/* Screen readers read the whole line once; the spread-out letters are hidden from them. */}
      <span className="sr-only">{text}</span>
      {Array.from(text).map((char, i) => (
        <span key={i} aria-hidden="true">
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </time>
  );
}
