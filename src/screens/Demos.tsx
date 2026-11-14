/**
 * Hidden developer page (#demos): every exercise animation in a grid, for
 * reviewing them all at once. "Start / end" shows the two key poses instead.
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ANIMATIONS } from '../anim/library';
import { ExerciseAnimationView } from '../anim/Figure';
import { navigate } from '../lib/router';

export function DemosScreen() {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const [still, setStill] = useState(false);
  if (!exercises) return null;

  return (
    <main className="screen screen-wide">
      <header className="screen-header">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate('/')}>
          ‹ Home
        </button>
        <h1>All demos</h1>
      </header>
      <button type="button" className="btn btn-plain btn-small" onClick={() => setStill(!still)}>
        {still ? 'Show animations' : 'Show start / end poses'}
      </button>
      <div className="demo-grid">
        {exercises.map((ex) => {
          const anim = ANIMATIONS[ex.animationId];
          return (
            <section key={ex.id} className="demo-card">
              <h2>{ex.name}</h2>
              {anim ? (
                <ExerciseAnimationView
                  anim={anim}
                  highlight={{ primary: ex.primary, secondary: ex.secondary }}
                  name={ex.name}
                  forceStatic={still}
                />
              ) : (
                <p className="muted">No animation “{ex.animationId}”</p>
              )}
              <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate(`/exercise/${ex.id}/demo`)}>
                Open demo ›
              </button>
            </section>
          );
        })}
      </div>
    </main>
  );
}
