/**
 * Pose system for the exercise animations.
 *
 * A pose is a set of joint angles (degrees). The figure is solved with simple
 * 2-D forward kinematics, then translated so one "anchor" point (e.g. the
 * ankle for standing lifts, the hip for seated ones, the hands for chin-ups)
 * stays fixed. Animations interpolate between a start and an end pose.
 *
 * ── Side view angle conventions ─────────────────────────────────────────────
 * The figure faces RIGHT (+x). Absolute segment directions are measured from
 * straight DOWN, rotating towards the front: 0 = down, 90 = forward,
 * 180 = up, -90 = backward. Joint angles are relative:
 *
 *   spine     torso lean from vertical; + = leaning forward, − = leaning back
 *   hip       hip flexion: angle between torso line and thigh (0 = standing)
 *   knee      knee flexion (0 = straight)
 *   ankle     0 = foot at 90° to the shin; + = toes pointed (plantarflexion)
 *   shoulder  shoulder flexion from the arm hanging along the torso;
 *             + = arm forward/up, − = arm behind the body
 *   elbow     elbow flexion (0 = straight)
 *
 * ── Front view ──────────────────────────────────────────────────────────────
 *   abduct    arm raised out to the side (0 = by the side, 90 = horizontal,
 *             180 = overhead)
 *   elbow     elbow flexion, bending the forearm up/in
 *   armFwd    horizontal adduction: how far the arm swings towards the viewer
 *             (0 = in the frontal plane). Shown by foreshortening.
 */

export type Vec = { x: number; y: number };
export type View = 'side' | 'front';

// ─── Segment dimensions (SVG units; the figure is ~190 units tall) ──────────

export const DIM = {
  torso: 48, // hip joint → shoulder joint
  neck: 5,
  headR: 9,
  upperArm: 31,
  forearm: 29, // elbow → middle of the grip
  thigh: 42,
  shin: 40,
  footFwd: 15, // ankle → toe
  footBall: 11, // ankle → ball of the foot
  heel: 5, // ankle → back of the heel
  width: { torso: 25, upperArm: 10.5, forearm: 8.5, thigh: 15, shin: 11, foot: 7, neck: 8 },
} as const;

/** Front-view body proportions. */
export const FRONT = {
  shoulderHalf: 21,
  hipHalf: 10,
  torso: 50,
} as const;

// ─── Pose types ─────────────────────────────────────────────────────────────

export interface SidePose {
  spine: number;
  hip: number;
  knee: number;
  /** A number, or 'flat' to keep the foot level on the floor. */
  ankle: number | 'flat';
  shoulder: number;
  elbow: number;
  /**
   * Foreshortening of the upper arm (1 = full length). Used when the elbows
   * flare out towards the viewer, e.g. at the bottom of a dumbbell press.
   */
  armScale?: number;
  /** Foreshortening of the forearm (1 = full length), e.g. a wide squat grip. */
  forearmScale?: number;
  /**
   * Optional arm IK: put the hands on a point relative to another joint
   * (e.g. gripping a bar on the upper back). Overrides shoulder/elbow.
   */
  reach?: { joint: SideJointName; dx: number; dy: number; bend?: 1 | -1 };
  /** Head tilt relative to the torso (+ = chin towards chest). */
  head?: number;
}

export interface FrontPose {
  abduct: number;
  elbow: number;
  armFwd?: number;
  stance: 'stand' | 'seat';
}

/** Which point stays fixed in place, and where. */
export interface Anchor<J extends string> {
  joint: J;
  x: number;
  y: number;
}

// ─── Maths helpers ──────────────────────────────────────────────────────────

const RAD = Math.PI / 180;

/** Unit vector for an absolute angle (0 = down, 90 = forward/right). */
export function dir(deg: number): Vec {
  return { x: Math.sin(deg * RAD), y: Math.cos(deg * RAD) };
}

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const len = (a: Vec) => Math.hypot(a.x, a.y);
/** Absolute angle of a vector, in the dir() convention. */
const angleOf = (v: Vec) => Math.atan2(v.x, v.y) / RAD;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ─── Side view ──────────────────────────────────────────────────────────────

export type SideJointName =
  | 'hip'
  | 'shoulder'
  | 'head'
  | 'elbow'
  | 'hand'
  | 'knee'
  | 'ankle'
  | 'toe'
  | 'ball'
  | 'heel'
  | 'upperBack'
  | 'chest'
  | 'seat'
  /** Front of the shin just above the ankle (where a leg-extension pad sits). */
  | 'shinPad';

