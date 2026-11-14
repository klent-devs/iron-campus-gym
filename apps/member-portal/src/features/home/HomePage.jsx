import { dateFormat, formatDate, formatDuration, formatPeso, formatTime } from '@icg/shared';
import { dayOf, indexes, memberNotifications, methodName, reminderDate } from '@icg/demo-data';
import { Link } from 'react-router-dom';
import { Icon, LogoMark } from '../../components/Icon.jsx';
import { Box, Pill, Screen, SectionTitle } from '../../components/ui.jsx';
import { visitPart } from '../../lib/format.js';
import { STATUS_WORD, useMemberInfo } from '../../lib/useMemberInfo.js';

const weekday = (d, style = 'long') =>
  dateFormat('en-GB', { weekday: style, timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));
const dayMonth = (d) =>
  dateFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${d}T00:00:00Z`),
  );

/** Home (docs/design/MHome.dc.html). */
export function HomePage() {
  const { state, today, info } = useMemberInfo();
  const ix = indexes(state);
  const visits = [...(ix.checkInsByMember.get(info.id) ?? [])].sort((a, b) =>
    b.timeIn.localeCompare(a.timeIn),
  );
  const month = today.slice(0, 7);
  const monthVisits = visits.filter((c) => dayOf(c.timeIn).startsWith(month)).length;
  const latest = (ix.paymentsByMember.get(info.id) ?? [])
    .filter((p) => p.status !== 'pending')
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  const unread = memberNotifications(state, info.id).filter((n) => n.unread).length;
  const remind = reminderDate(state, info.id);

  return (
    <Screen tabs>
      <header className="-mt-1 flex items-center gap-3">
        <LogoMark size={40} />
        <div className="flex-1">
          <div className="text-sm text-ink-muted">
            {weekday(today)}, {dayMonth(today)}
          </div>
          <h1 className="font-heading text-[23px] font-bold">Hello, {info.name.split(' ')[0]}</h1>
        </div>
        <Link
          to="/notifications"
          aria-label={`Notifications, ${unread} new`}
          className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-card"
        >
          <Icon name="bell" />
          {unread > 0 && (
            <span className="absolute right-[11px] top-2.5 h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_0_2px_#151619]" />
          )}
        </Link>
      </header>

      <section className="relative mt-[22px] overflow-hidden rounded-3xl border border-line bg-card p-5">
        <svg
          width="200"
          height="200"
          viewBox="0 0 48 48"
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 opacity-[0.08]"
        >
          <path
            d="M36.7 11.3A18 18 0 1 0 36.7 36.7"
            fill="none"
            stroke="#FF3D0A"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
        <div className="relative flex items-center justify-between">
          <span className="text-xs font-bold tracking-[0.12em] text-ink-muted">MY MEMBERSHIP</span>
          <Pill tone={info.status}>{STATUS_WORD[info.status]}</Pill>
        </div>
        <div className="relative mt-2.5 font-heading text-[28px] font-bold">
          {info.plan === '—' ? 'No plan yet' : `${info.plan} Plan`}
        </div>
        <div className="relative mt-4 flex gap-3">
          <div className="flex-1 rounded-[14px] bg-card-2 px-3.5 py-3">
            <div className="text-[13px] text-ink-muted">
              {info.daysLeft < 0 ? 'Expired on' : 'Expires on'}
            </div>
            <b className="text-[16px]">{formatDate(info.endDate)}</b>
          </div>
          <div className="flex-1 rounded-[14px] bg-card-2 px-3.5 py-3">
            <div className="text-[13px] text-ink-muted">Days remaining</div>
            <b
              className={`font-heading text-[22px] ${info.daysLeft < 0 ? 'text-danger-text' : 'text-brand-text'}`}
            >
              {info.daysLeft === null ? '—' : Math.max(0, info.daysLeft)}
            </b>
          </div>
        </div>
        <Link
          to="/qr"
          className="relative mt-4 flex h-[60px] items-center justify-center gap-2.5 rounded-2xl bg-brand font-heading text-[17px] font-bold tracking-[0.04em] active:scale-[0.98]"
        >
          <Icon name="qr" />
          VIEW MY QR CODE
        </Link>
      </section>

      <div className="mt-3.5 flex gap-2.5">
        <Box className="flex-1 px-4 py-3.5">
          <div className="text-[13px] text-ink-muted">Visits this month</div>
          <b className="font-heading text-[26px]">{monthVisits}</b>
        </Box>
        <Box className="flex-[1.4] !border-warning/40 !bg-warning/[0.06] px-4 py-3.5">
          <div className="text-[13px] font-semibold text-warning-text">Reminder</div>
          <div className="mt-0.5 text-sm leading-snug">
            {info.status === 'expired' ? (
              'Your plan has ended. Renew at the front desk to use your QR code again.'
            ) : remind && remind > today ? (
              <>
                We’ll notify you on <b>{dayMonth(remind)}</b>, a week before your plan ends.
              </>
            ) : (
              'Your plan ends this week. Renew at the front desk to keep your days.'
            )}
          </div>
        </Box>
      </div>

      <SectionTitle title="Recent Attendance" to="/attendance" link="See all" />
      <Box className="px-4 py-0.5">
        {visits.length === 0 && (
          <p className="py-4 text-sm text-ink-muted">No visits yet. See you at the gym!</p>
        )}
        {visits.slice(0, 3).map((c, i) => {
          const d = dayOf(c.timeIn);
          const inside = !c.timeOut && d === today;
          return (
            <div
              key={c.id}
              className={`flex items-center gap-3 py-3.5 ${i ? 'border-t border-line' : ''}`}
            >
              <div className="w-[46px] text-center">
                <b className="block font-heading text-[18px]">{d.slice(8)}</b>
                <span className="text-xs uppercase text-ink-muted">
                  {dayMonth(d).split(' ')[1]}
                </span>
              </div>
              <div className="flex-1">
                <div className="text-[15px]">
                  {d === today ? 'Today' : weekday(d, 'short')} ·{' '}
                  {inside
                    ? `in at ${formatTime(c.timeIn)}`
                    : `${formatTime(c.timeIn)} – ${c.timeOut ? formatTime(c.timeOut) : '?'}`}
                </div>
                <div className="text-[13px] text-ink-muted">
                  {inside ? 'You’re inside now' : visitPart(c.timeIn)}
                </div>
              </div>
              <b className={`text-sm ${inside ? 'text-brand-text' : ''}`}>
                {inside ? 'Inside' : c.timeOut ? formatDuration(c.timeIn, c.timeOut) : '—'}
              </b>
            </div>
          );
        })}
      </Box>

      <SectionTitle title="Latest Payment" to="/payments" link="History" />
      {latest ? (
        <Box className="flex items-center gap-3 p-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success-text">
            <Icon name="check" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px]">{latest.description}</div>
            <div className="text-[13px] text-ink-muted">
              {formatDate(dayOf(latest.at)).slice(0, 6)} · {methodName(state, latest.method)} ·{' '}
              {latest.status === 'paid' ? 'Paid' : latest.status}
            </div>
          </div>
          <b className="font-heading text-[17px]">{formatPeso(latest.amount).replace('.00', '')}</b>
        </Box>
      ) : (
        <Box className="p-4 text-sm text-ink-muted">No payments yet.</Box>
      )}
    </Screen>
  );
}
