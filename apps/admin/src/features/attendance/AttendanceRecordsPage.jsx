import {
  addDays,
  formatDate,
  formatDuration,
  formatShortDate,
  formatTime,
  todayInGym,
} from '@icg/shared';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Icon,
  Presence,
  SampleDataBadge,
  StatusBadge,
  Toast,
  useToast,
} from '../../components/ui/index.js';
import { prefersReducedMotion } from '../../lib/motion.js';
import { useNow } from '../../lib/useNow.js';
import { FixTimeOutModal } from './components/FixTimeOutModal.jsx';
import {
  RECORD_RANGES,
  dayOf,
  matchesMember,
  missedCheckOuts,
  recordRange,
  summarizeDay,
} from './demoData.js';
import { fixTimeOut, useAttendanceDemo } from './demoStore.js';

const RISE = 'motion-safe:animate-rise';
const rise = (n) => ({ animationDelay: `${n * 50}ms` });
const FLASH_MS = 1600;

const EMPTY_WHEN = {
  today: 'today',
  yesterday: 'yesterday',
  week: 'this week',
  pick: 'on this day',
};

/**
 * Attendance Records (docs/design/AttendanceRecords.dc.html): every member check-in and check-out.
 * Visits from an earlier day with no time out stay at the top until someone fixes them.
 * DEMO: runs on sample data in the browser; nothing is saved.
 */
