/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  EXERCISE AND PROGRAMME DEFINITIONS — edit this file to change the defaults.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * These are copied into the phone's database on first launch. After that, the
 * user's own edits (made in Settings) take priority for exercises that already
 * exist. New exercises added here are picked up automatically on next launch.
 *
 * Programmes are re-applied from this file on every launch, so adding an
 * alternative to a slot is just a matter of adding an ID to `exerciseIds`.
 *
 * IMPORTANT: never change an exercise `id` once you have logged sets with it —
 * the history is linked by ID. Change the `name` instead.
 */

import type { Exercise, Muscle, Programme } from '../db/types';

export const MUSCLE_LABELS: Record<Muscle, string> = {
  lats: 'Lats',
  biceps: 'Biceps',
  bicepsLong: 'Biceps (long head)',
  brachialis: 'Brachialis',
  forearms: 'Forearms',
  rearDelts: 'Rear delts',
  frontDelts: 'Front delts',
  sideDelts: 'Side delts',
  traps: 'Traps',
  midBack: 'Mid back',
  lowerBack: 'Lower back',
  chest: 'Chest',
  upperChest: 'Upper chest',
  triceps: 'Triceps',
  tricepsLong: 'Triceps (long head)',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  quads: 'Quads',
  adductors: 'Adductors',
  calves: 'Calves',
};

