import {
  MEMBERSHIP_STATUS_LABELS,
  buildQrPayload,
  formatDuration,
  formatPeso,
  formatTime,
  todayInGym,
} from '@icg/shared';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Icon,
  Presence,
  STAT_GRID,
  StatCard,
  SampleDataBadge,
  StatusBadge,
  Toast,
  useToast,
} from '../../components/ui/index.js';
import { shake } from '../../lib/motion.js';
import { useNow } from '../../lib/useNow.js';
import { CompleteVisitModal } from '../walkins/components/VisitModals.jsx';
import { visitDate } from '../walkins/demoData.js';
import { completeVisit, useWalkinDemo } from '../walkins/demoStore.js';
import { QuickWalkInModal } from '../walkins/QuickWalkInModal.jsx';
import { CameraScanner } from './components/CameraScanner.jsx';
import { ScanResultPanel } from './components/ScanResultPanel.jsx';
import {
  findMembers,
  initials,
  memberStatus,
  openCheckInToday,
  shortDuration,
  summarizeDay,
} from './demoData.js';
import { checkOutMember, scanMember, useAttendanceDemo, useCapacity } from './demoStore.js';

const RISE = 'motion-safe:animate-rise';
const rise = (n) => ({ animationDelay: `${n * 50}ms` });

/** Sample QR codes to try the scanner without a phone (DEMO only). */
const SAMPLE_SCANS = [
  { label: 'Bianca Santos', memberId: 'm3' },
  { label: 'Andrea Lim', memberId: 'm1', hint: 'inside' },
  { label: 'Trisha Navarro', memberId: 'm5', hint: 'expiring' },
  { label: 'Jerome Castro', memberId: 'm8', hint: 'expired' },
  { label: 'Lea Gonzales', memberId: 'm9', hint: 'suspended' },
  { label: 'Unknown code', code: 'ICG:notAnIronCampusCode0000' },
];

const STATUS_BADGE = {
  active: 'ok',
  expiring_soon: 'warn',
  expired: 'bad',
  suspended: 'mute',
  pending: 'mute',
};

/** True when a key press is going into a text box (so it isn't a USB scanner). */
const typingInField = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * QR attendance scanner (docs/design/Attendance.dc.html).
 * Scan once to check in, scan again to check out. Works with the camera, a USB QR scanner (it types
 * the code and presses Enter) or by typing the Member ID or name.
 * DEMO: runs on sample data in the browser; nothing is saved.
 */
