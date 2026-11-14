/**
 * Small front and back body outlines with the exercise's muscles highlighted:
 * primary in bright red, secondary in orange. All other muscles are shown in a
 * muted tone so the highlighted ones read in context.
 */
import type { Muscle } from '../db/types';
import { MUSCLE_LABELS } from '../data/programmes';
import type { Highlight } from './Figure';

type Shape =
  | { kind: 'e'; cx: number; cy: number; rx: number; ry: number; rot?: number }
  | { kind: 'p'; d: string };

/** Muscle shapes on a 100 × 200 canvas, left half only (mirrored automatically). */
const FRONT: Partial<Record<Muscle, Shape[]>> = {
  traps: [{ kind: 'e', cx: 41, cy: 35, rx: 7, ry: 2.6, rot: 18 }],
  frontDelts: [{ kind: 'e', cx: 29, cy: 42, rx: 4.5, ry: 6.5, rot: 15 }],
  sideDelts: [{ kind: 'e', cx: 25, cy: 43, rx: 3, ry: 6, rot: 15 }],
  upperChest: [{ kind: 'e', cx: 41, cy: 44, rx: 8, ry: 3.2 }],
  chest: [{ kind: 'e', cx: 41, cy: 50, rx: 8.5, ry: 6 }],
  lats: [{ kind: 'e', cx: 32, cy: 64, rx: 2.8, ry: 9 }],
  biceps: [{ kind: 'e', cx: 22.5, cy: 59, rx: 4, ry: 10, rot: 8 }],
  bicepsLong: [{ kind: 'e', cx: 21, cy: 59, rx: 2.4, ry: 10, rot: 8 }],
  brachialis: [{ kind: 'e', cx: 19.5, cy: 71, rx: 2.2, ry: 4, rot: 8 }],
  forearms: [{ kind: 'e', cx: 16.5, cy: 92, rx: 4.5, ry: 12, rot: 8 }],
  quads: [{ kind: 'e', cx: 40, cy: 132, rx: 7, ry: 18, rot: 3 }],
  adductors: [{ kind: 'e', cx: 46.5, cy: 122, rx: 3, ry: 10, rot: -4 }],
  calves: [{ kind: 'e', cx: 35, cy: 170, rx: 2.4, ry: 9 }],
};

const BACK: Partial<Record<Muscle, Shape[]>> = {
  lats: [{ kind: 'e', cx: 38, cy: 66, rx: 8, ry: 14, rot: 14 }],
  midBack: [{ kind: 'e', cx: 44, cy: 54, rx: 6, ry: 8 }],
  traps: [{ kind: 'p', d: 'M50 28 L37 38 L44 46 L50 64 Z' }],
  rearDelts: [{ kind: 'e', cx: 29, cy: 43, rx: 4.5, ry: 5.5, rot: 15 }],
  sideDelts: [{ kind: 'e', cx: 25, cy: 43, rx: 3, ry: 6, rot: 15 }],
  lowerBack: [{ kind: 'e', cx: 45.5, cy: 88, rx: 3.6, ry: 11 }],
  triceps: [{ kind: 'e', cx: 22.5, cy: 59, rx: 4.2, ry: 10.5, rot: 8 }],
  tricepsLong: [{ kind: 'e', cx: 24, cy: 58, rx: 2.4, ry: 10, rot: 8 }],
  forearms: [{ kind: 'e', cx: 16.5, cy: 92, rx: 4.5, ry: 12, rot: 8 }],
  glutes: [{ kind: 'e', cx: 42, cy: 112, rx: 8.5, ry: 9 }],
  hamstrings: [{ kind: 'e', cx: 40, cy: 140, rx: 6.5, ry: 16, rot: 3 }],
  adductors: [{ kind: 'e', cx: 46.5, cy: 127, rx: 2.6, ry: 8 }],
  calves: [{ kind: 'e', cx: 38.5, cy: 166, rx: 5.5, ry: 10 }],
};

