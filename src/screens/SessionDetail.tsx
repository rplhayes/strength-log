/**
 * One past session: every exercise and set, with editing, adding forgotten
 * sets, and deleting the whole session (with confirmation).
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { addSetToSession, deleteSession, deleteSet, getSessionSets, updateSet } from '../db/queries';
import type { Exercise, SetEntry } from '../db/types';
import { fmtDate, fmtDuration, fmtWeight } from '../lib/format';
import { volume } from '../lib/records';
import { goBack, navigate } from '../lib/router';
import { Sheet } from '../components/Sheet';
import { SetEditRow } from '../components/SetEditRow';

export function SessionDetailScreen({ sessionId }: { sessionId: number }) {
  const data = useLiveQuery(async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) return null;
    const programme = await db.programmes.get(session.programmeId);
    const sets = await getSessionSets(sessionId);
    const exercises = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
    // Group sets by exercise in programme slot order, then any others.
    const order: string[] = [];
    for (const slot of programme?.slots ?? []) {
      const chosen = slot.exerciseIds.filter((id) => sets.some((s) => s.exerciseId === id));
      order.push(...chosen);
    }
    for (const s of sets) if (!order.includes(s.exerciseId)) order.push(s.exerciseId);
    const groups = order
      .map((id) => ({ exercise: exercises.get(id), sets: sets.filter((s) => s.exerciseId === id) }))
      .filter((g): g is { exercise: Exercise; sets: SetEntry[] } => !!g.exercise);
    return { session, programmeName: programme?.name ?? session.programmeId, sets, groups };
  }, [sessionId]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (data === undefined) return null;
  if (data === null) {
    return (
      <main className="screen">
        <p>This workout no longer exists.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/history')}>
          Back to History
        </button>
      </main>
    );
  }

  const { session, programmeName, sets, groups } = data;
  const inProgress = session.finishedAt === undefined;
  const end = session.finishedAt ?? sets[sets.length - 1]?.timestamp ?? session.startedAt;

  return (
    <main className="screen">
      <header className="screen-header">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => goBack('/history')}>
          ‹ Back
        </button>
      </header>
      <p className="muted small detail-date">{fmtDate(session.startedAt)}</p>
      <h1 className="detail-title">{programmeName}</h1>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">{fmtDuration(end - session.startedAt)}</span>
          <span className="stat-label">Duration</span>
        </div>
        <div className="stat">
          <span className="stat-value">{sets.length}</span>
          <span className="stat-label">Sets</span>
        </div>
        <div className="stat">
          <span className="stat-value">{Math.round(volume(sets)).toLocaleString('en-GB')}</span>
          <span className="stat-label">Volume (kg)</span>
        </div>
      </div>

      {inProgress && (
        <button type="button" className="banner banner-resume" onClick={() => navigate(`/workout/${session.id}`)}>
          <span>
            <strong>This workout is still in progress</strong>
            <br />
            Open it to carry on logging
          </span>
          <span aria-hidden="true">›</span>
        </button>
      )}

      <p className="muted small">Tap a set to change or delete it.</p>

      {groups.map(({ exercise, sets: exSets }) => (
        <section key={exercise.id} className="detail-group">
          <button type="button" className="detail-group-title" onClick={() => navigate(`/exercise/${exercise.id}`)}>
            <span>{exercise.name}</span>
            <span className="muted small">Progress ›</span>
          </button>
          <ol className="set-list">
            {exSets.map((s, i) =>
              editingId === s.id ? (
                <li key={s.id}>
                  <SetEditRow
                    exercise={exercise}
                    title={`Set ${i + 1}`}
                    initial={{ reps: s.reps, weight: s.weight }}
                    onSave={async (reps, weight) => {
                      await updateSet(s.id!, reps, weight);
                      setEditingId(null);
                    }}
                    onDelete={async () => {
                      await deleteSet(s.id!);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li key={s.id}>
                  <button
                    type="button"
                    className="set-row set-logged"
                    onClick={() => {
                      setAddingTo(null);
                      setEditingId(s.id!);
                    }}
                  >
                    <span className="set-label">Set {i + 1}</span>
                    <span className="set-value">
                      {fmtWeight(exercise, s.weight)} × {s.reps}
                    </span>
                  </button>
                </li>
              ),
            )}
            {addingTo === exercise.id && (
              <li>
                <SetEditRow
                  exercise={exercise}
                  title={`Set ${exSets.length + 1} (new)`}
                  initial={{
                    reps: exSets[exSets.length - 1]?.reps ?? exercise.repMin,
                    weight: exSets[exSets.length - 1]?.weight ?? 0,
                  }}
                  onSave={async (reps, weight) => {
                    await addSetToSession(sessionId, exercise.id, reps, weight);
                    setAddingTo(null);
                  }}
                  onCancel={() => setAddingTo(null)}
                />
              </li>
            )}
          </ol>
          {addingTo !== exercise.id && !inProgress && (
            <button
              type="button"
              className="btn btn-plain btn-small add-set-btn"
              onClick={() => {
                setEditingId(null);
                setAddingTo(exercise.id);
              }}
            >
              + Add a set
            </button>
          )}
        </section>
      ))}

      {groups.length === 0 && <p className="muted">No sets in this workout.</p>}

      <button type="button" className="btn btn-danger btn-block delete-session" onClick={() => setConfirmDelete(true)}>
        Delete this workout
      </button>

      {confirmDelete && (
        <Sheet
          title="Delete this workout?"
          onClose={() => setConfirmDelete(false)}
          actions={[
            {
              label: 'Delete workout',
              kind: 'danger',
              onClick: async () => {
                await deleteSession(sessionId);
                navigate('/history');
              },
            },
          ]}
        >
          <p>
            {programmeName} on {fmtDate(session.startedAt)} and its {sets.length} {sets.length === 1 ? 'set' : 'sets'}{' '}
            will be removed permanently. This can’t be undone.
          </p>
        </Sheet>
      )}
    </main>
  );
}
