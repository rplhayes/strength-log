/** Inline editor for one set: weight and reps steppers with Save / Delete / Cancel. */
import { useState } from 'react';
import type { Exercise } from '../db/types';
import { weightLabel } from '../lib/format';
import { Stepper } from './Stepper';

interface Props {
  exercise: Exercise;
  title: string;
  initial: { reps: number; weight: number };
  onSave: (reps: number, weight: number) => void | Promise<void>;
  /** Omit for a new set that hasn't been saved yet. */
  onDelete?: () => void | Promise<void>;
  onCancel: () => void;
}

export function SetEditRow({ exercise, title, initial, onSave, onDelete, onCancel }: Props) {
  const [d, setD] = useState(initial);
  return (
    <div className="set-row set-editing">
      <div className="set-row-head">
        <span className="set-label">{title}</span>
      </div>
      <div className="stepper-pair">
        <Stepper
          label={weightLabel(exercise)}
          value={d.weight}
          step={exercise.increment}
          decimal
          onChange={(weight) => setD({ ...d, weight })}
        />
        <Stepper label="reps" value={d.reps} step={1} onChange={(reps) => setD({ ...d, reps })} />
      </div>
      <div className="set-edit-actions">
        {onDelete ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => window.confirm(`Delete ${title.toLowerCase()}?`) && onDelete()}
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="btn btn-plain" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={() => onSave(d.reps, d.weight)}>
          Save
        </button>
      </div>
    </div>
  );
}