/** Absolute directions (degrees) of each segment, plus resolved positions. */
export interface SideSolved {
  view: 'side';
  joints: Record<SideJointName, Vec>;
  angle: { torso: number; upperArm: number; forearm: number; thigh: number; shin: number; foot: number; head: number };
  upperArmLen: number;
}

/** Resolve a pose's joint angles into absolute segment directions. */
function sideAngles(p: SidePose) {
  const torso = 180 - p.spine;
  const thigh = p.hip - p.spine;
  const shin = thigh - p.knee;
  const foot = p.ankle === 'flat' ? 90 : shin + 90 - p.ankle;
  const upperArm = p.shoulder - p.spine;
  const forearm = upperArm + p.elbow;
  return { torso, thigh, shin, foot, upperArm, forearm, head: torso + (p.head ?? 0) };
}

type SideAngles = ReturnType<typeof sideAngles>;

/** Interpolate two side poses (angle by angle). */
export function lerpSide(a: SidePose, b: SidePose, t: number) {
  const A = sideAngles(a);
  const B = sideAngles(b);
  const angles = {} as SideAngles;
  for (const k of Object.keys(A) as (keyof SideAngles)[]) angles[k] = lerp(A[k], B[k], t);
  return {
    angles,
    armScale: lerp(a.armScale ?? 1, b.armScale ?? 1, t),
    forearmScale: lerp(a.forearmScale ?? 1, b.forearmScale ?? 1, t),
    reachA: a.reach,
    reachB: b.reach,
  };
}

/**
 * Solve the side-view figure at interpolation `t` between two poses.
 * The anchor joint is pinned at the anchor position (interpolated too).
 */
export function solveSide(
  a: SidePose,
  b: SidePose,
  t: number,
  anchorA: Anchor<SideJointName>,
  anchorB: Anchor<SideJointName> = anchorA,
): SideSolved {
  const { angles: g, armScale, forearmScale, reachA, reachB } = lerpSide(a, b, t);
  const d = DIM;

  // Chain from the hip at the origin.
  const hip: Vec = { x: 0, y: 0 };
  const torsoDir = dir(g.torso);
  const shoulder = add(hip, mul(torsoDir, d.torso));
  const anterior = dir(g.torso - 90);
  const posterior = dir(g.torso + 90);
  const head = add(shoulder, mul(dir(g.head), d.neck + d.headR));
  const upperBack = add(add(hip, mul(torsoDir, d.torso * 0.86)), mul(posterior, 10));
  const chest = add(add(hip, mul(torsoDir, d.torso * 0.78)), mul(anterior, 11));
  const seat = add(hip, mul(posterior, 3));
  const knee = add(hip, mul(dir(g.thigh), d.thigh));
  const ankle = add(knee, mul(dir(g.shin), d.shin));
  const toe = add(ankle, mul(dir(g.foot), d.footFwd));
  const ball = add(ankle, mul(dir(g.foot), d.footBall));
  const heel = add(ankle, mul(dir(g.foot), -d.heel));
  const shinPad = add(add(ankle, mul(dir(g.shin + 90), 9.5)), mul(dir(g.shin), -6));

  const partial: Partial<Record<SideJointName, Vec>> = {
    hip, shoulder, head, upperBack, chest, seat, knee, ankle, toe, ball, heel, shinPad,
  };

  let upperArm = g.upperArm;
  let forearm = g.forearm;
  const uaLen = d.upperArm * armScale;
  const faLen = d.forearm * forearmScale;

  // Arm IK: interpolate the target between the two poses' targets.
  if (reachA && reachB) {
    const targetA = add(partial[reachA.joint]!, { x: reachA.dx, y: reachA.dy });
    const targetB = add(partial[reachB.joint]!, { x: reachB.dx, y: reachB.dy });
    const target = { x: lerp(targetA.x, targetB.x, t), y: lerp(targetA.y, targetB.y, t) };
    const sol = twoLinkIK(shoulder, target, uaLen, faLen, reachA.bend ?? 1);
    upperArm = sol.a1;
    forearm = sol.a2;
  }

  const elbow = add(shoulder, mul(dir(upperArm), uaLen));
  const hand = add(elbow, mul(dir(forearm), faLen));
  const joints = { ...partial, elbow, hand } as Record<SideJointName, Vec>;

  // Pin the anchor.
  const anchorPos = { x: lerp(anchorA.x, anchorB.x, t), y: lerp(anchorA.y, anchorB.y, t) };
  const shift = sub(anchorPos, joints[anchorA.joint]);
  for (const k of Object.keys(joints) as SideJointName[]) joints[k] = add(joints[k], shift);

  return {
    view: 'side',
    joints,
    angle: { ...g, upperArm, forearm },
    upperArmLen: uaLen,
  };
}

