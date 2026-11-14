/**
 * Exercise demo: looping animation, muscle map and three coaching cues.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ANIMATIONS } from '../anim/library';
import { ExerciseAnimationView, usePrefersReducedMotion } from '../anim/Figure';
import { MuscleMap } from '../anim/MuscleMap';
import { fmtTarget } from '../lib/format';
import { goBack, navigate } from '../lib/router';

export function DemoScreen({ exerciseId }: { exerciseId: string }) {
  const ex = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
  const reduced = usePrefersReducedMotion();
  if (ex === undefined) return null;
  if (!ex) {
    return (
      <main className="screen">
        <p>Exercise not found.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          Home
        </button>
      </main>
    );
  }
  const anim = ANIMATIONS[ex.animationId];
  const highlight = { primary: ex.primary, secondary: ex.secondary };

  return (
    <main className="screen">
      <header className="screen-header">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => goBack('/')}>
          ‹ Back
        </button>
      </header>
      <h1 className="detail-title">{ex.name}</h1>
      <p className="muted detail-sub">
        {fmtTarget(ex)} · rest {ex.restSec} s
      </p>

      <div className="demo-stage">
        {anim ? (
          <ExerciseAnimationView anim={anim} highlight={highlight} name={ex.name} />
        ) : (
          <p className="muted">No animation for this exercise yet.</p>
        )}
      </div>
      {reduced && <p className="muted small center">Reduce Motion is on, so the start and end positions are shown.</p>}

      <h2 className="section-title">Coaching cues</h2>
      <ol className="cues">
        {ex.cues.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ol>

      <h2 className="section-title">Muscles worked</h2>
      <MuscleMap highlight={highlight} />
    </main>
  );
}
