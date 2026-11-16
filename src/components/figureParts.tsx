// src/components/figureParts.tsx
/**
 * The body the motion demos draw: tapered limbs with muscle bellies, hands, shoes, shorts, a shaped
 * torso and a head with hair and a face. Every view (side, front/back, 3/4, top) builds its figure
 * from these parts, so the lifter looks the same from every camera.
 *
 * Everything here works on 2-D screen points; the 3-D views project first and then draw.
 */
import { BONES, type SegmentId, type Vec } from '../domain/motionRig';

export const FIG = {
  skin: '#d3dbe6',
  skinFar: '#8b99ae',
  outline: '#0b1220',
  shorts: '#42536e',
  shortsFar: '#33425a',
  shoe: '#f1f5f9',
  shoeFar: '#9aa8bb',
  hair: '#3d4a5f',
  hairFar: '#334155',
  ghost: '#94a3b8',
  worked: '#10b981',
  workedFar: '#059669',
};

const f = (n: number) => n.toFixed(1);
const P = (p: Vec) => `${f(p[0])},${f(p[1])}`;

/** [position along the bone 0..1, half-thickness] */
export type Stop = [number, number];

/** Muscle profile of each limb segment, proximal to distal. */
export const LIMB_PROFILE: Record<'ua' | 'fa' | 'th' | 'sh' | 'ft' | 'neck' | 'shorts', Stop[]> = {
  ua: [[0, 5.3], [0.3, 5.1], [1, 3.8]],
  fa: [[0, 3.9], [0.28, 4.2], [1, 2.7]],
  th: [[0, 7.6], [0.35, 7.1], [1, 4.9]],
  sh: [[0, 4.7], [0.3, 5.6], [1, 3.0]],
  ft: [[0, 3.3], [0.5, 3.5], [1, 2.3]],
  neck: [[0, 3.7], [1, 3.3]],
  shorts: [[0, 8.2], [0.35, 7.7], [1, 6.6]],
};

/** How far down the thigh the shorts reach. */
export const SHORTS_REACH = 0.5;
export const HAND_R = 3.1;

/**
 * Outline of a rounded tube from a to b whose half-thickness follows the stops.
 * A bone pointing at the camera (a ≈ b) collapses to a disc of its widest stop.
 */
export function tubePath(a: Vec, b: Vec, stops: Stop[]): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  if (L < 0.6) {
    const r = Math.max(...stops.map((s) => s[1]));
    return `M${f(a[0] - r)},${f(a[1])} a${f(r)},${f(r)} 0 1 0 ${f(2 * r)},0 a${f(r)},${f(r)} 0 1 0 ${f(-2 * r)},0 Z`;
  }
  const ux = dx / L;
  const uy = dy / L;
  const nx = -uy;
  const ny = ux;
  const at = (t: number, r: number, k: 1 | -1): Vec => [a[0] + ux * t * L + nx * r * k, a[1] + uy * t * L + ny * r * k];
  const left = stops.map(([t, r]) => at(t, r, 1));
  const right = stops.map(([t, r]) => at(t, r, -1));
  const r0 = stops[0][1];
  const r1 = stops[stops.length - 1][1];
  return (
    `M${P(left[0])} ` +
    left.slice(1).map((p) => `L${P(p)}`).join(' ') +
    ` A${f(r1)},${f(r1)} 0 0 0 ${P(right[right.length - 1])} ` +
    right.slice(0, -1).reverse().map((p) => `L${P(p)}`).join(' ') +
    ` A${f(r0)},${f(r0)} 0 0 0 ${P(left[0])} Z`
  );
}

