import { formatDate, formatPeso, formatTimeOfDay } from '@icg/shared';
import { memberPeriods, periodText } from '@icg/demo-data';
import { useState } from 'react';
import { LogoMark } from '../../components/Icon.jsx';
import { Box, KV, PrimaryButton, Screen, Sheet } from '../../components/ui.jsx';
import { STATUS_WORD, useMemberInfo } from '../../lib/useMemberInfo.js';

const STATUS_TEXT = {
  active: 'text-success-text',
  expiring_soon: 'text-warning-text',
  expired: 'text-danger-text',
};

/** My Membership (docs/design/MMembership.dc.html). */
export function MembershipPage() {
  const { state, today, info } = useMemberInfo();
  const [sheet, setSheet] = useState(false);
  const periods = memberPeriods(state, info.id).filter((s) => s.status !== 'cancelled');
  const previous = periods.filter((s) => s.endDate < today);
  const upcoming = periods.filter((s) => s.startDate > today);
  const { opensAt, closesAt } = state.settings;

  return (
    <Screen title="My Membership">
      <section className="relative mt-[18px] overflow-hidden rounded-3xl bg-brand p-5">
        <svg
          width="220"
          height="220"
          viewBox="0 0 48 48"
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-16 opacity-20"
        >
          <path
            d="M36.7 11.3A18 18 0 1 0 36.7 36.7"
            fill="none"
            stroke="#090A0C"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
        <div className="relative flex items-center justify-between">
          <span className="flex items-center gap-2 font-heading text-sm font-extrabold tracking-[0.06em]">
            <LogoMark size={22} plate="#FFFFFF" bar="#090A0C" />
            {state.settings.gymName}
          </span>
          <span
            className={`inline-flex h-7 items-center rounded-full bg-base px-3 text-[13px] font-bold ${STATUS_TEXT[info.status] ?? 'text-ink-soft'}`}
          >
            ● {STATUS_WORD[info.status]}
          </span>
        </div>
        <div className="relative mt-6 font-heading text-[28px] font-bold">{info.name}</div>
        <div className="relative mt-[18px] flex justify-between text-[13px]">
          <div>
            <div className="opacity-85">MEMBER ID</div>
            <b className="font-mono text-[16px]">{info.code}</b>
          </div>
          <div className="text-right">
            <div className="opacity-85">PLAN</div>
            <b className="text-[16px]">{info.plan}</b>
          </div>
        </div>
      </section>

      <Box className="mt-4 px-4">
        <KV label="Membership Status" first>
          <span className={STATUS_TEXT[info.status] ?? 'text-ink-soft'}>
            {STATUS_WORD[info.status]}
          </span>
        </KV>
        <KV label="Start Date">{formatDate(info.current?.startDate ?? info.startDate)}</KV>
        <KV label="Expiration Date">{formatDate(info.endDate)}</KV>
        <KV label="Days Remaining">
          <span className="text-brand-text">
            {info.daysLeft === null
              ? '—'
              : info.daysLeft < 0
                ? 'Expired'
                : `${info.daysLeft} ${info.daysLeft === 1 ? 'day' : 'days'}`}
          </span>
        </KV>
        {upcoming.length > 0 && (
          <KV label="Already renewed">
            {upcoming.map((s) => `${s.planName} from ${formatDate(s.startDate)}`).join(', ')}
          </KV>
        )}
      </Box>

      <PrimaryButton className="mt-4 h-[58px]" onClick={() => setSheet(true)}>
        Renew Membership
      </PrimaryButton>

      <h2 className="mb-2.5 mt-6 font-heading text-[17px] font-semibold">Previous Memberships</h2>
      <Box>
        {previous.length === 0 && (
          <p className="p-4 text-sm text-ink-muted">This is your first membership.</p>
        )}
        <ol>
          {previous.map((s, i) => (
            <li
              key={s.id}
              className={`flex items-center gap-3 px-4 py-3.5 ${i ? 'border-t border-line' : ''}`}
            >
              <div className="flex-1">
                <div className="text-[15px]">{s.planName}</div>
                <div className="text-[13px] text-ink-muted">
                  {periodText(s.startDate, s.endDate)}
                </div>
              </div>
              <b className="text-sm">{formatPeso(s.price).replace('.00', '')}</b>
            </li>
          ))}
        </ol>
      </Box>

      {sheet && (
        <Sheet title="How to renew" onClose={() => setSheet(false)}>
          <div className="mt-2.5">
            {[
              `Visit the front desk any time we’re open (${formatTimeOfDay(opensAt).replace(':00', '')} – ${formatTimeOfDay(closesAt).replace(':00', '')}).`,
              `Choose your plan. Pay by ${state.paymentMethods
                .filter((m) => m.enabled)
                .map((m) => m.name)
                .join(', ')
                .replace(/, ([^,]*)$/, ' or $1')}.`,
              'Your new dates show here right away. Your QR code stays the same.',
            ].map((text, i) => (
              <div key={text} className="flex gap-3 py-2.5 text-[15px] leading-normal">
                <b className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-card-2 font-heading text-[13px] text-brand-text">
                  {i + 1}
                </b>
                <span>{text}</span>
              </div>
            ))}
          </div>
          {info.endDate && info.daysLeft >= 0 && (
            <p className="mb-4 mt-2 rounded-xl bg-card-2 px-3.5 py-3 text-sm text-ink-soft">
              Renew before {formatDate(info.endDate).slice(0, 6)} and the new plan starts the day
              after your current one ends.
            </p>
          )}
          <PrimaryButton onClick={() => setSheet(false)} className="mt-2">
            Got it
          </PrimaryButton>
        </Sheet>
      )}
    </Screen>
  );
}
