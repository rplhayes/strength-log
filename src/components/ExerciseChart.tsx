/**
 * Single-series progress line chart (Recharts).
 * One metric at a time, so no legend is needed — the selected metric names it.
 * Colours come from CSS variables so the chart follows light/dark mode.
 */
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtKg } from '../lib/format';

export interface ChartPoint {
  date: number;
  value: number;
}

interface Props {
  points: ChartPoint[];
  /** Unit shown after values, e.g. "kg" or "reps". */
  unit: string;
  /** Accessible description of what the chart shows. */
  description: string;
}

/**
 * Round-number y-axis ticks (e.g. 90, 100, 110, 120, 130) covering the data,
 * with at most about five gridlines.
 */
function niceTicks(values: number[]): number[] {
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    // Flat line: give it some room so it sits mid-chart.
    const pad = Math.max(1, Math.abs(lo) * 0.1);
    lo -= pad;
    hi += pad;
  }
  const steps = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
  const step = steps.find((st) => (hi - lo) / st <= 4) ?? Math.ceil((hi - lo) / 4);
  const start = Math.max(0, Math.floor(lo / step) * step);
  const ticks: number[] = [];
  for (let t = start; t < hi + step; t += step) {
    ticks.push(Math.round(t * 100) / 100);
    if (t >= hi) break;
  }
  return ticks;
}

const shortDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function ChartTooltip({ active, payload, unit }: { active?: boolean; payload?: { payload: ChartPoint }[]; unit: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <span className="muted small">{new Date(p.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
      <strong>
        {fmtKg(Math.round(p.value * 10) / 10)} {unit}
      </strong>
    </div>
  );
}

export function ExerciseChart({ points, unit, description }: Props) {
  const ticks = niceTicks(points.map((p) => p.value));
  return (
    <div className="chart" role="img" aria-label={description}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={shortDate}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            width={44}
            domain={[ticks[0], ticks[ticks.length - 1]]}
            ticks={ticks}
            interval={0}
            tickFormatter={(v: number) => fmtKg(Math.round(v * 10) / 10)}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={false}
            allowDecimals
          />
          <Tooltip
            content={<ChartTooltip unit={unit} />}
            cursor={{ stroke: 'var(--muted)', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
