/**
 * SVG rendering of the exercise figure.
 *
 * Body segments are rounded capsules drawn in their own local frame (origin
 * at the proximal joint, +y along the segment, +x towards the front of the
 * body), so the muscle shapes defined in that frame move with the segment.
 * Muscles are clipped to their segment so they never spill outside the body.
 */
import { useEffect, useId, useState, type ReactNode } from 'react';
import type { Muscle } from '../db/types';
import {
  DIM,
  dir,
  solveFront,
  solveSide,
  type FrontSolved,
  type SideSolved,
  type Vec,
} from './kinematics';
import { FLOOR_Y, type Equip, type ExerciseAnimation, type PointRef } from './library';

export interface Highlight {
  primary: Muscle[];
  secondary: Muscle[];
}

// ─── Muscle shapes in segment-local coordinates ─────────────────────────────
// cx, rx in units; cy, ry as a fraction of the segment length.

interface MuscleShape {
  m: Muscle[];
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const SIDE_SHAPES: Record<'torso' | 'upperArm' | 'forearm' | 'thigh' | 'shin', MuscleShape[]> = {
  torso: [
    { m: ['glutes'], cx: -7, cy: 0.03, rx: 8, ry: 0.2 },
    { m: ['lowerBack'], cx: -8, cy: 0.33, rx: 4.5, ry: 0.2 },
    { m: ['lats'], cx: -3, cy: 0.6, rx: 7, ry: 0.22 },
    { m: ['midBack'], cx: -9, cy: 0.72, rx: 4, ry: 0.15 },
    { m: ['traps'], cx: -6, cy: 0.96, rx: 6.5, ry: 0.12 },
    { m: ['chest'], cx: 7.5, cy: 0.77, rx: 6, ry: 0.16 },
    { m: ['upperChest'], cx: 7.5, cy: 0.88, rx: 5.5, ry: 0.08 },
  ],
  upperArm: [
    { m: ['triceps', 'tricepsLong'], cx: -2.6, cy: 0.5, rx: 3.6, ry: 0.33 },
    { m: ['biceps', 'bicepsLong'], cx: 2.6, cy: 0.55, rx: 3.6, ry: 0.3 },
    { m: ['brachialis'], cx: 3.6, cy: 0.77, rx: 2.2, ry: 0.13 },
    { m: ['rearDelts'], cx: -2.8, cy: 0.08, rx: 4, ry: 0.2 },
    { m: ['frontDelts'], cx: 2.8, cy: 0.08, rx: 4, ry: 0.2 },
    { m: ['sideDelts'], cx: 0, cy: 0.06, rx: 4.2, ry: 0.17 },
  ],
  forearm: [{ m: ['forearms'], cx: 0, cy: 0.33, rx: 4.5, ry: 0.3 }],
  thigh: [
    { m: ['adductors'], cx: 0, cy: 0.3, rx: 3, ry: 0.22 },
    { m: ['quads'], cx: 3, cy: 0.5, rx: 5, ry: 0.38 },
    { m: ['hamstrings'], cx: -3.5, cy: 0.52, rx: 4.5, ry: 0.36 },
    { m: ['glutes'], cx: -5, cy: 0, rx: 7, ry: 0.15 },
  ],
  shin: [{ m: ['calves'], cx: -2.6, cy: 0.3, rx: 4.2, ry: 0.25 }],
};

const FRONT_SHAPES: Record<'upperArm' | 'forearm' | 'thigh' | 'shin', MuscleShape[]> = {
  upperArm: [
    { m: ['triceps', 'tricepsLong'], cx: 4, cy: 0.5, rx: 2, ry: 0.3 },
    { m: ['biceps', 'bicepsLong'], cx: 0, cy: 0.56, rx: 3.6, ry: 0.3 },
    { m: ['frontDelts'], cx: -1.5, cy: 0.1, rx: 4, ry: 0.2 },
    { m: ['sideDelts'], cx: 3, cy: 0.08, rx: 3.5, ry: 0.2 },
  ],
  forearm: [{ m: ['forearms'], cx: 0, cy: 0.33, rx: 4.5, ry: 0.3 }],
  thigh: [
    { m: ['adductors'], cx: -5, cy: 0.35, rx: 2.5, ry: 0.25 },
    { m: ['quads'], cx: 0.5, cy: 0.5, rx: 5.5, ry: 0.38 },
  ],
  shin: [{ m: ['calves'], cx: 4, cy: 0.3, rx: 1.6, ry: 0.22 }],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const deg = (v: Vec) => (Math.atan2(v.x, v.y) * 180) / Math.PI;

function muscleFill(ms: Muscle[], h: Highlight): string | null {
  if (ms.some((m) => h.primary.includes(m))) return 'var(--muscle-primary)';
  if (ms.some((m) => h.secondary.includes(m))) return 'var(--muscle-secondary)';
  return null;
}

interface SegmentProps {
  id: string;
  a: Vec;
  b: Vec;
  w: number;
  shapes?: MuscleShape[];
  highlight: Highlight;
  far?: boolean;
  /** Flip local x (torso in side view, left arm in front view). */
  mirror?: boolean;
}

/** A rounded body segment from a to b, with its muscles. */
function Segment({ id, a, b, w, shapes = [], highlight, far, mirror }: SegmentProps) {
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = deg({ x: b.x - a.x, y: b.y - a.y });
  const transform = `translate(${a.x} ${a.y}) rotate(${-angle})${mirror ? ' scale(-1 1)' : ''}`;
  const clip = `${id}-clip`;
  const muscles = shapes
    .map((s, i) => ({ s, i, fill: muscleFill(s.m, highlight) }))
    .filter((x) => x.fill);
  return (
    <g transform={transform}>
      <clipPath id={clip}>
        <rect x={-w / 2} y={-w / 2} width={w} height={L + w} rx={w / 2} />
      </clipPath>
      <rect
        x={-w / 2}
        y={-w / 2}
        width={w}
        height={L + w}
        rx={w / 2}
        fill={far ? 'var(--fig-far)' : 'var(--fig-body)'}
        stroke="var(--fig-stroke)"
        strokeWidth={0.8}
      />
      {muscles.length > 0 && (
        <g clipPath={`url(#${clip})`} opacity={far ? 0.55 : 1}>
          {muscles.map(({ s, i, fill }) => (
            <ellipse key={i} cx={s.cx} cy={s.cy * L} rx={s.rx} ry={Math.max(1.5, s.ry * L)} fill={fill!} />
          ))}
        </g>
      )}
    </g>
  );
}

function resolve(p: PointRef, joints: Record<string, Vec>): Vec {
  if ('j' in p) {
    const j = joints[p.j];
    return { x: j.x + (p.dx ?? 0), y: j.y + (p.dy ?? 0) };
  }
  return p;
}

function EquipmentItem({ e, joints }: { e: Equip; joints: Record<string, Vec> }) {
  const stroke = 'var(--equip)';
  switch (e.kind) {
    case 'floor':
      return <line x1={0} y1={FLOOR_Y} x2={200} y2={FLOOR_Y} stroke="var(--equip-soft)" strokeWidth={2} />;
    case 'plate': {
      const c = resolve(e.at, joints);
      return (
        <g>
          <circle cx={c.x} cy={c.y} r={e.r} fill="var(--equip)" fillOpacity={0.14} stroke={stroke} strokeWidth={2} />
          <circle cx={c.x} cy={c.y} r={e.r * 0.55} fill="none" stroke={stroke} strokeOpacity={0.4} strokeWidth={1} />
          <circle cx={c.x} cy={c.y} r={2.6} fill={stroke} />
        </g>
      );
    }
    case 'dumbbellEnd': {
      const c = resolve(e.at, joints);
      const r = e.r ?? 7.5;
      return (
        <g>
          <rect x={c.x - r} y={c.y - r} width={2 * r} height={2 * r} rx={r * 0.45} fill="var(--equip)" fillOpacity={0.25} stroke={stroke} strokeWidth={1.8} />
          <circle cx={c.x} cy={c.y} r={1.8} fill={stroke} />
        </g>
      );
    }
    case 'dumbbellSide': {
      const c = resolve(e.at, joints);
      return (
        <g transform={`translate(${c.x} ${c.y})`}>
          <rect x={-11} y={-1.5} width={22} height={3} rx={1.5} fill={stroke} />
          <rect x={-13} y={-6.5} width={5} height={13} rx={1.5} fill="var(--equip)" fillOpacity={0.35} stroke={stroke} strokeWidth={1.4} />
          <rect x={8} y={-6.5} width={5} height={13} rx={1.5} fill="var(--equip)" fillOpacity={0.35} stroke={stroke} strokeWidth={1.4} />
        </g>
      );
    }
    case 'line': {
      const a = resolve(e.from, joints);
      const b = resolve(e.to, joints);
      return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={e.w ?? 2} strokeLinecap="round" />;
    }
    case 'beam': {
      const a = resolve(e.from, joints);
      const b = resolve(e.to, joints);
      return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--equip-soft)" strokeWidth={e.w} strokeLinecap="round" />;
    }
    case 'circle': {
      const c = resolve(e.at, joints);
      return <circle cx={c.x} cy={c.y} r={e.r} fill="var(--equip-soft)" stroke={stroke} strokeWidth={1.5} />;
    }
    case 'rect':
      return <rect x={e.x} y={e.y} width={e.w} height={e.h} rx={e.rx ?? 2} fill="var(--equip-soft)" />;
    case 'handle': {
      const c = resolve(e.at, joints);
      return (
        <rect x={c.x - e.w / 2} y={c.y - e.h / 2} width={e.w} height={e.h} rx={Math.min(e.w, e.h) / 2} fill={stroke} />
      );
    }
  }
}

function Equipment({ items, layer, joints }: { items: Equip[]; layer: 'back' | 'front'; joints: Record<string, Vec> }) {
  return (
    <>
      {items
        .filter((e) => (e.layer ?? 'back') === layer)
        .map((e, i) => (
          <EquipmentItem key={i} e={e} joints={joints} />
        ))}
    </>
  );
}

// ─── Side-view body ─────────────────────────────────────────────────────────

/** Offset for the far-side arm and leg, giving a little depth. */
const FAR: Vec = { x: -2.5, y: -1.5 };
const shift = (p: Vec, d: Vec) => ({ x: p.x + d.x, y: p.y + d.y });

function SideBody({ s, h, uid }: { s: SideSolved; h: Highlight; uid: string }) {
  const j = s.joints;
  const W = DIM.width;

  const leg = (far: boolean) => {
    const o = far ? FAR : { x: 0, y: 0 };
    return (
      <g>
        <Segment id={`${uid}-th${far ? 'f' : ''}`} a={shift(j.hip, o)} b={shift(j.knee, o)} w={W.thigh} shapes={SIDE_SHAPES.thigh} highlight={h} far={far} />
        <Segment id={`${uid}-sh${far ? 'f' : ''}`} a={shift(j.knee, o)} b={shift(j.ankle, o)} w={W.shin} shapes={SIDE_SHAPES.shin} highlight={h} far={far} />
        <Segment id={`${uid}-ft${far ? 'f' : ''}`} a={shift(j.heel, o)} b={shift(j.toe, o)} w={W.foot} highlight={h} far={far} />
      </g>
    );
  };

  const arm = (far: boolean) => {
    const o = far ? FAR : { x: 0, y: 0 };
    return (
      <g>
        <Segment id={`${uid}-ua${far ? 'f' : ''}`} a={shift(j.shoulder, o)} b={shift(j.elbow, o)} w={W.upperArm} shapes={SIDE_SHAPES.upperArm} highlight={h} far={far} />
        <Segment id={`${uid}-fa${far ? 'f' : ''}`} a={shift(j.elbow, o)} b={shift(j.hand, o)} w={W.forearm} shapes={SIDE_SHAPES.forearm} highlight={h} far={far} />
        <circle cx={j.hand.x + o.x} cy={j.hand.y + o.y} r={4.2} fill={far ? 'var(--fig-far)' : 'var(--fig-body)'} stroke="var(--fig-stroke)" strokeWidth={0.8} />
      </g>
    );
  };

  // Face direction: the front of the head.
  const face = dir(s.angle.head - 90);
  return (
    <g>
      {arm(true)}
      {leg(true)}
      <Segment id={`${uid}-nk`} a={j.shoulder} b={j.head} w={W.neck} highlight={h} />
      <Segment id={`${uid}-to`} a={j.hip} b={j.shoulder} w={W.torso} shapes={SIDE_SHAPES.torso} highlight={h} mirror />
      <circle cx={j.head.x} cy={j.head.y} r={DIM.headR} fill="var(--fig-body)" stroke="var(--fig-stroke)" strokeWidth={0.8} />
      <circle cx={j.head.x + face.x * 8.2} cy={j.head.y + face.y * 8.2} r={2.4} fill="var(--fig-body)" />
      {leg(false)}
      {arm(false)}
    </g>
  );
}

// ─── Front-view body ────────────────────────────────────────────────────────

function FrontBody({ s, h, uid }: { s: FrontSolved; h: Highlight; uid: string }) {
  const j = s.joints;
  const W = DIM.width;
  const c = j.hipCentre;
  const sy = j.shoulderR.y;
  const fill = (m: Muscle[]) => muscleFill(m, h);
  const torsoPath = [
    `M ${c.x - 24} ${sy + 3}`,
    `Q ${c.x - 24} ${sy - 4} ${c.x - 16} ${sy - 4}`,
    `L ${c.x + 16} ${sy - 4}`,
    `Q ${c.x + 24} ${sy - 4} ${c.x + 24} ${sy + 3}`,
    `L ${c.x + 15} ${sy + 38}`,
    `Q ${c.x + 18} ${c.y + 4} ${c.x + 14} ${c.y + 6}`,
    `L ${c.x - 14} ${c.y + 6}`,
    `Q ${c.x - 18} ${c.y + 4} ${c.x - 15} ${sy + 38}`,
    'Z',
  ].join(' ');
  const torsoMuscles: { m: Muscle[]; x: number; y: number; rx: number; ry: number }[] = [
    { m: ['lats'], x: 16, y: 22, rx: 3, ry: 9 },
    { m: ['chest'], x: 9, y: 11, rx: 8.5, ry: 6.5 },
    { m: ['upperChest'], x: 9, y: 6, rx: 8, ry: 3.2 },
    { m: ['traps'], x: 9, y: -2, rx: 7, ry: 2.6 },
  ];

  const arm = (side: 'L' | 'R') => {
    const mirror = side === 'L';
    return (
      <g>
        <Segment id={`${uid}-ua${side}`} a={j[`shoulder${side}`]} b={j[`elbow${side}`]} w={W.upperArm} shapes={FRONT_SHAPES.upperArm} highlight={h} mirror={mirror} />
        <Segment id={`${uid}-fa${side}`} a={j[`elbow${side}`]} b={j[`hand${side}`]} w={W.forearm} shapes={FRONT_SHAPES.forearm} highlight={h} mirror={mirror} />
        <circle cx={j[`hand${side}`].x} cy={j[`hand${side}`].y} r={4.2} fill="var(--fig-body)" stroke="var(--fig-stroke)" strokeWidth={0.8} />
      </g>
    );
  };
  const leg = (side: 'L' | 'R') => {
    const mirror = side === 'L';
    const seated = s.stance === 'seat';
    return (
      <g>
        <Segment id={`${uid}-sh${side}`} a={j[`knee${side}`]} b={j[`ankle${side}`]} w={W.shin} shapes={FRONT_SHAPES.shin} highlight={h} mirror={mirror} />
        <Segment id={`${uid}-th${side}`} a={j[`hip${side}`]} b={j[`knee${side}`]} w={seated ? W.thigh + 3 : W.thigh} shapes={FRONT_SHAPES.thigh} highlight={h} mirror={mirror} />
        <ellipse cx={j[`ankle${side}`].x + (mirror ? -2 : 2)} cy={j[`ankle${side}`].y + 4} rx={6} ry={3.5} fill="var(--fig-body)" stroke="var(--fig-stroke)" strokeWidth={0.8} />
      </g>
    );
  };

  // Arms behind the torso while they hang or swing back; in front once crossing.
  return (
    <g>
      {leg('L')}
      {leg('R')}
      <rect x={c.x - 4} y={j.neck.y - 6} width={8} height={10} rx={4} fill="var(--fig-body)" stroke="var(--fig-stroke)" strokeWidth={0.8} />
      <path d={torsoPath} fill="var(--fig-body)" stroke="var(--fig-stroke)" strokeWidth={0.8} />
      <clipPath id={`${uid}-torso`}>
        <path d={torsoPath} />
      </clipPath>
      <g clipPath={`url(#${uid}-torso)`}>
        {torsoMuscles.flatMap((t, i) => {
          const f = fill(t.m);
          if (!f) return [];
          return [-1, 1].map((sgn) => (
            <ellipse key={`${i}${sgn}`} cx={c.x + sgn * t.x} cy={sy + t.y} rx={t.rx} ry={t.ry} fill={f} />
          ));
        })}
      </g>
      <circle cx={j.head.x} cy={j.head.y} r={DIM.headR + 1} fill="var(--fig-body)" stroke="var(--fig-stroke)" strokeWidth={0.8} />
      {arm('L')}
      {arm('R')}
    </g>
  );
}

// ─── Public components ──────────────────────────────────────────────────────

/** Solve an animation at t ∈ [0, 1] (0 = start pose, 1 = end pose). */
export function solve(anim: ExerciseAnimation, t: number): SideSolved | FrontSolved {
  return anim.view === 'side'
    ? solveSide(anim.start, anim.end, t, anim.anchor, anim.anchorEnd)
    : solveFront(anim.start, anim.end, t, anim.anchor);
}

/** One frame of an exercise animation. */
export function FigureFrame({ anim, t, highlight, label }: { anim: ExerciseAnimation; t: number; highlight: Highlight; label: string }) {
  const uid = useId().replace(/:/g, '');
  const solved = solve(anim, t);
  const joints = solved.joints as Record<string, Vec>;
  return (
    <svg viewBox="0 0 200 200" className="figure" role="img" aria-label={label}>
      <Equipment items={anim.equipment} layer="back" joints={joints} />
      {solved.view === 'side' ? <SideBody s={solved} h={highlight} uid={uid} /> : <FrontBody s={solved} h={highlight} uid={uid} />}
      <Equipment items={anim.equipment} layer="front" joints={joints} />
    </svg>
  );
}

// ─── Animation timing ───────────────────────────────────────────────────────

/** ~3 s per rep: move, short hold, move back, longer hold at the top. */
const MOVE = 1100;
const HOLD_TOP = 550;
const HOLD_OTHER = 250;
export const REP_MS = MOVE * 2 + HOLD_TOP + HOLD_OTHER;

const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;

/** Pose position t (0 = start, 1 = end) at time `ms` into the loop. */
export function phaseAt(ms: number, topIs: 'start' | 'end'): number {
  const holdStart = topIs === 'start' ? HOLD_TOP : HOLD_OTHER;
  const holdEnd = topIs === 'end' ? HOLD_TOP : HOLD_OTHER;
  let m = ms % REP_MS;
  if (m < holdStart) return 0;
  m -= holdStart;
  if (m < MOVE) return ease(m / MOVE);
  m -= MOVE;
  if (m < holdEnd) return 1;
  m -= holdEnd;
  return 1 - ease(Math.min(1, m / MOVE));
}

export function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/**
 * Looping exercise animation. With "Reduce Motion" turned on, shows the start
 * and end poses side by side instead.
 */
export function ExerciseAnimationView({
  anim,
  highlight,
  name,
  forceStatic,
}: {
  anim: ExerciseAnimation;
  highlight: Highlight;
  name: string;
  forceStatic?: boolean;
}): ReactNode {
  const reduced = usePrefersReducedMotion() || !!forceStatic;
  const [t, setT] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setT(phaseAt(now - t0, anim.topIs));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim, reduced]);

  if (reduced) {
    return (
      <div className="figure-pair">
        <figure>
          <FigureFrame anim={anim} t={0} highlight={highlight} label={`${name}: start position`} />
          <figcaption>Start</figcaption>
        </figure>
        <figure>
          <FigureFrame anim={anim} t={1} highlight={highlight} label={`${name}: end position`} />
          <figcaption>End</figcaption>
        </figure>
      </div>
    );
  }
  return <FigureFrame anim={anim} t={t} highlight={highlight} label={`${name} demonstration`} />;
}