export const EXERCISES: Exercise[] = [
  // ── Shared ────────────────────────────────────────────────────────────────
  {
    id: 'chin-up',
    name: 'Chin-ups',
    equipment: 'bodyweight',
    loadType: 'added',
    sets: 3, repMin: 5, repMax: 10, restSec: 120, increment: 2.5,
    primary: ['lats', 'biceps'],
    secondary: ['rearDelts', 'midBack', 'forearms'],
    cues: [
      'Start from a dead hang, palms facing you',
      'Drive your elbows down to your ribs',
      'Chin over the bar, lower under control',
    ],
    animationId: 'chin-up',
  },

  // ── Posterior day ─────────────────────────────────────────────────────────
  {
    id: 'romanian-deadlift',
    name: 'Romanian deadlift',
    equipment: 'barbell',
    loadType: 'total',
    sets: 3, repMin: 6, repMax: 10, restSec: 150, increment: 2.5,
    primary: ['hamstrings', 'glutes'],
    secondary: ['lowerBack', 'forearms'],
    cues: [
      'Soft knees, push hips back',
      'Bar stays close to the legs',
      'Stop when the hamstrings are fully stretched',
    ],
    animationId: 'romanian-deadlift',
  },
  {
    id: 'conventional-deadlift',
    name: 'Conventional deadlift',
    equipment: 'barbell',
    loadType: 'total',
    sets: 3, repMin: 5, repMax: 8, restSec: 180, increment: 2.5,
    primary: ['glutes', 'hamstrings', 'lowerBack'],
    secondary: ['quads', 'traps', 'forearms'],
    cues: [
      'Bar over mid-foot, shins close to the bar',
      'Chest up and brace before you pull',
      'Push the floor away, hips and shoulders rise together',
    ],
    animationId: 'conventional-deadlift',
  },
  {
    id: 'hip-thrust',
    name: 'Barbell hip thrust',
    equipment: 'barbell',
    loadType: 'total',
    sets: 3, repMin: 6, repMax: 10, restSec: 150, increment: 2.5,
    primary: ['glutes'],
    secondary: ['hamstrings'],
    cues: [
      'Upper back on the bench edge, feet flat',
      'Tuck chin and ribs, drive through your heels',
      'Squeeze glutes hard at the top, shins vertical',
    ],
    animationId: 'hip-thrust',
  },
  {
    id: 'seated-cable-row',
    name: 'Seated cable row',
    equipment: 'cable',
    loadType: 'total',
    sets: 3, repMin: 8, repMax: 12, restSec: 120, increment: 2.5,
    primary: ['midBack', 'lats'],
    secondary: ['rearDelts', 'biceps'],
    cues: [
      'Sit tall with only a slight lean',
      'Pull the handle to your lower ribs',
      'Squeeze shoulder blades, then let them stretch forward',
    ],
    animationId: 'seated-cable-row',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat pulldown',
    equipment: 'cable',
    loadType: 'total',
    sets: 3, repMin: 8, repMax: 12, restSec: 120, increment: 2.5,
    primary: ['lats'],
    secondary: ['biceps', 'rearDelts'],
    cues: [
      'Thighs locked under the pads',
      'Pull the bar to your upper chest, elbows down',
      'Control the bar all the way back up',
    ],
    animationId: 'lat-pulldown',
  },
  {
    id: 'calf-raise',
    name: 'Calf raise',
    equipment: 'machine',
    loadType: 'total',
    sets: 3, repMin: 10, repMax: 15, restSec: 75, increment: 2.5,
    primary: ['calves'],
    secondary: [],
    cues: [
      'Full stretch at the bottom',
      'Rise onto your big toes as high as possible',
      'Pause at the top, no bouncing',
    ],
    animationId: 'calf-raise',
  },

  // ── Anterior day ──────────────────────────────────────────────────────────
  {
    id: 'back-squat',
    name: 'Back squat',
    equipment: 'barbell',
    loadType: 'total',
    sets: 3, repMin: 6, repMax: 10, restSec: 180, increment: 2.5,
    primary: ['quads', 'glutes'],
    secondary: ['adductors', 'lowerBack'],
    cues: [
      'Bar on your upper back, brace hard',
      'Knees track over your toes',
      'Sit down between your hips to at least parallel',
    ],
    animationId: 'back-squat',
  },
  {
    id: 'leg-extension',
    name: 'Seated leg extension',
    equipment: 'machine',
    loadType: 'total',
    sets: 3, repMin: 10, repMax: 15, restSec: 75, increment: 2.5,
    primary: ['quads'],
    secondary: [],
    cues: [
      'Knees lined up with the machine pivot',
      'Straighten fully and squeeze your quads',
      'Lower slowly, don’t let the stack crash',
    ],
    animationId: 'leg-extension',
  },
  {
    id: 'incline-db-press',
    name: 'Incline dumbbell press',
    equipment: 'dumbbell',
    loadType: 'perDumbbell',
    sets: 3, repMin: 8, repMax: 12, restSec: 120, increment: 2,
    primary: ['upperChest'],
    secondary: ['frontDelts', 'triceps'],
    cues: [
      'Bench at 30–45°, shoulder blades pinned back',
      'Lower to the upper chest, elbows about 45°',
      'Press up and slightly in',
    ],
    animationId: 'incline-db-press',
  },
  {
    id: 'pec-deck',
    name: 'Machine fly (pec deck)',
    equipment: 'machine',
    loadType: 'total',
    sets: 3, repMin: 10, repMax: 15, restSec: 75, increment: 2.5,
    primary: ['chest'],
    secondary: ['frontDelts'],
    cues: [
      'Set the seat so handles are at chest height',
      'Keep a slight, fixed bend in the elbows',
      'Hug a big tree, squeeze your chest in the middle',
    ],
    animationId: 'pec-deck',
  },

  // ── Shoulders and arms day ────────────────────────────────────────────────
  {
    id: 'db-shoulder-press',
    name: 'Dumbbell shoulder press',
    equipment: 'dumbbell',
    loadType: 'perDumbbell',
    sets: 3, repMin: 8, repMax: 12, restSec: 120, increment: 2,
    primary: ['frontDelts', 'sideDelts'],
    secondary: ['triceps', 'upperChest'],
    cues: [
      'Brace your core, don’t arch your lower back',
      'Start with the dumbbells at ear height',
      'Press straight up, stop just short of lockout',
    ],
    animationId: 'db-shoulder-press',
  },
  {
    id: 'lateral-raise',
    name: 'Lateral raise',
    equipment: 'dumbbell',
    loadType: 'perDumbbell',
    sets: 3, repMin: 10, repMax: 15, restSec: 60, increment: 1,
    primary: ['sideDelts'],
    secondary: ['traps'],
    cues: [
      'Slight forward lean, soft elbows',
      'Lead with the elbows, raise out to the sides',
      'Stop at shoulder height, lower slowly',
    ],
    animationId: 'lateral-raise',
  },
  {
    id: 'incline-db-curl',
    name: 'Incline dumbbell curl',
    equipment: 'dumbbell',
    loadType: 'perDumbbell',
    sets: 3, repMin: 10, repMax: 15, restSec: 75, increment: 1,
    primary: ['bicepsLong'],
    secondary: ['forearms'],
    cues: [
      'Recline and let your arms hang long behind you',
      'Keep your elbows still as you curl',
      'Full stretch at the bottom of every rep',
    ],
    animationId: 'incline-db-curl',
  },
  {
    id: 'preacher-curl',
    name: 'Preacher curl machine',
    equipment: 'machine',
    loadType: 'total',
    sets: 3, repMin: 10, repMax: 15, restSec: 75, increment: 2.5,
    primary: ['biceps'],
    secondary: ['brachialis', 'forearms'],
    cues: [
      'Armpits snug against the pad',
      'Curl up without lifting your elbows',
      'Lower all the way to a full stretch',
    ],
    animationId: 'preacher-curl',
  },
  {
    id: 'skull-crusher',
    name: 'Skull crushers (EZ bar)',
    equipment: 'barbell',
    loadType: 'total',
    sets: 3, repMin: 10, repMax: 15, restSec: 75, increment: 2.5,
    primary: ['tricepsLong'],
    secondary: [],
    cues: [
      'Lie flat, bar starts over your shoulders',
      'Lower the bar behind your head, elbows point up',
      'Move only at the elbows, upper arms stay still',
    ],
    animationId: 'skull-crusher',
  },
  {
    id: 'tricep-pushdown',
    name: 'Cable tricep pushdown',
    equipment: 'cable',
    loadType: 'total',
    sets: 3, repMin: 10, repMax: 15, restSec: 60, increment: 2.5,
    primary: ['triceps'],
    secondary: [],
    cues: [
      'Elbows pinned to your sides',
      'Push down until your arms are straight',
      'Control the handle back up to 90°',
    ],
    animationId: 'tricep-pushdown',
  },
];