export function ScannerPage() {
  const { members, checkIns, rejections } = useAttendanceDemo();
  const capacity = useCapacity();
  const walkins = useWalkinDemo();
  const now = useNow(30_000);
  const today = todayInGym(now);
  const inputId = useId();
  const inputRef = useRef(null);
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState('');
  const [result, setResult] = useState(null);
  const [walkInFor, setWalkInFor] = useState(null); // member name, or '' for an empty form
  const [walkInVisitId, setWalkInVisitId] = useState(null);
  const [toast, showToast, hideToast] = useToast();

  useEffect(() => {
    document.title = 'Attendance · IRON CAMPUS GYM';
  }, []);

  const stats = summarizeDay(checkIns, rejections, today);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // Everyone inside now: members checked in today + walk-ins still inside today. Newest first.
  const inside = useMemo(() => {
    const people = checkIns
      .filter((c) => !c.timeOut && todayInGym(new Date(c.timeIn)) === today)
      .map((c) => ({
        key: c.id,
        kind: 'member',
        id: c.memberId,
        name: memberById.get(c.memberId)?.name,
        timeIn: c.timeIn,
      }));
    const customers = new Map(walkins.customers.map((c) => [c.id, c]));
    for (const v of walkins.visits) {
      if (!v.timeOut && visitDate(v) === today) {
        people.push({
          key: v.id,
          kind: 'walkin',
          id: v.id,
          name: customers.get(v.customerId)?.name,
          timeIn: v.timeIn,
        });
      }
    }
    return people.sort((a, b) => b.timeIn.localeCompare(a.timeIn));
  }, [checkIns, walkins, memberById, today]);

  // Names that match what staff are typing (not for QR codes or empty boxes).
  const suggestions = useMemo(() => {
    const text = typed.trim();
    if (text.length < 2 || text.toUpperCase().startsWith('ICG:')) return [];
    return findMembers(members, text).matches.slice(0, 5);
  }, [typed, members]);

  function show(next) {
    setResult(next);
    setTyped('');
    setTypedError('');
    // On small screens the result is under the scanner: bring it into view.
    requestAnimationFrame(() =>
      document
        .querySelector('[aria-label="Scan result"]')
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
    );
  }

  /** A QR code from the camera, the USB scanner or a sample button. */
  function handleQr(text) {
    const { matches } = findMembers(members, text);
    show(scanMember({ memberId: matches[0]?.id ?? null, mode: 'auto' }));
  }
  const handleQrRef = useRef(handleQr);
  useEffect(() => {
    handleQrRef.current = handleQr;
  });

  // USB QR scanners type the code very fast and press Enter. Catch that anywhere on the page
  // (except while typing in a box or with a pop-up open).
  useEffect(() => {
    let buffer = '';
    let last = 0;
    const onKey = (e) => {
      if (typingInField(e.target) || document.querySelector('[role="dialog"]')) return;
      const t = performance.now();
      if (t - last > 80) buffer = '';
      last = t;
      if (e.key === 'Enter') {
        if (buffer.toUpperCase().startsWith('ICG:')) {
          e.preventDefault();
          handleQrRef.current(buffer);
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function fail(message) {
    setTypedError(message);
    shake(inputRef.current);
    inputRef.current?.focus();
  }

  /** Check In / Check Out for a member picked by ID or name. */
  function run(member, mode) {
    const next = scanMember({ memberId: member.id, mode });
    if (next.kind === 'already-in') {
      fail(
        `${member.name} is already inside (since ${formatTime(next.open.timeIn)}). Press Check Out when they leave.`,
      );
    } else if (next.kind === 'not-in') {
      fail(`${member.name} is not checked in today, so there is nothing to check out.`);
    } else {
      show(next);
    }
  }

  function submitTyped(mode) {
    const text = typed.trim();
    if (!text) return fail('Type a Member ID or name first.');
    // A USB scanner typed a QR code into the box.
    if (text.toUpperCase().startsWith('ICG:')) return handleQr(text);
    const { matches } = findMembers(members, text);
    if (matches.length === 0)
      return fail(`No member found for “${text}”. Check the spelling or the Member ID.`);
    if (matches.length > 1)
      return fail('More than one member matches. Pick the right one from the list.');
    run(matches[0], mode);
  }

  function nextScan() {
    setResult(null);
    inputRef.current?.focus();
  }

  const walkInVisit = walkInVisitId && walkins.visits.find((v) => v.id === walkInVisitId);
  const walkInCustomer =
    walkInVisit && walkins.customers.find((c) => c.id === walkInVisit.customerId);

  return (
    <>
      <div className={`flex flex-wrap items-end justify-between gap-4 px-1 pt-1 ${RISE}`}>
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-[26px] font-bold">
            Attendance
            <SampleDataBadge />
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">
            Scan once to check in. Scan again to check out.
          </p>
        </div>
        <Button to="/attendance/records" variant="plain" icon="reports">
          Attendance Records
        </Button>
      </div>

      <div className={STAT_GRID}>
        <StatCard
          label="Today’s Attendance"
          icon="checkIn"
          className={RISE}
          style={rise(1)}
          value={<Pop>{stats.total}</Pop>}
          note="Member check-ins today"
        />
        <StatCard
          label="Currently Inside"
          icon="users"
          tone="brand"
          className={RISE}
          style={rise(2)}
          value={
            <Pop>
              {inside.length}
              <span className="font-sans text-[16px] font-medium text-ink-muted">
                {' '}
                / {capacity}
              </span>
            </Pop>
          }
          note="Members and walk-ins"
        />
        <StatCard
          label="Checked Out"
          icon="checkOut"
          className={RISE}
          style={rise(3)}
          value={<Pop>{stats.checkedOut}</Pop>}
          note={`Average stay ${stats.averageStay}`}
        />
        <StatCard
          label="Rejected Today"
          icon="alert"
          tone={stats.rejected ? 'danger' : 'default'}
          className={RISE}
          style={rise(4)}
          value={<Pop>{stats.rejected}</Pop>}
          note="Expired, suspended or unknown code"
        />
      </div>

      <div className={`flex flex-wrap items-stretch gap-4 ${RISE}`} style={rise(5)}>
        <section className="flex min-w-0 flex-[1.2_1_440px] flex-col gap-4 rounded-card border border-line bg-card p-[22px]">
          <h2 className="text-[18px] font-semibold">QR Code Scanner</h2>
          <CameraScanner onScan={handleQr} />

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitTyped('in');
            }}
            className="border-t border-line pt-4"
          >
            <label htmlFor={inputId} className="mb-2 block text-sm font-semibold">
              No QR? Type the Member ID or name
            </label>
            <div className="flex flex-wrap gap-2.5">
              <div className="group relative min-w-0 flex-[1_1_200px]">
                <Icon
                  name="search"
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim transition-colors group-focus-within:text-brand-text"
                />
                <input
                  id={inputId}
                  ref={inputRef}
                  value={typed}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    setTypedError('');
                  }}
                  autoComplete="off"
                  placeholder="e.g. ICG-2025-0291"
                  aria-invalid={typedError ? true : undefined}
                  aria-describedby={typedError ? `${inputId}-err` : undefined}
                  className={`h-[50px] w-full rounded-btn border bg-sidebar pl-11 pr-3.5 text-[16px] text-ink outline-none transition placeholder:text-ink-dim focus-visible:ring-0 focus-visible:ring-offset-0 ${
                    typedError
                      ? 'border-danger shadow-[0_0_0_4px_rgb(227_77_77/0.14)]'
                      : 'border-line hover:border-ink-faint focus:border-brand focus:shadow-[0_0_0_4px_rgb(255_61_10/0.14)]'
                  }`}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                icon="checkIn"
                className="h-[50px] text-[15px]"
              >
                Check In
              </Button>
              <Button
                icon="checkOut"
                onClick={() => submitTyped('out')}
                className="h-[50px] text-[15px]"
              >
                Check Out
              </Button>
            </div>
            {typedError && (
              <p
                id={`${inputId}-err`}
                role="alert"
                className="mt-2 flex items-start gap-1.5 text-[13px] text-danger-text motion-safe:animate-drop-in"
              >
                <Icon name="alert" size={14} className="mt-px flex-none" />
                {typedError}
              </p>
            )}

            {suggestions.length > 0 && (
              <ul className="mt-2.5 rounded-btn border border-line bg-sidebar p-1.5 motion-safe:animate-drop-in">
                {suggestions.map((m) => {
                  const { status } = memberStatus(m, today);
                  const open = openCheckInToday(checkIns, m.id, today);
                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 rounded-[10px] px-2.5 py-2 hover:bg-card-2"
                    >
                      <Avatar name={m.name} />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[15px]">{m.name}</b>
                        <span className="block truncate font-mono text-[13px] text-ink-muted">
                          {m.code}
                          {open && (
                            <span className="font-sans">
                              {' '}
                              · inside since {formatTime(open.timeIn)}
                            </span>
                          )}
                        </span>
                      </span>
                      <StatusBadge tone={STATUS_BADGE[status]} size="sm">
                        {MEMBERSHIP_STATUS_LABELS[status]}
                      </StatusBadge>
                      <Button
                        size="sm"
                        variant={open ? 'secondary' : 'primary'}
                        onClick={() => run(m, open ? 'out' : 'in')}
                      >
                        {open ? 'Check Out' : 'Check In'}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2 rounded-btn border border-dashed border-line px-3.5 py-3">
            <span className="mr-1 text-[13px] font-semibold text-ink-muted">
              Try a sample scan:
            </span>
            {SAMPLE_SCANS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() =>
                  handleQr(s.code ?? buildQrPayload(memberById.get(s.memberId).qrToken))
                }
                className="h-9 rounded-full border border-line px-3 text-[13px] font-semibold text-ink-soft transition hover:bg-card-2 hover:text-ink motion-safe:active:scale-95"
              >
                {s.label}
                {s.hint && <span className="font-normal text-ink-muted"> · {s.hint}</span>}
              </button>
            ))}
          </div>
        </section>

        <ScanResultPanel result={result} onNext={nextScan} onWalkIn={(m) => setWalkInFor(m.name)} />
      </div>

      <section
        className={`rounded-card border border-line bg-card p-[22px] ${RISE}`}
        style={rise(6)}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold">Currently Inside · {inside.length}</h2>
          <Link
            to="/attendance/records"
            className="text-sm font-semibold text-brand-text hover:underline"
          >
            See all
          </Link>
        </div>
        {inside.length === 0 ? (
          <p className="mt-3.5 rounded-btn bg-card-2 px-4 py-6 text-center text-ink-muted motion-safe:animate-fade-in">
            Nobody is inside right now.
          </p>
        ) : (
          <ul className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5">
            {inside.map((p) => (
              <li
                key={p.key}
                className="flex items-center gap-3 rounded-btn bg-card-2 p-3 motion-safe:animate-fade-in"
              >
                <Avatar name={p.name ?? '?'} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm">
                    {p.name}
                    {p.kind === 'walkin' && (
                      <span className="font-normal text-ink-muted"> (walk-in)</span>
                    )}
                  </b>
                  <div className="text-[13px] text-ink-muted">
                    In at {formatTime(p.timeIn)} · {shortDuration(p.timeIn, now)}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    p.kind === 'member' ? show(checkOutMember(p.id)) : setWalkInVisitId(p.id)
                  }
                >
                  Check Out
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Presence show={walkInFor !== null}>
        <QuickWalkInModal
          initialName={walkInFor ?? ''}
          onClose={() => setWalkInFor(null)}
          onRegistered={({ visit, customer }) =>
            showToast({
              title: `Walk-in registered · ${formatTime(visit.timeIn)}`,
              body: `${customer.name} · ${formatPeso(visit.fee)} ${visit.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`,
            })
          }
        />
      </Presence>

      <Presence show={Boolean(walkInVisit)}>
        {walkInVisit && (
          <CompleteVisitModal
            visit={walkInVisit}
            customer={walkInCustomer}
            onClose={() => setWalkInVisitId(null)}
            onConfirm={(at) => {
              completeVisit(walkInVisit.id, at);
              setWalkInVisitId(null);
              showToast({
                tone: 'brand',
                title: `Visit completed · ${formatTime(at)}`,
                body: `${walkInCustomer.name} stayed ${formatDuration(walkInVisit.timeIn, at)}`,
              });
            }}
          />
        )}
      </Presence>

      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}

function Avatar({ name }) {
  return (
    <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-line font-heading text-[13px] font-semibold">
      {initials(name)}
    </span>
  );
}

/** A number that slides up softly whenever it changes. */
function Pop({ children }) {
  return (
    <span
      key={String(children?.[0] ?? children)}
      className="inline-block motion-safe:animate-value-pop"
    >
      {children}
    </span>
  );
}
