// src/domain/motionRig.ts
/**
 * 2-D side-view motion rig for the exercise demonstrations.
 *
 * A pose is a hip position, a torso and head angle, and one spec per limb. A limb is either
 * given as two joint angles or as a target point for the hand/ankle, which is solved with
 * two-bone inverse kinematics. Bone lengths therefore never change, planted feet stay planted,
 * and anything held in the hands follows a real path between keyframes.
 *
 * Screen coordinates: x right, y down. Angles in degrees: 0 = right, 90 = down, -90 = up.
 */

export type Vec = [number, number];

export type JointId =
  | 'hip'
  | 'neck'
  | 'head'
  | 'elbowN'
  | 'handN'
  | 'elbowF'
  | 'handF'
  | 'kneeN'
  | 'ankleN'
  | 'toeN'
  | 'kneeF'
  | 'ankleF'
  | 'toeF';

export type SegmentId =
  | 'torso'
  | 'neck'
  | 'uaN'
  | 'faN'
  | 'uaF'
  | 'faF'
  | 'thN'
  | 'shN'
  | 'ftN'
  | 'thF'
  | 'shF'
  | 'ftF';

export const BONES = {
  torso: 50,
  neck: 13,
  upperArm: 27,
  forearm: 25,
  thigh: 40,
  shin: 38,
  foot: 14,
  headRadius: 9.5,
} as const;

export const SEGMENTS: Record<SegmentId, [JointId, JointId]> = {
  torso: ['hip', 'neck'],
  neck: ['neck', 'head'],
  uaN: ['neck', 'elbowN'],
  faN: ['elbowN', 'handN'],
  uaF: ['neck', 'elbowF'],
  faF: ['elbowF', 'handF'],
  thN: ['hip', 'kneeN'],
  shN: ['kneeN', 'ankleN'],
  ftN: ['ankleN', 'toeN'],
  thF: ['hip', 'kneeF'],
  shF: ['kneeF', 'ankleF'],
  ftF: ['ankleF', 'toeF'],
};

/** A point given absolutely, or relative to a joint of the same pose (resolved after the torso). */
export type Target = Vec | { rel: 'neck' | 'hip' | 'head'; d: Vec };

export type LimbSpec =
  /** [proximal angle, distal angle] */
  | { a: [number, number] }
  /** hand or ankle target; bend = which side of the line the elbow/knee goes (1 or -1) */
  | { to: Target; bend: 1 | -1 };

export interface PoseSpec {
  hip: Vec;
  torso: number;
  head: number;
  armN: LimbSpec;
  armF?: LimbSpec;
  legN: LimbSpec;
  legF?: LimbSpec;
  footN?: number;
  footF?: number;
  /** shoulder-girdle elevation: raises the shoulders this far above the torso top (passive hang) */
  shrug?: number;
}

export type Skeleton = Record<JointId, Vec>;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
export const polar = (from: Vec, angle: number, len: number): Vec => [
  from[0] + Math.cos(rad(angle)) * len,
  from[1] + Math.sin(rad(angle)) * len,
];
export const angleOf = (from: Vec, to: Vec) => deg(Math.atan2(to[1] - from[1], to[0] - from[0]));
export const dist = (a: Vec, b: Vec) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpVec = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Shortest-path angle interpolation */
export function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a) % 360 + 540) % 360 - 180;
  return a + d * t;
}

/**
 * Two-bone IK. Returns [proximal angle, distal angle]. If the target is out of reach the limb
 * straightens toward it; if it is too close the limb folds as far as it can.
 */
