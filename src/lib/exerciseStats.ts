/**
 * Per-exercise history and statistics for the History screens and charts.
 */
import Dexie from 'dexie';
import { db } from '../db/db';
import type { SetEntry } from '../db/types';
import { e1rm, volume } from './records';

export interface ExerciseSessionStat {
  sessionId: number;
  /** Session start time (epoch ms). */
  date: number;
  sets: SetEntry[];
  /** Heaviest set weight in the session. */
  heaviest: number;
  /** Best estimated 1RM (Epley) in the session. */
  e1rm: number;
  /** Σ reps × weight. */
  volume: number;
  /** Most reps in a single set. */
  maxReps: number;
}

/** Every session in which this exercise was done, oldest first. */
export async function getExerciseHistory(exerciseId: string): Promise<ExerciseSessionStat[]> {
  const sets = await db.sets
    .where('[exerciseId+timestamp]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .toArray();

  const bySession = new Map<number, SetEntry[]>();
  for (const s of sets) {
    if (!bySession.has(s.sessionId)) bySession.set(s.sessionId, []);
    bySession.get(s.sessionId)!.push(s);
  }

  const sessions = await db.sessions.bulkGet([...bySession.keys()]);
  const stats: ExerciseSessionStat[] = [];
  for (const session of sessions) {
    if (!session?.id) continue;
    const exSets = bySession.get(session.id)!;
    stats.push({
      sessionId: session.id,
      date: session.startedAt,
      sets: exSets,
      heaviest: Math.max(...exSets.map((s) => s.weight)),
      e1rm: Math.max(...exSets.map((s) => e1rm(s.weight, s.reps))),
      volume: volume(exSets),
      maxReps: Math.max(...exSets.map((s) => s.reps)),
    });
  }
  return stats.sort((a, b) => a.date - b.date);
}

export interface RepBest {
  reps: number;
  weight: number;
  date: number;
}

/**
 * All-time rep bests: for each rep count, the heaviest weight lifted for at
 * least that many reps. Only "frontier" sets are returned — sets that no other
 * set beats on both weight and reps — sorted by reps.
 */
export function repBests(history: ExerciseSessionStat[]): RepBest[] {
  const all = history.flatMap((h) => h.sets.map((s) => ({ reps: s.reps, weight: s.weight, date: h.date })));
  const front: RepBest[] = [];
  for (const s of all) {
    const beaten = all.some(
      (o) => o.weight >= s.weight && o.reps >= s.reps && (o.weight > s.weight || o.reps > s.reps),
    );
    // Keep the earliest date for ties (when the best was first achieved).
    const dup = front.find((f) => f.reps === s.reps && f.weight === s.weight);
    if (beaten) continue;
    if (dup) dup.date = Math.min(dup.date, s.date);
    else front.push({ ...s });
  }
  return front.sort((a, b) => a.reps - b.reps);
}