/** Closed smooth curve (Catmull-Rom) through the points. */
export function smoothClosed(pts: Vec[]): string {
  const n = pts.length;
  if (n < 3) return '';
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Vec = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Vec = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${P(c1)} ${P(c2)} ${P(p2)}`;
  }
  return `${d} Z`;
}

const profileFor = (seg: SegmentId): Stop[] => {
  if (seg === 'neck') return LIMB_PROFILE.neck;
  const k = seg.slice(0, 2) as 'ua' | 'fa' | 'th' | 'sh' | 'ft';
  return LIMB_PROFILE[k] ?? LIMB_PROFILE.fa;
};

export interface LimbShapeProps {
  seg: SegmentId;
  a: Vec;
  b: Vec;
  far?: boolean;
  ghost?: boolean;
  worked?: boolean;
  /** 0..1 strength of the worked-muscle glow */
  glow?: number;
  ids: string;
}

/** One limb segment: muscle-shaped tube, plus the hand, shoe or shorts leg that belongs to it. */
export function LimbShape({ seg, a, b, far = false, ghost = false, worked = false, glow = 1, ids }: LimbShapeProps) {
  const kind = seg === 'neck' ? 'neck' : seg.slice(0, 2);
  const skin = ghost ? FIG.ghost : far ? FIG.skinFar : FIG.skin;
  const stroke = ghost ? 'none' : FIG.outline;
  if (kind === 'ft') {
    // shoe: starts a little behind the ankle (the heel) and runs to the toe
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const heel: Vec = [a[0] - ((b[0] - a[0]) / L) * 2.6, a[1] - ((b[1] - a[1]) / L) * 2.6];
    const d = tubePath(heel, b, LIMB_PROFILE.ft);
    return <path d={d} fill={ghost ? FIG.ghost : far ? FIG.shoeFar : FIG.shoe} stroke={stroke} strokeWidth={1.1} strokeLinejoin="round" data-part="shoe" />;
  }
  const d = tubePath(a, b, profileFor(seg));
  const shortsEnd: Vec = [a[0] + (b[0] - a[0]) * SHORTS_REACH, a[1] + (b[1] - a[1]) * SHORTS_REACH];
  return (
    <g>
      <path d={d} fill={skin} stroke={stroke} strokeWidth={1.2} strokeLinejoin="round" />
      {kind === 'fa' && <circle cx={b[0]} cy={b[1]} r={HAND_R} fill={skin} stroke={stroke} strokeWidth={1.1} data-part="hand" />}
      {!ghost && worked && <path d={d} fill={far ? FIG.workedFar : FIG.worked} opacity={0.3 + 0.6 * glow} filter={`url(#${ids}-glow)`} data-worked={seg} />}
      {kind === 'th' && !ghost && (
        <path d={tubePath(a, shortsEnd, LIMB_PROFILE.shorts)} fill={far ? FIG.shortsFar : FIG.shorts} stroke={stroke} strokeWidth={1.1} strokeLinejoin="round" data-part="shorts" />
      )}
    </g>
  );
}

export interface HeadShapeProps {
  /** head centre on screen */
  c: Vec;
  /** screen offset of one head-radius toward the face; null when the back of the head faces the camera */
  face: Vec | null;
  /** screen offset of one head-radius toward the crown */
  crown: Vec;
  ghost?: boolean;
  far?: boolean;
  faceTestId?: string;
}

/** Head: hair, face and a nose that shows which way the lifter looks. */
export function HeadShape({ c, face, crown, ghost = false, far = false, faceTestId }: HeadShapeProps) {
  const R = BONES.headRadius;
  if (ghost) return <circle cx={c[0]} cy={c[1]} r={R} fill={FIG.ghost} />;
  const skin = far ? FIG.skinFar : FIG.skin;
  const hair = far ? FIG.hairFar : FIG.hair;
  // the face sits toward where the lifter looks and a little below the crown, leaving the hair showing
  const fc: Vec | null = face ? [c[0] + face[0] * 0.26 - crown[0] * 0.14, c[1] + face[1] * 0.26 - crown[1] * 0.14] : null;
  const nose: Vec | null = face ? [c[0] + face[0] * 0.93 - crown[0] * 0.1, c[1] + face[1] * 0.93 - crown[1] * 0.1] : null;
  const sideOn = face ? Math.hypot(face[0], face[1]) / R : 0;
  return (
    <g data-part="head">
      {nose && sideOn > 0.35 && <circle cx={nose[0]} cy={nose[1]} r={2.1} fill={skin} stroke={FIG.outline} strokeWidth={1.1} />}
      <circle cx={c[0]} cy={c[1]} r={R} fill={hair} stroke={FIG.outline} strokeWidth={1.3} />
      {fc && <circle cx={fc[0]} cy={fc[1]} r={6.9} fill={skin} />}
      {nose && sideOn > 0.35 && <circle cx={nose[0]} cy={nose[1]} r={1.5} fill={skin} />}
      {nose && <circle cx={nose[0]} cy={nose[1]} r={0.01} fill="none" data-testid={faceTestId} />}
    </g>
  );
}