export function solveTwoBone(root: Vec, target: Vec, l1: number, l2: number, bend: 1 | -1): [number, number] {
  const base = angleOf(root, target);
  const d = Math.min(Math.max(dist(root, target), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.0001);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const a = deg(Math.acos(Math.min(1, Math.max(-1, cosA))));
  const proximal = base - bend * a;
  const elbow = polar(root, proximal, l1);
  const reach = polar(root, base, d);
  return [proximal, angleOf(elbow, reach)];
}

function resolveTarget(t: Target, sk: Partial<Skeleton>): Vec {
  if (Array.isArray(t)) return t;
  const j = sk[t.rel] as Vec;
  return [j[0] + t.d[0], j[1] + t.d[1]];
}

function limbAngles(spec: LimbSpec, root: Vec, l1: number, l2: number, sk: Partial<Skeleton>): [number, number] {
  if ('a' in spec) return spec.a;
  return solveTwoBone(root, resolveTarget(spec.to, sk), l1, l2, spec.bend);
}

/** Forward kinematics from a pose spec. */
export function buildSkeleton(p: PoseSpec): Skeleton {
  const sk: Partial<Skeleton> = {};
  sk.hip = p.hip;
  const shrug = p.shrug ?? 0;
  sk.neck = polar(p.hip, p.torso, BONES.torso + shrug);
  sk.head = polar(sk.neck, p.head, BONES.neck - shrug);

  const arm = (spec: LimbSpec, e: 'elbowN' | 'elbowF', h: 'handN' | 'handF') => {
    const [a1, a2] = limbAngles(spec, sk.neck!, BONES.upperArm, BONES.forearm, sk);
    sk[e] = polar(sk.neck!, a1, BONES.upperArm);
    sk[h] = polar(sk[e]!, a2, BONES.forearm);
  };
  const leg = (spec: LimbSpec, foot: number, k: 'kneeN' | 'kneeF', an: 'ankleN' | 'ankleF', to: 'toeN' | 'toeF') => {
    const [a1, a2] = limbAngles(spec, sk.hip!, BONES.thigh, BONES.shin, sk);
    sk[k] = polar(sk.hip!, a1, BONES.thigh);
    sk[an] = polar(sk[k]!, a2, BONES.shin);
    sk[to] = polar(sk[an]!, foot, BONES.foot);
  };

  arm(p.armN, 'elbowN', 'handN');
  arm(p.armF ?? p.armN, 'elbowF', 'handF');
  leg(p.legN, p.footN ?? 0, 'kneeN', 'ankleN', 'toeN');
  leg(p.legF ?? p.legN, p.footF ?? p.footN ?? 0, 'kneeF', 'ankleF', 'toeF');
  return sk as Skeleton;
}

function lerpTarget(a: Target, b: Target, t: number): Target | null {
  if (Array.isArray(a) && Array.isArray(b)) return lerpVec(a, b, t);
  if (!Array.isArray(a) && !Array.isArray(b) && a.rel === b.rel) return { rel: a.rel, d: lerpVec(a.d, b.d, t) };
  return null;
}

function lerpLimb(
  a: LimbSpec,
  b: LimbSpec,
  t: number,
  rootA: Vec,
  rootB: Vec,
  l1: number,
  l2: number,
  skA: Skeleton,
  skB: Skeleton
): LimbSpec {
  if ('to' in a && 'to' in b) {
    const tt = lerpTarget(a.to, b.to, t);
    if (tt) return { to: tt, bend: t < 0.5 ? a.bend : b.bend };
  }
  if ('a' in a && 'a' in b) {
    return { a: [lerpAngle(a.a[0], b.a[0], t), lerpAngle(a.a[1], b.a[1], t)] };
  }
  const aa = limbAngles(a, rootA, l1, l2, skA);
  const bb = limbAngles(b, rootB, l1, l2, skB);
  return { a: [lerpAngle(aa[0], bb[0], t), lerpAngle(aa[1], bb[1], t)] };
}

/** Interpolate two pose specs (targets in target space, angles in angle space). */
export function lerpPose(a: PoseSpec, b: PoseSpec, t: number): PoseSpec {
  const skA = buildSkeleton(a);
  const skB = buildSkeleton(b);
  const armL = [BONES.upperArm, BONES.forearm] as const;
  const legL = [BONES.thigh, BONES.shin] as const;
  return {
    hip: lerpVec(a.hip, b.hip, t),
    torso: lerpAngle(a.torso, b.torso, t),
    head: lerpAngle(a.head, b.head, t),
    armN: lerpLimb(a.armN, b.armN, t, skA.neck, skB.neck, ...armL, skA, skB),
    armF: lerpLimb(a.armF ?? a.armN, b.armF ?? b.armN, t, skA.neck, skB.neck, ...armL, skA, skB),
    legN: lerpLimb(a.legN, b.legN, t, skA.hip, skB.hip, ...legL, skA, skB),
    legF: lerpLimb(a.legF ?? a.legN, b.legF ?? b.legN, t, skA.hip, skB.hip, ...legL, skA, skB),
    footN: lerpAngle(a.footN ?? 0, b.footN ?? 0, t),
    footF: lerpAngle(a.footF ?? a.footN ?? 0, b.footF ?? b.footN ?? 0, t),
    shrug: lerp(a.shrug ?? 0, b.shrug ?? 0, t),
  };
}

/** Keyframes at positions 0..1 along the start → end movement. */
export interface Keyframe {
  at: number;
  pose: PoseSpec;
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Pose at movement progress p (0 = start position, 1 = end position). */
export function poseAt(frames: Keyframe[], p: number): PoseSpec {
  const x = Math.min(1, Math.max(0, p));
  for (let i = 1; i < frames.length; i++) {
    if (x <= frames[i].at) {
      const a = frames[i - 1];
      const b = frames[i];
      const local = b.at === a.at ? 1 : (x - a.at) / (b.at - a.at);
      return lerpPose(a.pose, b.pose, local);
    }
  }
  return frames[frames.length - 1].pose;
}

/** Interior angle at joint b (degrees, 0–180). */
export function jointAngle(a: Vec, b: Vec, c: Vec): number {
  const v1 = [a[0] - b[0], a[1] - b[1]];
  const v2 = [c[0] - b[0], c[1] - b[1]];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const m = Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]) || 1;
  return deg(Math.acos(Math.min(1, Math.max(-1, dot / m))));
}