/**
 * Programmes. Each slot lists one or more exercise IDs; more than one makes it
 * an alternating slot (see src/db/queries.ts → defaultExerciseForSlot).
 */
export const PROGRAMMES: Programme[] = [
  {
    id: 'posterior',
    name: 'Posterior',
    order: 1,
    slots: [
      { id: 'post-1', exerciseIds: ['chin-up'] },
      { id: 'post-2', exerciseIds: ['romanian-deadlift', 'conventional-deadlift'] },
      { id: 'post-3', exerciseIds: ['hip-thrust'] },
      { id: 'post-4', exerciseIds: ['seated-cable-row'] },
      { id: 'post-5', exerciseIds: ['lat-pulldown'] },
      { id: 'post-6', exerciseIds: ['calf-raise'] },
    ],
  },
  {
    id: 'anterior',
    name: 'Anterior',
    order: 2,
    slots: [
      { id: 'ant-1', exerciseIds: ['chin-up'] },
      { id: 'ant-2', exerciseIds: ['back-squat'] },
      { id: 'ant-3', exerciseIds: ['leg-extension'] },
      { id: 'ant-4', exerciseIds: ['incline-db-press'] },
      { id: 'ant-5', exerciseIds: ['pec-deck'] },
    ],
  },
  {
    id: 'shoulders-arms',
    name: 'Shoulders & arms',
    order: 3,
    slots: [
      { id: 'sa-1', exerciseIds: ['chin-up'] },
      { id: 'sa-2', exerciseIds: ['db-shoulder-press'] },
      { id: 'sa-3', exerciseIds: ['lateral-raise'] },
      { id: 'sa-4', exerciseIds: ['incline-db-curl'] },
      { id: 'sa-5', exerciseIds: ['preacher-curl'] },
      { id: 'sa-6', exerciseIds: ['skull-crusher'] },
      { id: 'sa-7', exerciseIds: ['tricep-pushdown'] },
    ],
  },
];
