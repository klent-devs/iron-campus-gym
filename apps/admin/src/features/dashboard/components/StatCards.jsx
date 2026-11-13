import { formatPeso } from '@icg/shared';
import { STAT_GRID, StatCard } from '../../../components/ui/index.js';
import { formatChange, formatDayRange, formatPercentChange, weekdayName } from '../format.js';

/** The four summary cards at the top of the dashboard. */
export function StatCards({ data }) {
  const { members, revenue, attendance, walkIns, capacity, frontDesk } = data;
  const unpaidCount = frontDesk?.unpaidWalkIns.count ?? 0;
  const lastWeekday = weekdayName(attendance.compareDate);
  const attendanceChange = formatChange(attendance.change);
  const walkInChange = formatChange(walkIns.change);
  const revenueChange = revenue && formatPercentChange(revenue.changePct);

  return (
    <div className={STAT_GRID}>
      <StatCard
        label="Total Members"
        icon="users"
        value={members.total.toLocaleString('en-PH')}
        delta={`${members.active.toLocaleString('en-PH')} active`}
        deltaTone="up"
        note={`· ${members.expired.toLocaleString('en-PH')} expired`}
        title="Active includes members whose plan is expiring soon"
      />

      {/* Owner only: the API leaves revenue out for receptionists. */}
      {revenue && (
        <StatCard
          label="Monthly Revenue"
          icon="peso"
          value={formatPeso(revenue.thisPeriod)}
          delta={revenueChange?.text}
          deltaTone={revenueChange?.tone}
          note={
            revenueChange
              ? `vs ${formatDayRange(revenue.comparePeriod)}`
              : `No sales ${formatDayRange(revenue.comparePeriod)} to compare`
          }
          title={`Paid ${formatDayRange(revenue.period)}, compared with the same days last month (${formatPeso(revenue.comparePeriodTotal)})`}
        />
      )}

      {/* Receptionist: who is in the gym right now, in place of the money card. */}
      {!revenue && (
        <StatCard
          label="Currently Inside"
          icon="checkIn"
          tone="brand"
          value={
            <>
              {capacity.insideNow.toLocaleString('en-PH')}
              {capacity.maxCapacity && (
                <span className="font-sans text-[16px] font-medium text-ink-muted">
                  {' '}
                  / {capacity.maxCapacity}
                </span>
              )}
            </>
          }
          note="Members and walk-ins right now"
          title={`${capacity.membersInside} members and ${capacity.walkInsInside} walk-ins inside`}
        />
      )}

      <StatCard
        label="Today's Attendance"
        icon="checkIn"
        value={attendance.today.toLocaleString('en-PH')}
        delta={attendanceChange.text}
        deltaTone={attendanceChange.tone}
        note={`vs last ${lastWeekday}`}
        title={`Members who checked in today, compared with this time last ${lastWeekday} (${attendance.sameDayLastWeek})`}
      />

      <StatCard
        label="Walk-in Customers"
        icon="walk"
        value={walkIns.today.toLocaleString('en-PH')}
        delta={walkInChange.text}
        deltaTone={walkInChange.tone}
        note={
          walkIns.collectedToday !== null
            ? `${formatPeso(walkIns.collectedToday)} collected today`
            : `vs last ${lastWeekday}${unpaidCount ? ` · ${unpaidCount} unpaid` : ''}`
        }
        title={`Walk-ins today, compared with this time last ${lastWeekday} (${walkIns.sameDayLastWeek})`}
      />
    </div>
  );
}
