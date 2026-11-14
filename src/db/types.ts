/**
 * Core data types for Strength Log.
 *
 * Exercise and programme *definitions* live in src/data/programmes.ts and are
 * copied into IndexedDB on first launch. Sessions and sets are the user's
 * training log and only ever live in IndexedDB on the phone.
 */

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';

/**
 * How the weight field is interpreted for an exercise.
 * - total:       the full load on the bar / machine stack
 * - perDumbbell: the weight of ONE dumbbell
 * - added:       extra weight on a belt or vest (bodyweight exercises)
 */
export type LoadType = 'total' | 'perDumbbell' | 'added';

/** Muscle IDs. Labels and muscle-map regions are keyed off these. */
export type Muscle =
  | 'lats'
  | 'biceps'
  | 'bicepsLong'
  | 'brachialis'
  | 'forearms'
  | 'rearDelts'
  | 'frontDelts'
  | 'sideDelts'
  | 'traps'
  | 'midBack'
  | 'lowerBack'
  | 'chest'
  | 'upperChest'
  | 'triceps'
  | 'tricepsLong'
  | 'glutes'
  | 'hamstrings'
  | 'quads'
  | 'adductors'
  | 'calves';

export interface Exercise {
  /** Stable ID. Never change this once data has been logged against it. */
  id: string;
  name: string;
  equipment: Equipment;
  loadType: LoadType;
  /** Target number of working sets. */
  sets: number;
  /** Rep range, inclusive. */
  repMin: number;
  repMax: number;
  /** Rest between sets, in seconds. */
  restSec: number;
  /** Weight step in kg, used by the +/- stepper and progression suggestions. */
  increment: number;
  primary: Muscle[];
  secondary: Muscle[];
  /** Three short coaching cues. */
  cues: string[];
  /** Key into the animation library (stage 4). */
  animationId: string;
}

/**
 * A position in a programme. Most slots hold a single exercise; a slot with
 * several exercises is an "alternating slot" — the app suggests whichever
 * one was not done most recently, and the user can swap.
 */
export interface Slot {
  id: string;
  exerciseIds: string[];
}

export interface Programme {
  id: string;
  name: string;
  /** Display order on the home screen. */
  order: number;
  slots: Slot[];
}

export interface Session {
  id?: number;
  programmeId: string;
  /** Epoch milliseconds. */
  startedAt: number;
  /** Epoch milliseconds; undefined while the workout is still in progress. */
  finishedAt?: number;
  /** Which exercise was chosen for each slot today (slotId → exerciseId). */
  slotChoices: Record<string, string>;
}

export interface SetEntry {
  id?: number;
  sessionId: number;
  exerciseId: string;
  reps: number;
  /** kg — see Exercise.loadType for what this means. */
  weight: number;
  /** When the set was logged (epoch ms). Sets are ordered by this. */
  timestamp: number;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}