export function AttendanceRecordsPage() {
  const { members, checkIns, rejections } = useAttendanceDemo();
  const now = useNow(60_000);
  const today = todayInGym(now);
  const [range, setRange] = useState('today');
  const [picked, setPicked] = useState(today);
  const [search, setSearch] = useState('');
  const [fixingId, setFixingId] = useState(null);
  const [flash, setFlash] = useState(null); // { id, n }
  // Rows fixed on this page stay at the top (with "Fixed") until the date filter changes.
  const [justFixed, setJustFixed] = useState([]);
  const [toast, showToast, hideToast] = useToast();

  useEffect(() => {
    document.title = 'Attendance Records · IRON CAMPUS GYM';
  }, []);

  useEffect(() => {
    if (!flash) return undefined;
    const raf = requestAnimationFrame(() =>
      document.querySelector(`[data-checkin="${flash.id}"]`)?.scrollIntoView({
        block: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      }),
    );
    const timer = setTimeout(() => setFlash(null), FLASH_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [flash]);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const stats = summarizeDay(checkIns, rejections, today);
  const missing = missedCheckOuts(checkIns, today);
  const missingIds = new Set(missing.map((c) => c.id));
  const { from, to } = recordRange(range, today, picked);

  const fixedHere = justFixed.map((id) => checkIns.find((c) => c.id === id)).filter(Boolean);
  const pinnedIds = new Set([...missingIds, ...justFixed]);
  const pinned = [...missing, ...fixedHere].filter((c) =>
    matchesMember(memberById.get(c.memberId), search),
  );
  const rows = checkIns
    .filter((c) => {
      const d = dayOf(c.timeIn);
      return (
        d >= from &&
        d <= to &&
        !pinnedIds.has(c.id) &&
        matchesMember(memberById.get(c.memberId), search)
      );
    })
    .sort((a, b) => b.timeIn.localeCompare(a.timeIn));
  const shown = [...pinned, ...rows];

  const fixing = fixingId && checkIns.find((c) => c.id === fixingId);
  const fixingMember = fixing && memberById.get(fixing.memberId);

  const yesterday = addDays(today, -1);
  const allYesterday = missing.every((c) => dayOf(c.timeIn) === yesterday);
  const rangeLabel = (key) =>
    key === 'today'
      ? `Today · ${formatShortDate(now).replace(/ \d{4}$/, '')}`
      : key === 'yesterday'
        ? `Yesterday · ${formatDate(yesterday).slice(0, 6)}`
        : RECORD_RANGES[key];

  return (
    <>
      {/* Same header spacing and alignment as every other page (components/ui/PageHeader.jsx). */}
      <div className={`flex flex-wrap items-center justify-between gap-4 pb-2 pt-3 ${RISE}`}>
        <div className="min-w-0 pl-1.5">
          <h1 className="flex flex-wrap items-center gap-3 text-[26px] font-bold">
            Attendance Records
            <SampleDataBadge />
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">
            Every check-in and check-out, saved automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button to="/reports" variant="plain">
            Export Report
          </Button>
          <Button to="/attendance" variant="plainPrimary" icon="qr">
            Open Scanner
          </Button>
        </div>
      </div>

      {missing.length > 0 && (
        <div
          role="alert"
          className={`flex flex-wrap items-center gap-3 rounded-[14px] border border-warning/35 bg-warning/[0.08] px-[18px] py-3.5 ${RISE}`}
          style={rise(1)}
        >
          <Icon name="clock" size={20} className="text-warning-text" />
          <span className="flex-1 text-[15px]">
            {missing.length} {missing.length === 1 ? 'member' : 'members'} from{' '}
            {allYesterday ? 'yesterday' : 'earlier days'} {missing.length === 1 ? 'has' : 'have'}{' '}
            <b>no time out</b>. Fix them so their hours are correct.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFixingId(missing[0].id)}
            className="border-warning/60 text-warning-text hover:bg-warning/10"
          >
            Fix Now
          </Button>
        </div>
      )}

      <section
        aria-label="Attendance records"
        className={`overflow-hidden rounded-card border border-line bg-card ${RISE}`}
        style={rise(2)}
      >
        <div className="flex flex-wrap items-center gap-3 p-4">
          <label className="flex h-[46px] max-w-[360px] flex-[1_1_260px] items-center gap-2.5 rounded-btn border border-line bg-sidebar px-3.5 text-ink-muted transition focus-within:border-brand">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search member"
              placeholder="Search member name or ID"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </label>
          <span className="relative inline-flex">
            <select
              aria-label="Date"
              value={range}
              onChange={(e) => {
                setRange(e.target.value);
                setJustFixed([]);
              }}
              className="h-[46px] appearance-none rounded-btn border border-line bg-sidebar pl-3.5 pr-10 text-[15px] text-ink"
            >
              {Object.keys(RECORD_RANGES).map((key) => (
                <option key={key} value={key}>
                  {rangeLabel(key)}
                </option>
              ))}
            </select>
            <Icon
              name="chevronDown"
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft"
            />
          </span>
          {range === 'pick' && (
            <input
              type="date"
              aria-label="Pick a date"
              value={picked}
              max={today}
              onChange={(e) => {
                if (!e.target.value) return;
                setPicked(e.target.value);
                setJustFixed([]);
              }}
              className="h-[46px] rounded-btn border border-line bg-sidebar px-3.5 text-[15px] text-ink [color-scheme:dark] motion-safe:animate-drop-in"
            />
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
            <thead>
              <tr className="bg-card-2 text-left text-[13px] text-ink-muted">
                {['Member Name', 'Member ID', 'Date', 'Time In', 'Time Out', 'Duration'].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-3.5 font-semibold">
                      {h}
                    </th>
                  ),
                )}
                <th className="px-3 py-3.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody key={`${range}|${picked}`} className="motion-safe:animate-fade-in">
              {shown.map((c) => {
                const member = memberById.get(c.memberId);
                const isMissing = missingIds.has(c.id);
                const flashing = flash?.id === c.id;
                return (
                  <tr
                    key={flashing ? `${c.id}-${flash.n}` : c.id}
                    data-checkin={c.id}
                    className={`whitespace-nowrap transition-colors hover:bg-card-2/50 ${
                      isMissing ? 'bg-warning/[0.04]' : ''
                    } ${flashing ? 'motion-safe:animate-row-flash' : ''}`}
                  >
                    <td className="border-t border-line px-3 py-3 font-semibold">{member?.name}</td>
                    <td className="border-t border-line px-3 py-3 font-mono text-[13px] text-ink-soft">
                      {member?.code}
                    </td>
                    <td className="border-t border-line px-3 py-3 text-ink-soft">
                      {formatDate(dayOf(c.timeIn))}
                    </td>
                    <td className="border-t border-line px-3 py-3 text-success-text">
                      <span aria-hidden="true">↘ </span>
                      {formatTime(c.timeIn)}
                    </td>
                    <td className="border-t border-line px-3 py-3">
                      {c.timeOut ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-danger-text">
                            <span aria-hidden="true">↗ </span>
                            {formatTime(c.timeOut)}
                          </span>
                          {c.fix && (
                            <span title={`Fixed by staff: ${c.fix.reason}`}>
                              <StatusBadge tone="mute" size="sm">
                                Fixed
                              </StatusBadge>
                            </span>
                          )}
                        </span>
                      ) : isMissing ? (
                        <span className="font-semibold text-warning-text">No time out</span>
                      ) : (
                        <span className="font-semibold text-brand-text">Still inside</span>
                      )}
                    </td>
                    <td className="border-t border-line px-3 py-3">
                      {c.timeOut ? formatDuration(c.timeIn, c.timeOut) : isMissing ? '—' : 'Inside'}
                    </td>
                    <td className="border-t border-line px-3 py-3 text-right">
                      {isMissing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setFixingId(c.id)}
                          className="border-warning/70 text-warning-text hover:bg-warning/10"
                        >
                          Fix Time Out
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length === 0 && (
            <div className="px-5 py-12 text-center motion-safe:animate-fade-in">
              <b className="font-heading text-[17px] font-semibold">Nothing here</b>
              <p className="mt-1.5 text-ink-muted">
                {search.trim()
                  ? `No check-ins match “${search.trim()}” ${EMPTY_WHEN[range]}.`
                  : `No check-ins ${EMPTY_WHEN[range]}.`}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-line px-4 py-3.5 text-sm text-ink-muted">
          Today: {stats.total} {stats.total === 1 ? 'check-in' : 'check-ins'} · {stats.checkedOut}{' '}
          {stats.checkedOut === 1 ? 'check-out' : 'check-outs'} · average stay {stats.averageStay}
        </div>
      </section>

      <Presence show={Boolean(fixing)}>
        {fixing && (
          <FixTimeOutModal
            checkIn={fixing}
            member={fixingMember}
            onClose={() => setFixingId(null)}
            onSave={(timeOutIso, reason) => {
              fixTimeOut(fixing.id, timeOutIso, reason);
              setFixingId(null);
              setJustFixed((ids) => [fixing.id, ...ids]);
              setFlash((f) => ({ id: fixing.id, n: (f?.n ?? 0) + 1 }));
              showToast({
                title: 'Time out saved',
                body: `${fixingMember.name} · ${formatDate(dayOf(fixing.timeIn))}, ${formatTime(fixing.timeIn)} – ${formatTime(timeOutIso)} · ${reason}`,
              });
            }}
          />
        )}
      </Presence>

      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}
