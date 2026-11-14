/**
 * One exercise on the workout screen. Collapsed: name, target and progress.
 * Expanded: "last time", set rows with steppers, and the Log set button.
 *
 * Every log, edit and delete is written to IndexedDB immediately.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Exercise, SetEntry, Slot } from '../db/types';
import { deleteSet, getLastTime, logSet, updateSet, type LastTime } from '../db/queries';
import { fmtDaysAgo, fmtKg, fmtSets, fmtTarget, fmtWeight, weightLabel } from '../lib/format';
import { progressionSuggestion } from '../lib/progression';
import { unlockAudio } from '../lib/sound';
import { Stepper } from './Stepper';
import { Sheet } from './Sheet';

interface Props {
  slot: Slot;
  exercise: Exercise;
  /** All exercises available in this slot (length > 1 means it can be swapped). */
  options: Exercise[];
  sessionId: number;
  /** Sets logged for this exercise in this session, oldest first. */
  sets: SetEntry[];
  expanded: boolean;
  onToggle: () => void;
  onSwap: (exerciseId: string) => void;
  /** Called after a set is logged (starts the rest timer). */
  onLogged: (exercise: Exercise) => void;
}

interface Draft {
  reps: number;
  weight: number;
}

/**
 * Pre-fill for set number `index` (0-based):
 * - reps: the matching set from last time, else today's previous set, else the bottom of the range;
 * - weight: today's previous set (so a weight change carries forward), else the
 *   matching set from last time, else 0.
 */
function prefillFor(
  ex: Exercise,
  index: number,
  today: SetEntry[],
  last: LastTime | null,
  acceptedWeight: number | null,
): Draft {
  const lastSets = last?.sets ?? [];
  const matching = lastSets[index] ?? lastSets[lastSets.length - 1];
  const prevToday = today[today.length - 1];
  return {
    reps: lastSets[index]?.reps ?? prevToday?.reps ?? matching?.reps ?? ex.repMin,
    // An accepted progression suggestion sets the weight for the first set.
    weight: prevToday?.weight ?? acceptedWeight ?? matching?.weight ?? 0,
  };
}

