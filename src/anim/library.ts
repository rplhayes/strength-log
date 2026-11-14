/**
 * Animation library: one entry per exercise animationId.
 *
 * Each entry is a start pose and an end pose (joint angles — see
 * kinematics.ts for the conventions), an anchor point that stays fixed, the
 * camera view, and simple equipment. Equipment points can be fixed
 * coordinates or follow a joint, so bars and handles move with the hands.
 *
 * The SVG canvas is 200 × 200 units; the floor is at y = 186.
 */
import type { Anchor, FrontJointName, FrontPose, SideJointName, SidePose } from './kinematics';

/** A point: fixed coordinates, or a joint plus an offset. */
export type PointRef = { x: number; y: number } | { j: string; dx?: number; dy?: number };

export type Equip = { layer?: 'back' | 'front' } & (
  /** Barbell seen end-on: a weight plate with the bar in the middle. */
  | { kind: 'plate'; at: PointRef; r: number }
  /** Dumbbell seen end-on. */
  | { kind: 'dumbbellEnd'; at: PointRef; r?: number }
  /** Dumbbell seen lengthways (front view). */
  | { kind: 'dumbbellSide'; at: PointRef }
  /** Thin line: cable, lever, frame. */
  | { kind: 'line'; from: PointRef; to: PointRef; w?: number }
  /** Thick rounded bar: bench pad, seat, machine pad. */
  | { kind: 'beam'; from: PointRef; to: PointRef; w: number }
  /** Circle: pulley, roller pad, bar seen end-on. */
  | { kind: 'circle'; at: PointRef; r: number }
  /** Small handle centred on a point. */
  | { kind: 'handle'; at: PointRef; w: number; h: number }
  /** Static rounded rectangle: a step, a bench top. */
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  /** The floor line. */
  | { kind: 'floor' }
);

interface Base {
  /** Which end of the movement counts as the "top" (gets the longer pause). */
  topIs: 'start' | 'end';
  equipment: Equip[];
}

export interface SideAnimation extends Base {
  view: 'side';
  start: SidePose;
  end: SidePose;
  anchor: Anchor<SideJointName>;
  /** Optional different anchor position at the end pose (interpolated). */
  anchorEnd?: Anchor<SideJointName>;
}

export interface FrontAnimation extends Base {
  view: 'front';
  start: FrontPose;
  end: FrontPose;
  anchor: Anchor<'hipCentre'>;
}

export type ExerciseAnimation = SideAnimation | FrontAnimation;

export const FLOOR_Y = 186;
/** Ankle height when standing on the floor (half the foot's thickness above it). */
const ANKLE_Y = FLOOR_Y - 4;

const floor: Equip = { kind: 'floor' };

// Small helpers for readable equipment lists.
const at = (j: SideJointName | FrontJointName, dx = 0, dy = 0): PointRef => ({ j, dx, dy });
const pt = (x: number, y: number): PointRef => ({ x, y });

