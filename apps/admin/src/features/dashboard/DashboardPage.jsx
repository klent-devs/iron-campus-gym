import { DEFAULT_REVENUE_RANGE, formatTime, greetingFor } from '@icg/shared';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Icon, STAT_GRID, Skeleton } from '../../components/ui/index.js';
import { useApi } from '../../lib/useApi.js';
import { useNow } from '../../lib/useNow.js';
import { getDashboard } from './api.js';
import { AlertsPanel } from './components/AlertsPanel.jsx';
import { CapacityGauge } from './components/CapacityGauge.jsx';
import { RecentActivities } from './components/RecentActivities.jsx';
import { RevenueChart } from './components/RevenueChart.jsx';
import { StatCards } from './components/StatCards.jsx';

const REFRESH_SECONDS = 30;

function PageHeader() {
  const now = useNow(60_000); // the greeting only needs to change once a minute
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex-[1_1_280px]">
        <h1 className="text-[26px] font-bold">Manage Your Gym Business</h1>
        <p className="mt-1.5 text-[15px] text-ink-muted">
          {greetingFor(now)}! Here’s your gym overview.
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button to="/attendance">Check In Member</Button>
        <Button to="/members/new" variant="primary">
          + Add Member
        </Button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading the dashboard">
      <div className={STAT_GRID}>
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-[10px]" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-40" />
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        <Card className="flex flex-[1_1_320px] flex-col items-center gap-4">
          <Skeleton className="h-3 w-32 self-start" />
          <Skeleton className="h-32 w-60 rounded-t-full" />
          <Skeleton className="h-14 w-full" />
        </Card>
        <Card className="flex min-w-0 flex-[2.4_1_440px] flex-col gap-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-[260px] w-full" />
        </Card>
      </div>
      <div className="flex flex-wrap gap-4">
        <Card className="flex min-w-0 flex-[2_1_480px] flex-col gap-4">
          <Skeleton className="h-3 w-40" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3.5">
              <Skeleton className="h-[38px] w-[38px] rounded-[10px]" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </Card>
        <Card className="flex flex-[1_1_340px] flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    </div>
  );
}

function LoadError({ error, onRetry }) {
  return (
    <Card>
      <EmptyState
        tone="danger"
        icon="alert"
        title={error.offline ? "Can't reach the gym server" : "Couldn't load the dashboard"}
        message={
          error.offline
            ? 'Make sure the gym server is running (npm run dev), then try again.'
            : error.message
        }
        action={
          <Button variant="primary" icon="refresh" onClick={onRetry}>
            Try Again
          </Button>
        }
      />
    </Card>
  );
}

/** Shown above the page when a background refresh fails but older numbers are still on screen. */
function StaleBanner({ error, updatedAt, onRetry }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-card border border-warning/40 bg-warning/[0.08] px-4 py-3 text-sm text-ink-soft"
    >
      <Icon name="alert" className="text-warning-text" />
      <span className="flex-1">
        <b className="text-warning-text">Couldn&apos;t refresh.</b> Showing numbers from{' '}
        {formatTime(updatedAt)}. {error.message}
      </span>
      <Button size="sm" icon="refresh" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}

/** Admin Dashboard (docs/design/Main.dc.html). */
export function DashboardPage() {
  const [range, setRange] = useState(DEFAULT_REVENUE_RANGE);
  const load = useCallback((signal) => getDashboard(range, signal), [range]);
  const { data, error, loading, refreshing, reload } = useApi(load, {
    refreshMs: REFRESH_SECONDS * 1000,
  });

  useEffect(() => {
    document.title = 'Overview · IRON CAMPUS GYM';
  }, []);

  let body;
  if (loading && !data) body = <DashboardSkeleton />;
  else if (!data) body = <LoadError error={error} onRetry={reload} />;
  else {
    body = (
      <>
        {error && <StaleBanner error={error} updatedAt={data.generatedAt} onRetry={reload} />}
        <StatCards data={data} />
        <div className="flex flex-wrap gap-4">
          <CapacityGauge capacity={data.capacity} refreshSeconds={REFRESH_SECONDS} />
          {data.revenueChart && (
            <RevenueChart
              chart={data.revenueChart}
              range={range}
              onRangeChange={setRange}
              refreshing={refreshing && data.revenueChart.range !== range}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          <RecentActivities activities={data.activities} today={data.today} />
          <AlertsPanel alerts={data.alerts} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader />
      {body}
    </>
  );
}
