/**
 * Edit one exercise's name, target sets, rep range, rest time and weight step.
 * Changes are saved to the phone; "Reset" restores the values from
 * src/data/programmes.ts.
 */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Exercise } from '../db/types';
import { EXERCISES } from '../data/programmes';
import { goBack, navigate } from '../lib/router';
import { Stepper } from '../components/Stepper';

type Editable = Pick<Exercise, 'name' | 'sets' | 'repMin' | 'repMax' | 'restSec' | 'increment'>;

export function ExerciseEditorScreen({ exerciseId }: { exerciseId: string }) {
  const ex = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
  const [form, setForm] = useState<Editable | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ex && !form) setForm({ name: ex.name, sets: ex.sets, repMin: ex.repMin, repMax: ex.repMax, restSec: ex.restSec, increment: ex.increment });
  }, [ex, form]);

  if (ex === undefined || (ex && !form)) return null;
  if (!ex || !form) {
    return (
      <main className="screen">
        <p>Exercise not found.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/settings')}>
          Back to Settings
        </button>
      </main>
    );
  }

  const defaults = EXERCISES.find((e) => e.id === ex.id);
  const set = (patch: Partial<Editable>) => {
    setSaved(false);
    setForm((f) => {
      const next = { ...f!, ...patch };
      // Keep the rep range valid whichever end was changed.
      if (patch.repMin !== undefined && next.repMax < next.repMin) next.repMax = next.repMin;
      if (patch.repMax !== undefined && next.repMin > next.repMax) next.repMin = next.repMax;
      return next;
    });
  };
  const dirty =
    form.name.trim() !== ex.name ||
    form.sets !== ex.sets ||
    form.repMin !== ex.repMin ||
    form.repMax !== ex.repMax ||
    form.restSec !== ex.restSec ||
    form.increment !== ex.increment;

  const save = async () => {
    await db.exercises.update(ex.id, { ...form, name: form.name.trim() || ex.name });
    setSaved(true);
  };

  const reset = () => {
    if (!defaults) return;
    set({
      name: defaults.name,
      sets: defaults.sets,
      repMin: defaults.repMin,
      repMax: defaults.repMax,
      restSec: defaults.restSec,
      increment: defaults.increment,
    });
  };

  return (
    <main className="screen">
      <header className="screen-header">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => goBack('/settings')}>
          ‹ Settings
        </button>
      </header>
      <h1 className="detail-title">{ex.name}</h1>
      <p className="muted detail-sub">Changes apply from your next set. Past workouts aren’t affected.</p>

      <label className="field">
        <span className="field-label">Name</span>
        <input className="text-input" value={form.name} maxLength={50} onChange={(e) => set({ name: e.target.value })} />
      </label>

      <div className="editor-grid">
        <Stepper label="Target sets" value={form.sets} step={1} min={1} onChange={(sets) => set({ sets })} />
        <Stepper label="Rest (seconds)" value={form.restSec} step={15} min={0} onChange={(restSec) => set({ restSec })} />
        <Stepper label="Reps — bottom of range" value={form.repMin} step={1} min={1} onChange={(repMin) => set({ repMin })} />
        <Stepper label="Reps — top of range" value={form.repMax} step={1} min={1} onChange={(repMax) => set({ repMax })} />
        <Stepper
          label={ex.loadType === 'perDumbbell' ? 'Weight step (kg per dumbbell)' : 'Weight step (kg)'}
          value={form.increment}
          step={0.25}
          min={0.25}
          decimal
          onChange={(increment) => set({ increment })}
        />
      </div>

      <button type="button" className="btn btn-primary btn-block btn-log" disabled={!dirty} onClick={save}>
        {saved && !dirty ? 'Saved ✓' : 'Save changes'}
      </button>
      {defaults && (
        <button type="button" className="btn btn-ghost btn-block reset-btn" onClick={reset}>
          Reset to original values
        </button>
      )}
    </main>
  );
}
