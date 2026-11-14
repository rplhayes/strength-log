/**
 * Double progression: once every target set reaches the TOP of the rep range
 * at the same weight, suggest adding the exercise's increment next time.
 * This is only ever a suggestion — nothing changes unless the user accepts it.
 */
import type { Exercise, SetEntry } from '../db/types';
import { roundKg } from './format';

export interface Suggestion {
  /** Weight last time (kg; added kg for chin-ups, per dumbbell for dumbbells). */
  from: number;
  /** Suggested weight for today. */
  to: number;
}

/** `lastSets` are the sets from the most recent session of this exercise, oldest first. */
export function progressionSuggestion(ex: Exercise, lastSets: SetEntry[]): Suggestion | null {
  if (lastSets.length < ex.sets) return null;
  // Judge only the target (working) sets; extra sets don't count either way.
  const target = lastSets.slice(0, ex.sets);
  const weight = target[0].weight;
  const allTop = target.every((s) => s.reps >= ex.repMax && s.weight === weight);
  if (!allTop) return null;
  return { from: weight, to: roundKg(weight + ex.increment) };
}