/** The body silhouette (both halves drawn explicitly). */
function Silhouette() {
  const limb = (x1: number, y1: number, x2: number, y2: number, w: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={w} strokeLinecap="round" />
  );
  return (
    <g fill="var(--fig-body)" stroke="var(--fig-body)">
      <circle cx={50} cy={17} r={11} stroke="none" />
      <rect x={45} y={24} width={10} height={10} rx={4} stroke="none" />
      <path
        stroke="none"
        d="M27 40 Q27 33 35 33 L65 33 Q73 33 73 40 L66 80 Q68 100 67 108 L33 108 Q32 100 34 80 Z"
      />
      {[1, -1].map((s) => {
        const x = (v: number) => (s === 1 ? v : 100 - v);
        return (
          <g key={s}>
            {limb(x(25), 41, x(20), 76, 11)}
            {limb(x(20), 76, x(15), 110, 9)}
            <circle cx={x(14)} cy={115} r={4.5} stroke="none" />
            {limb(x(41), 108, x(39), 152, 16)}
            {limb(x(39), 152, x(39), 188, 11)}
            <ellipse cx={x(37)} cy={193} rx={6} ry={3} stroke="none" />
          </g>
        );
      })}
    </g>
  );
}

function Muscles({ shapes, h }: { shapes: Partial<Record<Muscle, Shape[]>>; h: Highlight }) {
  const entries = Object.entries(shapes) as [Muscle, Shape[]][];
  const colour = (m: Muscle) =>
    h.primary.includes(m) ? 'var(--muscle-primary)' : h.secondary.includes(m) ? 'var(--muscle-secondary)' : 'var(--muscle-idle)';
  // Draw idle muscles first so highlighted ones sit on top.
  const order = [...entries].sort(([a], [b]) => rank(a) - rank(b));
  function rank(m: Muscle) {
    return h.primary.includes(m) ? 2 : h.secondary.includes(m) ? 1 : 0;
  }
  return (
    <g>
      {order.flatMap(([m, list]) =>
        list.flatMap((shape, i) =>
          [false, true].map((mirrored) => {
            const fill = colour(m);
            const key = `${m}-${i}-${mirrored}`;
            const t = mirrored ? 'translate(100 0) scale(-1 1)' : undefined;
            return shape.kind === 'e' ? (
              <g key={key} transform={t}>
                <ellipse
                  cx={shape.cx}
                  cy={shape.cy}
                  rx={shape.rx}
                  ry={shape.ry}
                  transform={shape.rot ? `rotate(${shape.rot} ${shape.cx} ${shape.cy})` : undefined}
                  fill={fill}
                />
              </g>
            ) : (
              <path key={key} d={shape.d} transform={t} fill={fill} />
            );
          }),
        ),
      )}
    </g>
  );
}

export function MuscleMap({ highlight }: { highlight: Highlight }) {
  const label = (ms: Muscle[]) => ms.map((m) => MUSCLE_LABELS[m]).join(', ');
  return (
    <div className="muscle-map">
      <div className="muscle-figures">
        <figure>
          <svg viewBox="0 0 100 200" role="img" aria-label="Front of body">
            <Silhouette />
            <Muscles shapes={FRONT} h={highlight} />
          </svg>
          <figcaption>Front</figcaption>
        </figure>
        <figure>
          <svg viewBox="0 0 100 200" role="img" aria-label="Back of body">
            <Silhouette />
            <Muscles shapes={BACK} h={highlight} />
          </svg>
          <figcaption>Back</figcaption>
        </figure>
      </div>
      <dl className="muscle-legend">
        <div>
          <dt>
            <span className="swatch swatch-primary" aria-hidden="true" /> Primary
          </dt>
          <dd>{label(highlight.primary) || '—'}</dd>
        </div>
        {highlight.secondary.length > 0 && (
          <div>
            <dt>
              <span className="swatch swatch-secondary" aria-hidden="true" /> Secondary
            </dt>
            <dd>{label(highlight.secondary)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
