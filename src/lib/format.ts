/** Small display helpers. */
import type { Exercise, SetEntry } from '../db/types';

/** Round to 2 decimal places to avoid floating-point noise from steppers. */
export function roundKg(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "42.5", "40", "1.25" — no trailing zeros. */
export function fmtKg(n: number): string {
  return String(roundKg(n));
}

/** Label for the weight field, depending on how the exercise is loaded. */
export function weightLabel(ex: Exercise): string {
  switch (ex.loadType) {
    case 'perDumbbell':
      return 'kg per dumbbell';
    case 'added':
      return 'added kg';
    default:
      return 'kg';
  }
}

/** "3 × 8–12" */
export function fmtTarget(ex: Exercise): string {
  return `${ex.sets} × ${ex.repMin}–${ex.repMax}`;
}

/** How a single weight reads in a summary, e.g. "40 kg", "16 kg each", "BW +5 kg". */
export function fmtWeight(ex: Exercise, weight: number): string {
  if (ex.loadType === 'added') return weight > 0 ? `BW +${fmtKg(weight)} kg` : 'Bodyweight';
  if (ex.loadType === 'perDumbbell') return `${fmtKg(weight)} kg each`;
  return `${fmtKg(weight)} kg`;
}

/**
 * Summarise a list of sets: "40 kg × 12, 12, 11". Consecutive sets at the same
 * weight are grouped: "40 kg × 12, 12 · 42.5 kg × 10".
 */
export function fmtSets(ex: Exercise, sets: SetEntry[]): string {
  const groups: { weight: number; reps: number[] }[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.weight === s.weight) last.reps.push(s.reps);
    else groups.push({ weight: s.weight, reps: [s.reps] });
  }
  return groups.map((g) => `${fmtWeight(ex, g.weight)} × ${g.reps.join(', ')}`).join(' · ');
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days between a timestamp and now (local time). */
export function daysAgo(ts: number, now = Date.now()): number {
  const a = new Date(ts);
  const b = new Date(now);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((startB - startA) / DAY_MS);
}

export function fmtDaysAgo(ts: number): string {
  const d = daysAgo(ts);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

/** "Sat 14 Nov" */
export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** "1h 05m" or "42m" */
export function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
