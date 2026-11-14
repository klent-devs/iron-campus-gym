import { addMonths, dateFormat, formatDuration, formatTime } from '@icg/shared';
import { dayOf, indexes } from '@icg/demo-data';
import { Box, Screen } from '../../components/ui.jsx';
import { shortDay } from '../../lib/format.js';
import { useMemberInfo } from '../../lib/useMemberInfo.js';

const monthName = (m) =>
  dateFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(new Date(`${m}-01T00:00:00Z`));

/** My Attendance (docs/design/MAttendance.dc.html). */
export function AttendancePage() {
  const { state, today, info } = useMemberInfo();
  const visits = [...(indexes(state).checkInsByMember.get(info.id) ?? [])].sort((a, b) =>
    b.timeIn.localeCompare(a.timeIn),
  );
  const thisMonth = today.slice(0, 7);
  const months = Array.from({ length: 6 }, (_, i) =>
    addMonths(`${thisMonth}-01`, i - 5).slice(0, 7),
  );
  const perMonth = months.map((m) => visits.filter((c) => dayOf(c.timeIn).startsWith(m)).length);
  const max = Math.max(1, ...perMonth);
  const lastMonth = months[4];

  return (
    <Screen title="My Attendance">
      <Box className="mt-[18px] flex items-center gap-4 !rounded-[22px] px-5 py-[18px]">
        <div className="flex-1">
          <div className="text-sm text-ink-muted">Total visits this month</div>
          <b className="font-heading text-[40px] text-brand-text">{perMonth[5]}</b>
          <div className="text-[13px] text-ink-muted">
            {monthName(lastMonth)}: {perMonth[4]} {perMonth[4] === 1 ? 'visit' : 'visits'}
          </div>
        </div>
        <div
          className="flex h-16 items-end gap-1.5"
          aria-label={`Visits in the last 6 months: ${perMonth.join(', ')}`}
          role="img"
        >
          {perMonth.map((v, i) => (
            <i
              key={months[i]}
              className={`w-3.5 rounded-t ${i === 5 ? 'bg-brand' : 'bg-ink-faint'}`}
              style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
              title={`${monthName(months[i])}: ${v}`}
            />
          ))}
        </div>
      </Box>

      <h2 className="mb-2.5 mt-6 font-heading text-[17px] font-semibold">Recent Gym Visits</h2>
      <div className="flex flex-col gap-2.5">
        {visits.length === 0 && <Box className="p-4 text-sm text-ink-muted">No visits yet.</Box>}
        {visits.slice(0, 30).map((c) => {
          const d = dayOf(c.timeIn);
          const inside = !c.timeOut && d === today;
          return (
            <Box key={c.id} className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                <b className="text-[16px]">{shortDay(d)}</b>
                <span className={`text-sm font-bold ${inside ? 'text-brand-text' : ''}`}>
                  {inside
                    ? 'Inside now'
                    : c.timeOut
                      ? formatDuration(c.timeIn, c.timeOut)
                      : 'No time out'}
                </span>
              </div>
              <div className="mt-2 flex gap-[18px] text-sm text-ink-soft">
                <span>
                  Time In <b className="text-success-text">{formatTime(c.timeIn)}</b>
                </span>
                <span>
                  Time Out{' '}
                  <b className={c.timeOut ? 'text-ink' : 'text-ink-muted'}>
                    {c.timeOut ? formatTime(c.timeOut) : '—'}
                  </b>
                </span>
              </div>
            </Box>
          );
        })}
      </div>
    </Screen>
  );
}
