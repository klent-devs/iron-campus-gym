import { formatPeso } from '@icg/shared';
import { STAT_GRID, StatCard } from '../../../components/ui/index.js';
import { formatChange, formatDayRange, formatPercentChange, weekdayName } from '../format.js';

/** The four summary cards at the top of the dashboard. */
export function StatCards({ data }) {
  const { members, revenue, attendance, walkIns } = data;
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
            : `vs last ${lastWeekday}`
        }
        title={`Walk-ins today, compared with this time last ${lastWeekday} (${walkIns.sameDayLastWeek})`}
      />
    </div>
  );
}
