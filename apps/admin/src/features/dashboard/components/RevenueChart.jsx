import { REVENUE_RANGES, formatPeso, formatPesoCompact } from '@icg/shared';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, EmptyState } from '../../../components/ui/index.js';
import { colors } from '../../../lib/theme.js';
import { monthLabels } from '../format.js';

function Legend({ colorClass, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
      <i className={`h-2.5 w-2.5 rounded-[3px] ${colorClass}`} aria-hidden="true" />
      {children}
    </span>
  );
}

function ChartTooltip({ active, payload, expensesTracked }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-btn border border-line bg-sidebar px-3 py-2 text-[13px] shadow-xl">
      <div className="mb-1 font-semibold text-ink">{row.longLabel}</div>
      <div className="text-ink-soft">
        Revenue <b className="text-ink">{formatPeso(row.revenue)}</b>
      </div>
      <div className="text-ink-soft">
        Expenses{' '}
        <b className="text-ink">{expensesTracked ? formatPeso(row.expenses) : 'not recorded'}</b>
      </div>
    </div>
  );
}

/** X-axis label; the current (last) month is highlighted in orange like the design. */
function MonthTick({ x, y, payload, index, lastIndex }) {
  const current = (index ?? payload.index) === lastIndex;
  return (
    <text
      x={x}
      y={y + 14}
      textAnchor="middle"
      fontSize={12}
      fontWeight={current ? 700 : 400}
      fill={current ? colors.brandText : colors.inkMuted}
    >
      {payload.value}
    </text>
  );
}

/** Revenue Analytics: monthly revenue (orange) vs expenses (gray) with a date range picker. */
export function RevenueChart({ chart, range, onRangeChange, refreshing }) {
  const rows = chart.months.map((m) => {
    const labels = monthLabels(m.month);
    return { ...m, label: labels.short, longLabel: labels.long };
  });
  const hasSales = rows.some((r) => r.revenue > 0);
  const lastIndex = rows.length - 1;

  return (
    <Card className="min-w-0 flex-[2.4_1_440px]" aria-labelledby="revenue-title">
      <CardHeader
        id="revenue-title"
        title="Revenue Analytics"
        actions={
          <>
            <Legend colorClass="bg-brand">Revenue</Legend>
            <Legend colorClass="bg-ink-faint">Expenses</Legend>
            <select
              aria-label="Date range"
              value={range}
              onChange={(e) => onRangeChange(e.target.value)}
              className="h-11 rounded-[10px] border border-line bg-sidebar px-3 text-[13px] font-semibold text-ink"
            >
              {Object.entries(REVENUE_RANGES).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </>
        }
      />

      <div
        className={`mt-[18px] h-[260px] transition-opacity ${refreshing ? 'opacity-50' : ''}`}
        aria-busy={refreshing || undefined}
      >
        {hasSales ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              barGap={3}
              barCategoryGap="22%"
              margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke={colors.line} strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: colors.line }}
                tickLine={false}
                interval={0}
                tick={<MonthTick lastIndex={lastIndex} />}
              />
              <YAxis
                width={56}
                axisLine={false}
                tickLine={false}
                tickCount={4}
                tickFormatter={formatPesoCompact}
                tick={{ fill: colors.inkMuted, fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: colors.card2, opacity: 0.6 }}
                content={<ChartTooltip expensesTracked={chart.expensesTracked} />}
              />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill={colors.brand}
                radius={[5, 5, 0, 0]}
                maxBarSize={16}
                isAnimationActive={false}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill={colors.inkFaint}
                radius={[5, 5, 0, 0]}
                maxBarSize={16}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            compact
            icon="reports"
            title="No payments in this period yet"
            // The hyphens in "walk-ins"/"check-ins" below are non-breaking (U+2011), so the word never splits over two lines.
            message="Paid memberships, walk‑ins and product sales will show here by month."
          />
        )}
      </div>

      {/* Same numbers as text, for screen readers. */}
      <table className="sr-only">
        <caption>Revenue by month</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <th scope="row">{r.longLabel}</th>
              <td>{formatPeso(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3.5 text-[13px] text-ink-muted">
        <span>
          {REVENUE_RANGES[chart.range].totalLabel}{' '}
          <b className="text-ink">{formatPeso(chart.totals.revenue)}</b>
        </span>
        <span>
          Expenses <b className="text-ink">{formatPeso(chart.totals.expenses)}</b>
          {!chart.expensesTracked && (
            <span className="ml-1.5 text-xs">(expenses aren&apos;t recorded yet)</span>
          )}
        </span>
        <span>
          Net <b className="text-success-text">{formatPeso(chart.totals.net)}</b>
        </span>
      </div>
    </Card>
  );
}