export function ExerciseCard({
  slot,
  exercise: ex,
  options,
  sessionId,
  sets,
  expanded,
  onToggle,
  onSwap,
  onLogged,
}: Props) {
  // Most recent previous session of THIS exercise (alternatives have separate history).
  const last = useLiveQuery(() => getLastTime(ex.id, sessionId), [ex.id, sessionId]);
  const lastTime = last ?? null;

  // Double-progression suggestion, based on the last session of this exercise.
  const suggestion = useMemo(() => (lastTime ? progressionSuggestion(ex, lastTime.sets) : null), [ex, lastTime]);
  const [acceptedWeight, setAcceptedWeight] = useState<number | null>(null);

  const nextIndex = sets.length;
  const prefill = useMemo(
    () => prefillFor(ex, nextIndex, sets, lastTime, acceptedWeight),
    [ex, nextIndex, sets, lastTime, acceptedWeight],
  );

  const [draft, setDraft] = useState<Draft>(prefill);
  // Reset the draft only when the pre-fill values actually change.
  useEffect(() => setDraft(prefill), [prefill.reps, prefill.weight, nextIndex, ex.id]);

  const [extraOpen, setExtraOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: number; draft: Draft } | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const done = sets.length >= ex.sets;
  const showEditor = nextIndex < ex.sets || extraOpen;
  const rowCount = Math.max(ex.sets, sets.length + (extraOpen ? 1 : 0));
  const canSwap = options.length > 1;

  const onLog = async () => {
    if (busy) return;
    // Must run inside the tap so iOS allows the rest-timer tone later.
    unlockAudio();
    setBusy(true);
    try {
      await logSet(sessionId, ex.id, draft.reps, draft.weight);
      setExtraOpen(false);
      onLogged(ex);
    } finally {
      setBusy(false);
    }
  };

  const steppers = (d: Draft, set: (d: Draft) => void) => (
    <div className="stepper-pair">
      <Stepper
        label={weightLabel(ex)}
        value={d.weight}
        step={ex.increment}
        decimal
        onChange={(weight) => set({ ...d, weight })}
      />
      <Stepper label="reps" value={d.reps} step={1} onChange={(reps) => set({ ...d, reps })} />
    </div>
  );

  return (
    <section className={`exercise ${expanded ? 'exercise-open' : ''} ${done ? 'exercise-done' : ''}`}>
      <button type="button" className="exercise-header" onClick={onToggle} aria-expanded={expanded}>
        <span className="exercise-title">
          <span className="exercise-name">{ex.name}</span>
          <span className="muted">{fmtTarget(ex)}</span>
        </span>
        <span className={`exercise-progress ${done ? 'is-done' : ''}`}>
          {done ? '✓ ' : ''}
          {sets.length}/{ex.sets}
        </span>
      </button>

      {expanded && (
        <div className="exercise-body">
          {canSwap && (
            <button type="button" className="btn btn-plain btn-small swap-btn" onClick={() => setSwapOpen(true)}>
              ⇄ Swap exercise
            </button>
          )}

          <div className="last-time">
            <span className="last-time-label">Last time</span>
            {lastTime && lastTime.sets.length > 0 ? (
              <>
                <span className="last-time-sets">{fmtSets(ex, lastTime.sets)}</span>
                <span className="muted small">{fmtDaysAgo(lastTime.date)}</span>
              </>
            ) : (
              <span className="muted">First time — pick a comfortable starting weight</span>
            )}
          </div>

          {suggestion && sets.length === 0 && (
            <div className={`suggestion ${acceptedWeight !== null ? 'suggestion-accepted' : ''}`}>
              <span>
                <strong>Hit the top of the range last time.</strong> Try {suggestionText(ex, suggestion.to)}
              </span>
              {acceptedWeight === null ? (
                <button type="button" className="btn btn-small btn-primary" onClick={() => setAcceptedWeight(suggestion.to)}>
                  Use it
                </button>
              ) : (
                <button type="button" className="btn btn-small btn-plain" onClick={() => setAcceptedWeight(null)}>
                  Undo
                </button>
              )}
            </div>
          )}

          <ol className="set-list">
            {Array.from({ length: rowCount }, (_, i) => {
              const logged = sets[i];
              const isExtra = i >= ex.sets;
              const label = `Set ${i + 1}${isExtra ? ' (extra)' : ''}`;

              // A logged set being edited.
              if (logged && editing && editing.id === logged.id) {
                return (
                  <li key={logged.id} className="set-row set-editing">
                    <div className="set-row-head">
                      <span className="set-label">{label}</span>
                    </div>
                    {steppers(editing.draft, (d) => setEditing({ id: logged.id!, draft: d }))}
                    <div className="set-edit-actions">
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={async () => {
                          if (window.confirm(`Delete ${label.toLowerCase()}?`)) {
                            await deleteSet(logged.id!);
                            setEditing(null);
                          }
                        }}
                      >
                        Delete
                      </button>
                      <button type="button" className="btn btn-plain" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={async () => {
                          await updateSet(logged.id!, editing.draft.reps, editing.draft.weight);
                          setEditing(null);
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </li>
                );
              }

              // A logged set (tap to edit).
              if (logged) {
                return (
                  <li key={logged.id}>
                    <button
                      type="button"
                      className="set-row set-logged"
                      onClick={() =>
                        setEditing({ id: logged.id!, draft: { reps: logged.reps, weight: logged.weight } })
                      }
                    >
                      <span className="set-label">{label}</span>
                      <span className="set-value">
                        {fmtWeight(ex, logged.weight)} × {logged.reps}
                      </span>
                      <span className="tick" aria-label="logged">✓</span>
                    </button>
                  </li>
                );
              }

              // The next set to log: steppers + big Log button.
              if (i === nextIndex && showEditor) {
                return (
                  <li key="active" className="set-row set-active">
                    <div className="set-row-head">
                      <span className="set-label">{label}</span>
                    </div>
                    {steppers(draft, setDraft)}
                    <button type="button" className="btn btn-primary btn-block btn-log" disabled={busy} onClick={onLog}>
                      Log set · {fmtWeight(ex, draft.weight)} × {draft.reps}
                    </button>
                  </li>
                );
              }

              // A future set, greyed out: today's working weight with last time's reps.
              const hintReps = lastTime?.sets[i]?.reps;
              return (
                <li key={`pending-${i}`} className="set-row set-pending">
                  <span className="set-label">{label}</span>
                  <span className="set-value muted">
                    {hintReps !== undefined ? `${fmtWeight(ex, draft.weight)} × ${hintReps}` : '—'}
                  </span>
                </li>
              );
            })}
          </ol>

          {done && !extraOpen && (
            <button type="button" className="btn btn-plain btn-block" onClick={() => setExtraOpen(true)}>
              + Add extra set
            </button>
          )}
        </div>
      )}

      {swapOpen && (
        <Sheet
          title="Swap exercise for today"
          onClose={() => setSwapOpen(false)}
          actions={options
            .filter((o) => o.id !== ex.id)
            .map((o) => ({
              label: `Do ${o.name} today`,
              kind: 'primary' as const,
              onClick: () => {
                setSwapOpen(false);
                onSwap(o.id);
              },
            }))}
        >
          <p>
            Each exercise keeps its own history. Next {slot.exerciseIds.length > 2 ? 'time' : 'session'}, the app will
            suggest whichever one you didn’t do today.
          </p>
          {sets.length > 0 && <p>The {sets.length} sets of {ex.name} you’ve logged today are kept.</p>}
        </Sheet>
      )}
    </section>
  );
}

/** "42.5 kg", "18 kg per dumbbell", "+2.5 kg added" */
function suggestionText(ex: Exercise, weight: number): string {
  if (ex.loadType === 'added') return `+${fmtKg(weight)} kg added`;
  if (ex.loadType === 'perDumbbell') return `${fmtKg(weight)} kg per dumbbell`;
  return `${fmtKg(weight)} kg`;
}
