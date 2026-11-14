/** Shown after "Finish workout": duration, sets, volume and personal bests. */
import { useLiveQuery } from 'dexie-react-hooks';
import { summariseSession, type PersonalBest } from '../lib/records';
import { fmtDate, fmtDuration, fmtKg, fmtSets, fmtWeight } from '../lib/format';
import { navigate } from '../lib/router';

function describePb(pb: PersonalBest): { title: string; detail: string } {
  if (pb.kind === 'e1rm') {
    return {
      title: `${pb.exercise.name}: best estimated 1RM`,
      detail: `${fmtKg(Math.round(pb.value * 10) / 10)} kg (from ${fmtKg(pb.weight)} × ${pb.reps}), up from ${fmtKg(
        Math.round(pb.previous * 10) / 10,
      )} kg`,
    };
  }
  return {
    title: `${pb.exercise.name}: ${pb.reps}-rep best`,
    detail:
      `${fmtWeight(pb.exercise, pb.weight)} × ${pb.reps}` +
      (pb.previous !== undefined ? `, up from ${fmtWeight(pb.exercise, pb.previous)}` : ' — most reps yet'),
  };
}

export function SummaryScreen({ sessionId }: { sessionId: number }) {
  const summary = useLiveQuery(() => summariseSession(sessionId), [sessionId]);
  if (summary === undefined) return null;
  if (summary === null) {
    navigate('/');
    return null;
  }

  return (
    <main className="screen">
      <header className="screen-header summary-header">
        <div>
          <p className="muted small">{fmtDate(summary.session.startedAt)}</p>
          <h1>{summary.programmeName} done</h1>
        </div>
      </header>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">{fmtDuration(summary.durationMs)}</span>
          <span className="stat-label">Duration</span>
        </div>
        <div className="stat">
          <span className="stat-value">{summary.setCount}</span>
          <span className="stat-label">Sets</span>
        </div>
        <div className="stat">
          <span className="stat-value">{Math.round(summary.volume).toLocaleString('en-GB')}</span>
          <span className="stat-label">Volume (kg)</span>
        </div>
      </div>

      <h2 className="section-title">Personal bests</h2>
      {summary.personalBests.length === 0 ? (
        <p className="muted">No new personal bests this time.</p>
      ) : (
        <ul className="pb-list">
          {summary.personalBests.map((pb, i) => {
            const d = describePb(pb);
            return (
              <li key={i} className="pb">
                <span className="pb-star" aria-hidden="true">★</span>
                <span>
                  <strong>{d.title}</strong>
                  <br />
                  <span className="muted">{d.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="section-title">Exercises</h2>
      <ul className="summary-list">
        {summary.exercises.map(({ exercise, sets }) => (
          <li key={exercise.id}>
            <strong>{exercise.name}</strong>
            <br />
            <span className="muted">{fmtSets(exercise, sets)}</span>
          </li>
        ))}
      </ul>

      <button type="button" className="btn btn-primary btn-block btn-log" onClick={() => navigate('/')}>
        Done
      </button>
    </main>
  );
}