// ---------------------------------------------------------------------------
// Tempo timeline
// ---------------------------------------------------------------------------

/**
 * eccentric-first: start = lockout, end = stretched (squat, bench, RDL)
 * concentric-first: start = stretched, end = contracted (pull-up, press, curl)
 * hold: move into an isometric position and hold it
 * cycle: alternating stride (walks, carries)
 * loop: continuous circle; keyframes must end where they start
 */
export type MotionOrder = 'eccentric-first' | 'concentric-first' | 'hold' | 'cycle' | 'loop';
export type SegmentKind = 'holdStart' | 'toEnd' | 'holdEnd' | 'toStart' | 'loop';

export interface TimelineSegment {
  kind: SegmentKind;
  seconds: number;
  /** what the lifter is doing: drives the label and the muscle-load glow */
  action: 'eccentric' | 'concentric' | 'pause' | 'hold' | 'move';
  label: string;
  /** tempo digit as written (e.g. "3", "X") or null */
  tempoChar: string | null;
}

export const EXPLOSIVE_SECONDS = 0.8;
const MIN_MOVE_SECONDS = 0.6;
const MIN_PAUSE_SECONDS = 0.25;

function tempoSeconds(ch: string | undefined, fallback: number): number {
  if (!ch) return fallback;
  if (/x/i.test(ch)) return EXPLOSIVE_SECONDS;
  const n = parseInt(ch, 10);
  return isNaN(n) ? fallback : n;
}

/**
 * Build the loop: hold at start → move to end → hold at end → move back.
 * Tempo is read as eccentric / bottom pause / concentric / top pause (e.g. "30X1").
 */
