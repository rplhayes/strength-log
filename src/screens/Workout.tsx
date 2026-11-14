/**
 * The workout screen: the programme's exercises in order, one expanded at a time.
 */
import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { finishSession, getSessionSets, swapSlotExercise } from '../db/queries';
import type { Exercise } from '../db/types';
import { fmtDuration } from '../lib/format';
import { navigate } from '../lib/router';
import { ExerciseCard } from '../components/ExerciseCard';
import { Sheet } from '../components/Sheet';
import { RestTimerBar } from '../components/RestTimerBar';
import { useRestTimer } from '../lib/useRestTimer';
import { useWakeLock } from '../lib/useWakeLock';

export function WorkoutScreen({ sessionId }: { sessionId: number }) {
  const data = useLiveQuery(async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) return { session: null } as const;
    const programme = await db.programmes.get(session.programmeId);
    const exercises = new Map<string, Exercise>((await db.exercises.toArray()).map((e) => [e.id, e]));
    const sets = await getSessionSets(sessionId);
    return { session, programme, exercises, sets } as const;
  }, [sessionId]);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const initialised = useRef(false);
  const rest = useRestTimer(sessionId);

  // Keep the screen on while this workout is in progress.
  const inProgress = !!data?.session && data.session.finishedAt === undefined;
  useWakeLock(inProgress);

  // On first load, open the first exercise that still has sets to do.
  useEffect(() => {
    if (initialised.current || !data?.session || !data.programme) return;
    initialised.current = true;
    const { programme, session, exercises, sets } = data;
    const firstOpen = programme.slots.find((slot) => {
      const ex = exercises.get(session.slotChoices[slot.id]);
      return ex && sets.filter((s) => s.exerciseId === ex.id).length < ex.sets;
    });
    setExpanded(firstOpen?.id ?? null);
  }, [data]);

  if (!data) return null;
  if (!data.session || !data.programme) {
    return (
      <main className="screen">
        <p>This workout no longer exists.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          Back to home
        </button>
      </main>
    );
  }

  const { session, programme, exercises, sets } = data;
  const finished = session.finishedAt !== undefined;

  const onFinish = async () => {
    rest.skip();
    const kept = await finishSession(sessionId);
    navigate(kept ? `/summary/${sessionId}` : '/');
  };

  return (
    <main className="screen screen-workout">
      <header className="screen-header workout-header">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate('/')}>
          ‹ Home
        </button>
        <h1>{programme.name}</h1>
        <span className="muted small">{sets.length} {sets.length === 1 ? 'set' : 'sets'}</span>
      </header>

      {finished && <p className="banner">This workout is finished. Editing past workouts comes with History.</p>}

      <div className="exercise-list">
        {programme.slots.map((slot) => {
          const exId = session.slotChoices[slot.id] ?? slot.exerciseIds[0];
          const ex = exercises.get(exId);
          if (!ex) return null;
          const options = slot.exerciseIds.map((id) => exercises.get(id)).filter((e): e is Exercise => !!e);
          return (
            <ExerciseCard
              key={slot.id}
              slot={slot}
              exercise={ex}
              options={options}
              sessionId={sessionId}
              sets={sets.filter((s) => s.exerciseId === ex.id)}
              expanded={expanded === slot.id}
              onToggle={() => setExpanded(expanded === slot.id ? null : slot.id)}
              onSwap={(id) => swapSlotExercise(sessionId, slot.id, id)}
              onLogged={(e) => rest.start(e.restSec, e.name)}
            />
          );
        })}
      </div>

      {!finished && (
        <button type="button" className="btn btn-finish btn-block" onClick={() => setConfirmFinish(true)}>
          Finish workout
        </button>
      )}

      {rest.timer && !finished && (
        <RestTimerBar
          timer={rest.timer}
          remainingMs={rest.remainingMs}
          done={rest.done}
          onAdjust={rest.adjust}
          onSkip={rest.skip}
        />
      )}

      {confirmFinish && (
        <Sheet
          title="Finish workout?"
          onClose={() => setConfirmFinish(false)}
          actions={[{ label: 'Finish workout', kind: 'primary', onClick: onFinish }]}
        >
          <p>
            {sets.length === 0
              ? 'No sets logged, so this workout won’t be saved.'
              : `${sets.length} sets logged in ${fmtDuration(Date.now() - session.startedAt)}.`}
          </p>
        </Sheet>
      )}
    </main>
  );
}
