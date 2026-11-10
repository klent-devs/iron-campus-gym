import { CAPACITY_LEVEL, CAPACITY_LEVEL_LABELS } from '@icg/shared';
import { Button, Card, CardHeader, StatusBadge } from '../../../components/ui/index.js';
import { colors } from '../../../lib/theme.js';
import { CAPACITY_TONES } from '../format.js';

const ARC = 'M30 140 A100 100 0 0 1 230 140';
const ARC_LENGTH = Math.PI * 100; // half circle, radius 100

/** Half-circle gauge: people inside now vs the gym's max capacity. */
export function CapacityGauge({ capacity, refreshSeconds }) {
  const notSet = capacity.level === CAPACITY_LEVEL.NOT_SET;
  const filled = notSet ? 0 : Math.min(capacity.percent, 100) / 100;
  const label = CAPACITY_LEVEL_LABELS[capacity.level];

  return (
    <Card className="flex-[1_1_320px]" aria-labelledby="capacity-title">
      <CardHeader
        id="capacity-title"
        title="Gym Capacity"
        subtitle={`Updates every ${refreshSeconds} seconds`}
        actions={<StatusBadge tone="ok">Live</StatusBadge>}
      />

      <div
        className="relative mx-auto mt-[18px] h-40 w-[260px]"
        role="img"
        aria-label={
          notSet
            ? `${capacity.insideNow} people inside. Max capacity not set.`
            : `${capacity.percent}% full: ${capacity.insideNow} of ${capacity.maxCapacity} people. ${label}.`
        }
      >
        <svg width="260" height="160" viewBox="0 0 260 160" aria-hidden="true">
          <path d={ARC} fill="none" stroke={colors.line} strokeWidth="26" strokeLinecap="round" />
          {filled > 0 && (
            <path
              d={ARC}
              fill="none"
              stroke={colors.brand}
              strokeWidth="26"
              strokeLinecap="round"
              strokeDasharray={ARC_LENGTH}
              strokeDashoffset={ARC_LENGTH * (1 - filled)}
              className="transition-[stroke-dashoffset] duration-700"
            />
          )}
        </svg>
        <div className="absolute inset-x-0 top-[70px] text-center">
          <div className="font-heading text-[34px] font-bold leading-tight">
            {notSet ? '—' : `${capacity.percent}%`}
          </div>
          <StatusBadge tone={CAPACITY_TONES[capacity.level]} size="sm">
            {label}
          </StatusBadge>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-center">
        <div className="rounded-btn bg-card-2 p-3">
          <div className="text-xs text-ink-muted">Inside now</div>
          <div className="font-heading text-[22px] font-bold text-brand-text">
            {capacity.insideNow}
          </div>
        </div>
        <div className="rounded-btn bg-card-2 p-3">
          <div className="text-xs text-ink-muted">Max capacity</div>
          <div className="font-heading text-[22px] font-bold">{capacity.maxCapacity ?? '—'}</div>
        </div>
      </div>

      {notSet && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-muted">
          <span>Set the max capacity to see how full the gym is.</span>
          <Button to="/settings" size="sm">
            Open Settings
          </Button>
        </div>
      )}
    </Card>
  );
}
