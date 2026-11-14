/**
 * History tab: a list of past sessions (newest first), or a list of exercises
 * leading to each exercise's progress page.
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { listSessions } from '../db/queries';
import { fmtDate, fmtDaysAgo, fmtDuration } from '../lib/format';
import { navigate } from '../lib/router';
import { Segmented } from '../components/Segmented';

type View = 'sessions' | 'exercises';

/** Remember the chosen view while the app is open. */
let lastView: View = 'sessions';

export function HistoryScreen() {
  const [view, setViewState] = useState<View>(lastView);
  const setView = (v: View) => {
    lastView = v;
    setViewState(v);
  };

  return (
    <main className="screen">
      <header className="screen-header">
        <h1>History</h1>
      </header>
      <Segmented
        label="History view"
        value={view}
        onChange={setView}
        options={[
          { value: 'sessions', label: 'Sessions' },
          { value: 'exercises', label: 'Exercises' },
        ]}
      />
      {view === 'sessions' ? <SessionList /> : <ExerciseList />}
    </main>
  );
}

function SessionList() {
  const items = useLiveQuery(listSessions, []);
  if (!items) return null;
  if (items.length === 0) return <p className="muted empty">No workouts yet. Finished workouts appear here.</p>;

  return (
    <ul className="history-list">
      {items.map(({ session, programmeName, setCount, durationMs }) => (
        <li key={session.id}>
          <button type="button" className="history-row" onClick={() => navigate(`/history/session/${session.id}`)}>
            <span className="history-main">
              <strong>{programmeName}</strong>
              <span className="muted small">
                {fmtDate(session.startedAt)} · {fmtDaysAgo(session.startedAt)}
              </span>
            </span>
            <span className="history-side">
              {session.finishedAt === undefined ? (
                <span className="pill">In progress</span>
              ) : (
                <span>{fmtDuration(durationMs)}</span>
              )}
              <span className="muted small">
                {setCount} {setCount === 1 ? 'set' : 'sets'}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ExerciseList() {
  const data = useLiveQuery(async () => {
    const programmes = (await db.programmes.toArray()).sort((a, b) => a.order - b.order);
    const exercises = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
    // Exercise IDs in programme order, each listed once.
    const order: string[] = [];
    for (const p of programmes) for (const slot of p.slots) for (const id of slot.exerciseIds) if (!order.includes(id)) order.push(id);
    // Last time each exercise was done.
    const last = new Map<string, number>();
    await db.sets.each((s) => last.set(s.exerciseId, Math.max(last.get(s.exerciseId) ?? 0, s.timestamp)));
    return order.map((id) => ({ exercise: exercises.get(id)!, last: last.get(id) })).filter((x) => x.exercise);
  }, []);
  if (!data) return null;

  return (
    <ul className="history-list">
      {data.map(({ exercise, last }) => (
        <li key={exercise.id}>
          <button type="button" className="history-row" onClick={() => navigate(`/exercise/${exercise.id}`)}>
            <span className="history-main">
              <strong>{exercise.name}</strong>
              <span className="muted small">{last ? `Last done ${fmtDaysAgo(last).toLowerCase()}` : 'Not done yet'}</span>
            </span>
            <span className="muted" aria-hidden="true">
              ›
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