export const ANIMATIONS: Record<string, ExerciseAnimation> = {
  // ── Chin-ups: hang from the bar, pull until the chin clears it ───────────
  'chin-up': {
    view: 'side',
    topIs: 'end',
    anchor: { joint: 'hand', x: 112, y: 34 },
    start: { spine: 0, hip: 15, knee: 90, ankle: 25, shoulder: 178, elbow: 3 },
    end: { spine: -12, hip: 25, knee: 90, ankle: 25, shoulder: 6, elbow: 144, head: -12 },
    equipment: [
      { kind: 'line', from: pt(60, 4), to: pt(165, 4), w: 4, layer: 'back' },
      { kind: 'line', from: pt(112, 4), to: pt(112, 34), w: 3, layer: 'back' },
      { kind: 'circle', at: pt(112, 34), r: 4, layer: 'back' },
    ],
  },

  // ── Romanian deadlift: hinge at the hips, shins near vertical ─────────────
  'romanian-deadlift': {
    view: 'side',
    topIs: 'start',
    anchor: { joint: 'ankle', x: 92, y: ANKLE_Y },
    start: { spine: 0, hip: 0, knee: 5, ankle: 'flat', shoulder: 9, elbow: 0 },
    end: { spine: 68, hip: 100, knee: 29, ankle: 'flat', shoulder: 56, elbow: 0, head: -10 },
    equipment: [floor, { kind: 'plate', at: at('hand'), r: 20, layer: 'front' }],
  },

  // ── Conventional deadlift: from the floor, more knee bend, torso more upright
  'conventional-deadlift': {
    view: 'side',
    topIs: 'end',
    anchor: { joint: 'ankle', x: 92, y: ANKLE_Y },
    start: { spine: 58, hip: 130, knee: 87, ankle: 'flat', shoulder: 55, elbow: 0, head: -15 },
    end: { spine: -3, hip: -3, knee: 0, ankle: 'flat', shoulder: 7, elbow: 0 },
    equipment: [floor, { kind: 'plate', at: at('hand'), r: 20, layer: 'front' }],
  },

  // ── Hip thrust: upper back on the bench, hips drive up to a bridge ────────
  'hip-thrust': {
    view: 'side',
    topIs: 'end',
    anchor: { joint: 'ankle', x: 150, y: ANKLE_Y },
    start: {
      spine: -54, hip: 72, knee: 104, ankle: 'flat', shoulder: 0, elbow: 0, head: 25,
      reach: { joint: 'hip', dx: 5, dy: -16, bend: -1 },
    },
    end: {
      spine: -90, hip: 0, knee: 90, ankle: 'flat', shoulder: 0, elbow: 0, head: 30,
      reach: { joint: 'hip', dx: 0, dy: -17, bend: -1 },
    },
    equipment: [
      floor,
      { kind: 'beam', from: pt(22, 160), to: pt(70, 160), w: 12, layer: 'back' },
      { kind: 'line', from: pt(30, 166), to: pt(30, 186), w: 4, layer: 'back' },
      { kind: 'line', from: pt(62, 166), to: pt(62, 186), w: 4, layer: 'back' },
      { kind: 'plate', at: at('hand'), r: 19, layer: 'front' },
    ],
  },

  // ── Seated cable row: sit tall, pull the handle to the lower ribs ─────────
  'seated-cable-row': {
    view: 'side',
    topIs: 'end',
    anchor: { joint: 'hip', x: 62, y: 150 },
    start: { spine: 20, hip: 100, knee: 25, ankle: -25, shoulder: 102, elbow: 5, head: -15 },
    end: { spine: -5, hip: 75, knee: 25, ankle: -25, shoulder: -45, elbow: 115 },
    equipment: [
      floor,
      { kind: 'beam', from: pt(20, 162), to: pt(140, 162), w: 9, layer: 'back' },
      { kind: 'line', from: pt(40, 166), to: pt(40, 186), w: 4, layer: 'back' },
      { kind: 'beam', from: pt(146, 150), to: pt(146, 186), w: 5, layer: 'back' },
      { kind: 'circle', at: pt(178, 150), r: 6, layer: 'back' },
      { kind: 'line', from: pt(178, 150), to: at('hand'), w: 1.5, layer: 'back' },
      { kind: 'line', from: pt(178, 20), to: pt(178, 186), w: 5, layer: 'back' },
      { kind: 'handle', at: at('hand'), w: 4, h: 13, layer: 'front' },
    ],
  },

  // ── Lat pulldown: pull the bar to the upper chest, elbows down ────────────
  'lat-pulldown': {
    view: 'side',
    topIs: 'start',
    anchor: { joint: 'hip', x: 86, y: 140 },
    start: { spine: -5, hip: 80, knee: 85, ankle: 'flat', shoulder: 160, elbow: 10 },
    end: { spine: -18, hip: 67, knee: 85, ankle: 'flat', shoulder: 13, elbow: 150, head: -10 },
    equipment: [
      floor,
      { kind: 'beam', from: pt(70, 150), to: pt(112, 150), w: 9, layer: 'back' },
      { kind: 'line', from: pt(90, 154), to: pt(90, 186), w: 5, layer: 'back' },
      { kind: 'circle', at: at('knee', -2, -12), r: 6, layer: 'front' },
      { kind: 'line', from: pt(100, 0), to: at('hand'), w: 1.5, layer: 'back' },
      { kind: 'circle', at: at('hand'), r: 3.5, layer: 'front' },
    ],
  },

  // ── Calf raise: heels drop below the step, then rise onto the toes ────────
  'calf-raise': {
    view: 'side',
    topIs: 'end',
    anchor: { joint: 'ball', x: 104, y: 166 },
    start: { spine: 0, hip: 0, knee: 3, ankle: -20, shoulder: 8, elbow: 25 },
    end: { spine: 0, hip: 0, knee: 3, ankle: 30, shoulder: 8, elbow: 25 },
    equipment: [
      floor,
      { kind: 'rect', x: 101, y: 170, w: 50, h: 16, rx: 2, layer: 'back' },
      { kind: 'line', from: pt(40, 20), to: pt(40, 186), w: 6, layer: 'back' },
      { kind: 'line', from: pt(40, 30), to: at('shoulder', -9, -7), w: 4, layer: 'back' },
      { kind: 'circle', at: at('shoulder', -9, -7), r: 5.5, layer: 'back' },
    ],
  },

  // ── Back squat: bar on the upper back, sit down to parallel ───────────────
  'back-squat': {
    view: 'side',
    topIs: 'start',
    anchor: { joint: 'ankle', x: 92, y: ANKLE_Y },
    start: {
      spine: 8, hip: 8, knee: 3, ankle: 'flat', shoulder: 0, elbow: 0, head: -8, armScale: 0.55, forearmScale: 0.55,
      reach: { joint: 'upperBack', dx: 1, dy: 1, bend: 1 },
    },
    end: {
      spine: 45, hip: 130, knee: 120, ankle: 'flat', shoulder: 0, elbow: 0, head: -30, armScale: 0.55, forearmScale: 0.55,
      reach: { joint: 'upperBack', dx: 1, dy: 1, bend: 1 },
    },
    equipment: [floor, { kind: 'plate', at: at('upperBack'), r: 22, layer: 'front' }],
  },

  // ── Seated leg extension: straighten the knees against the pad ────────────
  'leg-extension': {
    view: 'side',
    topIs: 'end',
    anchor: { joint: 'hip', x: 78, y: 128 },
    start: { spine: -12, hip: 80, knee: 92, ankle: 0, shoulder: 8, elbow: 55 },
    end: { spine: -12, hip: 80, knee: 10, ankle: 0, shoulder: 8, elbow: 55 },
    equipment: [
      floor,
      { kind: 'beam', from: pt(56, 138), to: pt(116, 138), w: 10, layer: 'back' },
      { kind: 'beam', from: pt(54, 132), to: pt(42, 70), w: 10, layer: 'back' },
      { kind: 'line', from: pt(84, 143), to: pt(84, 186), w: 6, layer: 'back' },
      { kind: 'line', from: at('knee'), to: at('shinPad'), w: 3, layer: 'front' },
      { kind: 'circle', at: at('shinPad'), r: 6, layer: 'front' },
    ],
  },

  // ── Incline dumbbell press: bench at ~35°, press up over the upper chest ──
  'incline-db-press': {
    view: 'side',
    topIs: 'end',
    anchor: { joint: 'hip', x: 98, y: 136 },
    start: { spine: -55, hip: 25, knee: 80, ankle: 'flat', shoulder: -40, elbow: 167, armScale: 0.55 },
    end: { spine: -55, hip: 25, knee: 80, ankle: 'flat', shoulder: 117, elbow: 4 },
    equipment: [
      floor,
      { kind: 'beam', from: at('hip', -8, 11), to: at('hip', -57, -23), w: 10, layer: 'back' },
      { kind: 'beam', from: at('hip', -8, 11), to: at('hip', 18, 11), w: 10, layer: 'back' },
      { kind: 'line', from: at('hip', -14, 16), to: pt(84, 186), w: 5, layer: 'back' },
      { kind: 'dumbbellEnd', at: at('hand'), layer: 'front' },
    ],
  },

  // ── Pec deck: arms swing in from wide to meet in front of the chest ───────
  'pec-deck': {
    view: 'front',
    topIs: 'end',
    anchor: { joint: 'hipCentre', x: 100, y: 132 },
    start: { abduct: 85, elbow: 18, armFwd: -5, stance: 'seat' },
    end: { abduct: 85, elbow: 18, armFwd: 104, stance: 'seat' },
    equipment: [
      floor,
      { kind: 'beam', from: pt(100, 78), to: pt(100, 130), w: 40, layer: 'back' },
      { kind: 'beam', from: pt(80, 140), to: pt(120, 140), w: 9, layer: 'back' },
      { kind: 'line', from: pt(100, 144), to: pt(100, 186), w: 6, layer: 'back' },
      { kind: 'line', from: pt(30, 40), to: pt(170, 40), w: 5, layer: 'back' },
      { kind: 'line', from: at('handL', 0, -9), to: { j: 'handL', dx: 0, dy: -52 }, w: 3, layer: 'back' },
      { kind: 'line', from: at('handR', 0, -9), to: { j: 'handR', dx: 0, dy: -52 }, w: 3, layer: 'back' },
      { kind: 'handle', at: at('handL'), w: 5, h: 18, layer: 'front' },
      { kind: 'handle', at: at('handR'), w: 5, h: 18, layer: 'front' },
    ],
  },

  // ── Dumbbell shoulder press: from ear height to overhead ──────────────────
  'db-shoulder-press': {
    view: 'front',
    topIs: 'end',
    anchor: { joint: 'hipCentre', x: 100, y: 136 },
    start: { abduct: 80, elbow: 100, stance: 'seat' },
    end: { abduct: 163, elbow: 17, stance: 'seat' },
    equipment: [
      floor,
      { kind: 'beam', from: pt(100, 86), to: pt(100, 134), w: 38, layer: 'back' },
      { kind: 'beam', from: pt(78, 144), to: pt(122, 144), w: 9, layer: 'back' },
      { kind: 'line', from: pt(100, 148), to: pt(100, 186), w: 6, layer: 'back' },
      { kind: 'dumbbellSide', at: at('handL'), layer: 'front' },
      { kind: 'dumbbellSide', at: at('handR'), layer: 'front' },
    ],
  },

  // ── Lateral raise: arms rise out to the sides, to shoulder height ─────────
  'lateral-raise': {
    view: 'front',
    topIs: 'end',
    anchor: { joint: 'hipCentre', x: 100, y: 100 },
    start: { abduct: 10, elbow: 12, stance: 'stand' },
    end: { abduct: 88, elbow: 12, stance: 'stand' },
    equipment: [
      floor,
      { kind: 'dumbbellEnd', at: at('handL'), r: 6, layer: 'front' },
      { kind: 'dumbbellEnd', at: at('handR'), r: 6, layer: 'front' },
    ],
  },

  // ── Incline dumbbell curl: arms hang behind the body, elbows stay still ───
  'incline-db-curl': {
    view: 'side',
    topIs: 'end',
    anchor: { joint: 'hip', x: 104, y: 136 },
    start: { spine: -50, hip: 30, knee: 80, ankle: 'flat', shoulder: -54, elbow: 5, head: 10 },
    end: { spine: -50, hip: 30, knee: 80, ankle: 'flat', shoulder: -54, elbow: 130, head: 10 },
    equipment: [
      floor,
      { kind: 'beam', from: at('hip', -8, 11), to: at('hip', -52, -29), w: 10, layer: 'back' },
      { kind: 'beam', from: at('hip', -8, 11), to: at('hip', 18, 11), w: 10, layer: 'back' },
      { kind: 'line', from: at('hip', -2, 16), to: pt(102, 186), w: 5, layer: 'back' },
      { kind: 'dumbbellEnd', at: at('hand'), layer: 'front' },
    ],
  },

  // ── Preacher curl machine: upper arms on the pad, curl the handle up ──────
  'preacher-curl': {
    view: 'side',
    topIs: 'end',
    anchor: { joint: 'hip', x: 66, y: 142 },
    start: { spine: 12, hip: 97, knee: 85, ankle: 'flat', shoulder: 38, elbow: 15 },
    end: { spine: 12, hip: 97, knee: 85, ankle: 'flat', shoulder: 38, elbow: 120 },
    equipment: [
      floor,
      { kind: 'beam', from: pt(46, 152), to: pt(86, 152), w: 9, layer: 'back' },
      { kind: 'line', from: pt(66, 156), to: pt(66, 186), w: 5, layer: 'back' },
      { kind: 'line', from: at('elbow', -6, 14), to: at('elbow', -6, 71), w: 5, layer: 'back' },
      { kind: 'beam', from: at('shoulder', 1, 15), to: at('elbow', -3, 12), w: 8, layer: 'front' },
      { kind: 'line', from: at('elbow'), to: at('hand'), w: 3, layer: 'back' },
      { kind: 'handle', at: at('hand'), w: 4, h: 12, layer: 'front' },
    ],
  },

  // ── Skull crushers: lying flat, lower the EZ bar behind the head ──────────
  'skull-crusher': {
    view: 'side',
    topIs: 'start',
    anchor: { joint: 'hip', x: 128, y: 140 },
    start: { spine: -90, hip: 0, knee: 90, ankle: 'flat', shoulder: 96, elbow: 0, head: 0 },
    end: { spine: -90, hip: 0, knee: 90, ankle: 'flat', shoulder: 110, elbow: 115, head: 0 },
    equipment: [
      floor,
      { kind: 'beam', from: pt(46, 158), to: pt(140, 158), w: 10, layer: 'back' },
      { kind: 'line', from: pt(58, 163), to: pt(58, 186), w: 5, layer: 'back' },
      { kind: 'line', from: pt(128, 163), to: pt(128, 186), w: 5, layer: 'back' },
      { kind: 'plate', at: at('hand'), r: 9, layer: 'front' },
    ],
  },

  // ── Cable tricep pushdown: elbows pinned, push the handle down ────────────
  'tricep-pushdown': {
    view: 'side',
    topIs: 'start',
    anchor: { joint: 'ankle', x: 84, y: ANKLE_Y },
    start: { spine: 12, hip: 12, knee: 8, ankle: 'flat', shoulder: 10, elbow: 98, head: -10 },
    end: { spine: 12, hip: 12, knee: 8, ankle: 'flat', shoulder: 10, elbow: 4, head: -10 },
    equipment: [
      floor,
      { kind: 'line', from: pt(160, 8), to: pt(160, 186), w: 6, layer: 'back' },
      { kind: 'circle', at: pt(152, 14), r: 5, layer: 'back' },
      { kind: 'line', from: pt(152, 14), to: at('hand'), w: 1.5, layer: 'back' },
      { kind: 'handle', at: at('hand'), w: 12, h: 4, layer: 'front' },
    ],
  },
};
