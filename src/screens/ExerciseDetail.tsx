/**
 * Per-exercise progress: a line chart (heaviest set / estimated 1RM / volume)
 * with time-range filters, personal bests, and every past session's sets.
 */
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Exercise } from '../db/types';
import { getExerciseHistory, repBests, type ExerciseSessionStat } from '../lib/exerciseStats';
import { fmtDate, fmtKg, fmtSets, fmtTarget, fmtWeight } from '../lib/format';
import { goBack, navigate } from '../lib/router';
import { Segmented } from '../components/Segmented';
import { ExerciseChart } from '../components/ExerciseChart';

type Metric = 'heaviest' | 'e1rm' | 'volume' | 'reps';
type Range = '1m' | '3m' | '6m' | '1y' | 'all';

const RANGE_DAYS: Record<Range, number> = { '1m': 31, '3m': 92, '6m': 183, '1y': 366, all: Infinity };
const RANGES: { value: Range; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

/** Chart metrics for an exercise. Chin-ups (added weight) swap the 1RM estimate for most reps. */
function metricsFor(ex: Exercise): { value: Metric; label: string }[] {
  return ex.loadType === 'added'
    ? [
        { value: 'heaviest', label: 'Added kg' },
        { value: 'reps', label: 'Most reps' },
        { value: 'volume', label: 'Volume' },
      ]
    : [
        { value: 'heaviest', label: 'Heaviest' },
        { value: 'e1rm', label: 'Est. 1RM' },
        { value: 'volume', label: 'Volume' },
      ];
}

const METRIC_INFO: Record<Metric, { unit: string; title: string; pick: (h: ExerciseSessionStat) => number }> = {
  heaviest: { unit: 'kg', title: 'Heaviest set weight per session', pick: (h) => h.heaviest },
  e1rm: { unit: 'kg', title: 'Estimated 1RM per session (Epley)', pick: (h) => h.e1rm },
  volume: { unit: 'kg', title: 'Total volume per session (reps × weight)', pick: (h) => h.volume },
  reps: { unit: 'reps', title: 'Most reps in a set per session', pick: (h) => h.maxReps },
};

export function ExerciseDetailScreen({ exerciseId }: { exerciseId: string }) {
  const data = useLiveQuery(async () => {
    const exercise = await db.exercises.get(exerciseId);
    if (!exercise) return null;
    return { exercise, history: await getExerciseHistory(exerciseId) };
  }, [exerciseId]);

  const [metric, setMetric] = useState<Metric>('heaviest');
  const [range, setRange] = useState<Range>('all');

  const points = useMemo(() => {
    if (!data) return [];
    const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
    return data.history
      .filter((h) => h.date >= cutoff)
      .map((h) => ({ date: h.date, value: METRIC_INFO[metric].pick(h) }));
  }, [data, metric, range]);

  if (data === undefined) return null;
  if (data === null) {
    return (
      <main className="screen">
        <p>Exercise not found.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/history')}>
          Back to History
        </button>
      </main>
    );
  }

  const { exercise: ex, history } = data;
  const info = METRIC_INFO[metric];
  const bests = repBests(history);
  const bestE1rm = history.length ? history.reduce((a, b) => (b.e1rm > a.e1rm ? b : a)) : null;
  const heaviest = history.length ? history.reduce((a, b) => (b.heaviest > a.heaviest ? b : a)) : null;

  return (
    <main className="screen">
      <header className="screen-header">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => goBack('/history')}>
          ‹ Back
        </button>
      </header>
      <h1 className="detail-title">{ex.name}</h1>
      <p className="muted detail-sub">
        Target {fmtTarget(ex)} · {history.length} {history.length === 1 ? 'session' : 'sessions'}
      </p>

      {history.length === 0 ? (
        <p className="muted empty">No sets logged yet. Your progress chart appears after your first session.</p>
      ) : (
        <>
          <Segmented label="Chart metric" value={metric} onChange={setMetric} options={metricsFor(ex)} />
          <h2 className="chart-title">{info.title}</h2>
          {points.length === 0 ? (
            <p className="muted chart-empty">No sessions in this time range.</p>
          ) : (
            <ExerciseChart
              points={points}
              unit={info.unit}
              description={`${info.title}, ${points.length} sessions`}
            />
          )}
          {points.length === 1 && <p className="muted small">One more session and you’ll see a trend line.</p>}
          <Segmented label="Time range" value={range} onChange={setRange} options={RANGES} />

          <h2 className="section-title">Personal bests</h2>
          <div className="pb-grid">
            {heaviest && (
              <div className="stat">
                <span className="stat-value">{fmtWeight(ex, heaviest.heaviest)}</span>
                <span className="stat-label">Heaviest set · {fmtDate(heaviest.date)}</span>
              </div>
            )}
            {bestE1rm && ex.loadType !== 'added' && (
              <div className="stat">
                <span className="stat-value">{fmtKg(Math.round(bestE1rm.e1rm * 10) / 10)} kg</span>
                <span className="stat-label">Best est. 1RM · {fmtDate(bestE1rm.date)}</span>
              </div>
            )}
          </div>
          <table className="rep-table">
            <caption className="muted small">Best weight for at least this many reps</caption>
            <thead>
              <tr>
                <th scope="col">Reps</th>
                <th scope="col">Weight</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {bests.map((b) => (
                <tr key={`${b.reps}-${b.weight}`}>
                  <td>{b.reps}</td>
                  <td>{fmtWeight(ex, b.weight)}</td>
                  <td className="muted">{fmtDate(b.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="section-title">All sessions</h2>
          <ul className="history-list">
            {[...history].reverse().map((h) => (
              <li key={h.sessionId}>
                <button
                  type="button"
                  className="history-row"
                  onClick={() => navigate(`/history/session/${h.sessionId}`)}
                >
                  <span className="history-main">
                    <strong>{fmtDate(h.date)}</strong>
                    <span className="muted small">{fmtSets(ex, h.sets)}</span>
                  </span>
                  <span className="muted" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
