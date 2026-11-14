/**
 * Personal bests, estimated 1RM and session summaries.
 *
 * A personal best is judged only against sets logged BEFORE the session in
 * question, so viewing or editing an old session gives sensible results.
 */
import Dexie from 'dexie';
import { db } from '../db/db';
import type { Exercise, Session, SetEntry } from '../db/types';

/** Estimated one-rep max, Epley formula: weight × (1 + reps / 30). */
export function e1rm(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

/** Session volume as specified: Σ reps × weight (weight exactly as logged). */
export function volume(sets: SetEntry[]): number {
  return sets.reduce((sum, s) => sum + s.reps * s.weight, 0);
}

export type PersonalBest =
  | { kind: 'reps'; exercise: Exercise; weight: number; reps: number; previous?: number }
  | { kind: 'e1rm'; exercise: Exercise; value: number; previous: number; weight: number; reps: number };

/**
 * Personal bests in `today` compared with `prior` sets of the same exercise.
 *
 * - Rep PB: the heaviest weight ever lifted for at least that many reps.
 *   (Lifting 100 kg × 8 also beats any previous 100 kg × 5.) Only the
 *   strongest sets of the day are reported, so 60 × 6 isn't listed alongside 60 × 5.
 * - e1RM PB: the best estimated 1RM. Skipped for added-weight exercises
 *   (chin-ups), where it would ignore bodyweight.
 *
 * No PBs are reported the first time an exercise is done — there's nothing to beat.
 */
export function findPersonalBests(ex: Exercise, today: SetEntry[], prior: SetEntry[]): PersonalBest[] {
  if (today.length === 0 || prior.length === 0) return [];
  const result: PersonalBest[] = [];

  // Today's "frontier": sets not beaten on both weight and reps by another set today.
  const seen = new Set<string>();
  const frontier = today.filter((s) => {
    const key = `${s.weight}x${s.reps}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return !today.some(
      (o) => o.weight >= s.weight && o.reps >= s.reps && (o.weight > s.weight || o.reps > s.reps),
    );
  });

  for (const s of frontier) {
    const previous = Math.max(-Infinity, ...prior.filter((p) => p.reps >= s.reps).map((p) => p.weight));
    if (s.weight > previous) {
      result.push({
        kind: 'reps',
        exercise: ex,
        weight: s.weight,
        reps: s.reps,
        previous: Number.isFinite(previous) ? previous : undefined,
      });
    }
  }

  if (ex.loadType !== 'added') {
    const best = today.reduce((a, b) => (e1rm(b.weight, b.reps) > e1rm(a.weight, a.reps) ? b : a));
    const value = e1rm(best.weight, best.reps);
    const previous = Math.max(...prior.map((p) => e1rm(p.weight, p.reps)));
    if (value > previous + 0.01) {
      result.push({ kind: 'e1rm', exercise: ex, value, previous, weight: best.weight, reps: best.reps });
    }
  }
  return result;
}

/** All sets of an exercise logged before `before` (epoch ms), excluding one session. */
export async function priorSets(exerciseId: string, before: number, excludeSessionId: number): Promise<SetEntry[]> {
  return db.sets
    .where('[exerciseId+timestamp]')
    .between([exerciseId, Dexie.minKey], [exerciseId, before], true, false)
    .filter((s) => s.sessionId !== excludeSessionId)
    .toArray();
}

export interface SessionSummary {
  session: Session;
  programmeName: string;
  durationMs: number;
  setCount: number;
  volume: number;
  /** Exercises done, in the order first logged, with their sets. */
  exercises: { exercise: Exercise; sets: SetEntry[] }[];
  personalBests: PersonalBest[];
}

export async function summariseSession(sessionId: number): Promise<SessionSummary | null> {
  const session = await db.sessions.get(sessionId);
  if (!session) return null;
  const programme = await db.programmes.get(session.programmeId);
  const sets = await db.sets.where('sessionId').equals(sessionId).sortBy('timestamp');
  const exerciseMap = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));

  const grouped = new Map<string, SetEntry[]>();
  for (const s of sets) {
    if (!grouped.has(s.exerciseId)) grouped.set(s.exerciseId, []);
    grouped.get(s.exerciseId)!.push(s);
  }

  const exercises: SessionSummary['exercises'] = [];
  const personalBests: PersonalBest[] = [];
  for (const [exerciseId, exSets] of grouped) {
    const exercise = exerciseMap.get(exerciseId);
    if (!exercise) continue;
    exercises.push({ exercise, sets: exSets });
    const prior = await priorSets(exerciseId, Math.min(session.startedAt, exSets[0].timestamp), sessionId);
    personalBests.push(...findPersonalBests(exercise, exSets, prior));
  }

  const end = session.finishedAt ?? sets[sets.length - 1]?.timestamp ?? session.startedAt;
  return {
    session,
    programmeName: programme?.name ?? session.programmeId,
    durationMs: end - session.startedAt,
    setCount: sets.length,
    volume: volume(sets),
    exercises,
    personalBests,
  };
}