export function buildTimeline(tempo: string | undefined, order: MotionOrder): TimelineSegment[] {
  const t = (tempo || '').replace(/[^0-9xX]/g, '');
  const ecc = Math.max(MIN_MOVE_SECONDS, tempoSeconds(t[0], 2));
  const pauseBottom = tempoSeconds(t[1], 0);
  const con = Math.max(MIN_MOVE_SECONDS, tempoSeconds(t[2], 1));
  const pauseTop = tempoSeconds(t[3], 1);
  const ch = (i: number) => (t[i] ? t[i].toUpperCase() : null);

  if (order === 'loop') {
    return [{ kind: 'loop', seconds: 3.2, action: 'move', label: 'Continuous circle', tempoChar: null }];
  }
  if (order === 'cycle') {
    return [
      { kind: 'holdStart', seconds: 0.2, action: 'pause', label: 'Plant', tempoChar: null },
      { kind: 'toEnd', seconds: 0.9, action: 'move', label: 'Step', tempoChar: null },
      { kind: 'holdEnd', seconds: 0.2, action: 'pause', label: 'Plant', tempoChar: null },
      { kind: 'toStart', seconds: 0.9, action: 'move', label: 'Step', tempoChar: null },
    ];
  }
  if (order === 'hold') {
    return [
      { kind: 'holdStart', seconds: 0.9, action: 'pause', label: 'Set up', tempoChar: null },
      { kind: 'toEnd', seconds: 1.2, action: 'move', label: 'Move into position', tempoChar: null },
      { kind: 'holdEnd', seconds: 2.6, action: 'hold', label: 'Hold', tempoChar: null },
      { kind: 'toStart', seconds: 1.1, action: 'move', label: 'Release', tempoChar: null },
    ];
  }
  if (order === 'eccentric-first') {
    return [
      { kind: 'holdStart', seconds: Math.max(MIN_PAUSE_SECONDS, pauseTop), action: 'pause', label: 'Top', tempoChar: ch(3) },
      { kind: 'toEnd', seconds: ecc, action: 'eccentric', label: 'Lower', tempoChar: ch(0) },
      { kind: 'holdEnd', seconds: Math.max(MIN_PAUSE_SECONDS, pauseBottom), action: 'pause', label: 'Bottom', tempoChar: ch(1) },
      { kind: 'toStart', seconds: con, action: 'concentric', label: 'Drive', tempoChar: ch(2) },
    ];
  }
  // concentric-first: start position is the stretched end (hang, rack, arms long)
  return [
    { kind: 'holdStart', seconds: Math.max(MIN_PAUSE_SECONDS, pauseBottom), action: 'pause', label: 'Stretch', tempoChar: ch(1) },
    { kind: 'toEnd', seconds: con, action: 'concentric', label: 'Lift', tempoChar: ch(2) },
    { kind: 'holdEnd', seconds: Math.max(MIN_PAUSE_SECONDS, pauseTop), action: 'pause', label: 'Squeeze', tempoChar: ch(3) },
    { kind: 'toStart', seconds: ecc, action: 'eccentric', label: 'Lower', tempoChar: ch(0) },
  ];
}

export function timelineDuration(tl: TimelineSegment[]): number {
  return tl.reduce((a, s) => a + s.seconds, 0);
}

export interface TimelineState {
  index: number;
  segment: TimelineSegment;
  /** 0..1 inside the current segment */
  local: number;
  /** movement progress 0 (start pose) .. 1 (end pose), eased */
  progress: number;
  /** 0..1 muscle load for the glow */
  load: number;
}

export function timelineAt(tl: TimelineSegment[], seconds: number): TimelineState {
  const total = timelineDuration(tl);
  let s = ((seconds % total) + total) % total;
  for (let i = 0; i < tl.length; i++) {
    const seg = tl[i];
    if (s <= seg.seconds || i === tl.length - 1) {
      const local = seg.seconds > 0 ? Math.min(1, s / seg.seconds) : 1;
      let progress = 0;
      if (seg.kind === 'loop') progress = local;
      else if (seg.kind === 'toEnd') progress = easeInOut(local);
      else if (seg.kind === 'holdEnd') progress = 1;
      else if (seg.kind === 'toStart') progress = 1 - easeInOut(local);
      const load =
        seg.action === 'concentric'
          ? 1
          : seg.action === 'eccentric'
          ? 0.75
          : seg.action === 'hold'
          ? 0.9
          : seg.kind === 'loop' || seg.action === 'move'
          ? 0.7
          : progress > 0.5
          ? 0.6
          : 0.2;
      return { index: i, segment: seg, local, progress, load };
    }
    s -= seg.seconds;
  }
  return { index: 0, segment: tl[0], local: 0, progress: 0, load: 0.2 };
}