/**
 * Two-link inverse kinematics: angles for segments of length l1, l2 from
 * `origin` so the end reaches `target` (or as close as possible).
 * `bend` picks which way the middle joint bends.
 */
function twoLinkIK(origin: Vec, target: Vec, l1: number, l2: number, bend: 1 | -1) {
  const v = sub(target, origin);
  const dist = Math.min(len(v), l1 + l2 - 0.01);
  const base = angleOf(v);
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA))) / RAD;
  const a1 = base + bend * a;
  const elbow = add(origin, mul(dir(a1), l1));
  const a2 = angleOf(sub(add(origin, mul(dir(base), dist)), elbow));
  return { a1, a2 };
}

// ─── Front view ─────────────────────────────────────────────────────────────

export type FrontJointName =
  | 'head'
  | 'neck'
  | 'shoulderL'
  | 'shoulderR'
  | 'elbowL'
  | 'elbowR'
  | 'handL'
  | 'handR'
  | 'hipL'
  | 'hipR'
  | 'kneeL'
  | 'kneeR'
  | 'ankleL'
  | 'ankleR'
  | 'hipCentre';

export interface FrontSolved {
  view: 'front';
  joints: Record<FrontJointName, Vec>;
  /** Right-arm segment angles (the left arm mirrors them). */
  angle: { upperArm: number; forearm: number };
  /** Projected lengths after foreshortening. */
  upperArmLen: number;
  forearmLen: number;
  stance: 'stand' | 'seat';
}

/**
 * Solve the symmetric front-view figure. `anchor` is the hip centre.
 * Directions for the right arm use dir() with +x = outward from the body.
 */
export function solveFront(a: FrontPose, b: FrontPose, t: number, anchor: Anchor<'hipCentre'>): FrontSolved {
  const abduct = lerp(a.abduct, b.abduct, t);
  const elbowFlex = lerp(a.elbow, b.elbow, t);
  const fwd = lerp(a.armFwd ?? 0, b.armFwd ?? 0, t);
  const stance = a.stance;
  const c = { x: anchor.x, y: anchor.y };

  const shoulderY = c.y - FRONT.torso;
  const shoulderR = { x: c.x + FRONT.shoulderHalf, y: shoulderY };
  const shoulderL = { x: c.x - FRONT.shoulderHalf, y: shoulderY };
  const neck = { x: c.x, y: shoulderY - 4 };
  const head = { x: c.x, y: shoulderY - DIM.neck - DIM.headR - 2 };

  // Foreshortening: swinging the arm towards the viewer shortens its
  // sideways reach (cos), and beyond 90° the hands cross towards the midline.
  const proj = Math.cos(fwd * RAD);
  const upperArm = abduct;
  const forearm = abduct + elbowFlex;
  const elbowOffset = { x: Math.sin(upperArm * RAD) * DIM.upperArm * proj, y: Math.cos(upperArm * RAD) * DIM.upperArm };
  const handOffset = { x: Math.sin(forearm * RAD) * DIM.forearm * proj, y: Math.cos(forearm * RAD) * DIM.forearm };
  // When swung forward, the vertical component is unchanged; horizontal shrinks.
  const elbowR = add(shoulderR, elbowOffset);
  const handR = add(elbowR, handOffset);
  const mirror = (p: Vec): Vec => ({ x: 2 * c.x - p.x, y: p.y });

  const hipR = { x: c.x + FRONT.hipHalf, y: c.y };
  const hipL = { x: c.x - FRONT.hipHalf, y: c.y };
  let kneeR: Vec;
  let ankleR: Vec;
  if (stance === 'stand') {
    kneeR = { x: c.x + 11, y: c.y + DIM.thigh };
    ankleR = { x: c.x + 12, y: c.y + DIM.thigh + DIM.shin };
  } else {
    // Seated: thighs point at the viewer, so they look short.
    kneeR = { x: c.x + 15, y: c.y + 12 };
    ankleR = { x: c.x + 16, y: c.y + 12 + DIM.shin };
  }

  return {
    view: 'front',
    joints: {
      head,
      neck,
      hipCentre: c,
      shoulderL,
      shoulderR,
      elbowR,
      handR,
      elbowL: mirror(elbowR),
      handL: mirror(handR),
      hipL,
      hipR,
      kneeR,
      ankleR,
      kneeL: mirror(kneeR),
      ankleL: mirror(ankleR),
    },
    angle: { upperArm, forearm },
    upperArmLen: DIM.upperArm,
    forearmLen: DIM.forearm,
    stance,
  };
}
