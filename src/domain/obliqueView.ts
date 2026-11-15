// src/domain/obliqueView.ts
/**
 * 3-D camera angles for the exercise demonstrations: front three-quarter, rear three-quarter and
 * top-down.
 *
 * Every joint gets a 3-D point: depth (x) and height (y) come from the side-view skeleton, the
 * lateral offset (z) from the front/back config. Hands and feet sit exactly where both 2-D views put
 * them; elbows and knees are re-solved with 3-D two-bone IK so every bone keeps its true length.
 * When a wide grip or stance puts a hand or foot just out of reach, the shoulder (or hip socket)
 * slides toward it by the shortfall: the girdle moves, the contact does not.
 *
 * World axes: x = side-view depth (lifter faces +x), y = height (screen down, floor y = 180),
 * z = lateral (+ = lifter's left, side "F"; - = lifter's right, side "N", the side the side view shows).
 * Because everything is derived from the same side-view skeleton, all views are always in phase.
 */
import type { DiagramType } from './exerciseVisualsData';
import { BONES, buildSkeleton, poseAt, type JointId, type SegmentId, type Skeleton, type Vec } from './motionRig';
import { FLOOR_Y, type MotionDef, type PropDef } from './motionLibrary';
import { CX, hipDropAt, latFor, shiftAt, type FrontalConfig, type LatJoint, type Side } from './frontalView';

export type Vec3 = [number, number, number];
export type ObliqueCamera = 'front45' | 'rear45' | 'top';
export const OBLIQUE_CAMERAS: ObliqueCamera[] = ['front45', 'rear45', 'top'];

export const CAMERA_LABEL: Record<ObliqueCamera, string> = {
  front45: '¾ Front',
  rear45: '¾ Rear',
  top: 'Top',
};

// ---------------------------------------------------------------------------
// Vector helpers
// ---------------------------------------------------------------------------

export const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale3 = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len3 = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const dist3 = (a: Vec3, b: Vec3) => len3(sub3(a, b));
export const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm3 = (a: Vec3): Vec3 => {
  const l = len3(a);
  return l > 1e-9 ? scale3(a, 1 / l) : [1, 0, 0];
};

/**
 * 3-D two-bone IK. The middle joint (elbow/knee) is placed on the side of the root-target line the
 * pole points to. If the target is out of reach, the root slides toward it so the end still lands.
 */
export function solveTwoBone3(root: Vec3, target: Vec3, l1: number, l2: number, pole: Vec3): { root: Vec3; mid: Vec3 } {
  let r = root;
  let d = sub3(target, r);
  let L = len3(d);
  const maxR = l1 + l2 - 1e-6;
  const minR = Math.abs(l1 - l2) + 1e-3;
  if (L > maxR) {
    r = add3(r, scale3(d, (L - maxR) / L));
  } else if (L < minR) {
    r = sub3(target, scale3(norm3(d), minR));
  }
  d = sub3(target, r);
  L = len3(d);
  const dir = scale3(d, 1 / L);
  const a = (l1 * l1 + L * L - l2 * l2) / (2 * L);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const pv = sub3(pole, r);
  let perp = sub3(pv, scale3(dir, dot3(pv, dir)));
  if (len3(perp) < 1e-6) {
    perp = cross3(dir, [0, 0, 1]);
    if (len3(perp) < 1e-6) perp = [1, 0, 0];
  }
  perp = norm3(perp);
  return { root: r, mid: add3(add3(r, scale3(dir, a)), scale3(perp, h)) };
}

// ---------------------------------------------------------------------------
// 3-D skeleton
// ---------------------------------------------------------------------------

type SidedJoint = 'shoulder' | 'elbow' | 'hand' | 'hip' | 'knee' | 'ankle' | 'toe' | 'scap';
export type Joint3 = 'pelvis' | 'neck' | 'head' | `${SidedJoint}${Side}`;

export interface Skeleton3 {
  j: Record<Joint3, Vec3>;
  /** unit vector pelvis -> neck */
  up: Vec3;
  /** unit vector the chest faces */
  forward: Vec3;
  /** unit vector the face looks along */
  face: Vec3;
  progress: number;
}

/** Every rigid bone of the 3-D figure and its length. */
export const LIMBS3: { seg: SegmentId; a: Joint3; b: Joint3; len: number }[] = (['N', 'F'] as Side[]).flatMap((s) => [
  { seg: `ua${s}` as SegmentId, a: `shoulder${s}` as Joint3, b: `elbow${s}` as Joint3, len: BONES.upperArm },
  { seg: `fa${s}` as SegmentId, a: `elbow${s}` as Joint3, b: `hand${s}` as Joint3, len: BONES.forearm },
  { seg: `th${s}` as SegmentId, a: `hip${s}` as Joint3, b: `knee${s}` as Joint3, len: BONES.thigh },
  { seg: `sh${s}` as SegmentId, a: `knee${s}` as Joint3, b: `ankle${s}` as Joint3, len: BONES.shin },
  { seg: `ft${s}` as SegmentId, a: `ankle${s}` as Joint3, b: `toe${s}` as Joint3, len: BONES.foot },
]);

export function build3D(sk: Skeleton, cfg: FrontalConfig, progress: number): Skeleton3 {
  const z = (jt: LatJoint, s: Side) => (s === 'N' ? -1 : 1) * latFor(cfg, jt, s, progress);
  const at = (v: Vec, zz: number): Vec3 => [v[0], v[1], zz];
  // the body can slide sideways over planted feet (Cossack squat) and the free hip can drop (pelvic leveling)
  const sh = shiftAt(cfg, progress);
  const drop = hipDropAt(cfg, progress);
  const j = {} as Record<Joint3, Vec3>;
  j.pelvis = at(sk.hip, sh);
  j.neck = at(sk.neck, sh);
  j.head = at(sk.head, sh);
  const up = norm3(sub3(j.neck, j.pelvis));
  // chest faces "up" rotated a quarter turn toward the lifter's front (cross of +z and up)
  const forward: Vec3 = [-up[1], up[0], 0];
  const hv = norm3(sub3(j.head, j.neck));
  const face: Vec3 = [-hv[1], hv[0], 0];

  (['N', 'F'] as Side[]).forEach((s) => {
    const hand = at(sk[`hand${s}`], z('hand', s) + sh);
    const arm = solveTwoBone3(at(sk.neck, z('shoulder', s) + sh), hand, BONES.upperArm, BONES.forearm, at(sk[`elbow${s}`], z('elbow', s) + sh));
    j[`shoulder${s}`] = arm.root;
    j[`elbow${s}`] = arm.mid;
    j[`hand${s}`] = hand;

    const ankle = at(sk[`ankle${s}`], z('ankle', s));
    const socket = add3(at(sk.hip, z('hip', s) + sh), [0, s === 'F' ? drop : 0, 0]);
    const leg = solveTwoBone3(socket, ankle, BONES.thigh, BONES.shin, at(sk[`knee${s}`], z('knee', s) + sh));
    j[`hip${s}`] = leg.root;
    j[`knee${s}`] = leg.mid;
    j[`ankle${s}`] = ankle;
    const toeRaw = at(sk[`toe${s}`], z('toe', s));
    j[`toe${s}`] = add3(ankle, scale3(norm3(sub3(toeRaw, ankle)), BONES.foot));

    j[`scap${s}`] = add3(add3(sub3(j.neck, scale3(up, 9)), scale3(forward, -7)), [0, 0, z('scap', s)]);
  });
  return { j, up, forward, face, progress };
}

export const jointTo3 = (jt: JointId): Joint3 => (jt === 'hip' ? 'pelvis' : (jt as Joint3));

// ---------------------------------------------------------------------------
// Cameras
// ---------------------------------------------------------------------------

export interface P2 {
  p: Vec;
  /** distance toward the camera: larger = nearer, drawn later */
  d: number;
}

export interface Projector {
  cam: ObliqueCamera;
  x0: number;
  /** unit vector from the scene toward the camera */
  toCamera: Vec3;
  project: (p: Vec3) => P2;
}

/** Vertical centre of the 0 -24 200 216 view box, used as the top view's origin. */
export const TOP_V0 = 84;

export function projector(cam: ObliqueCamera, x0: number, zoom = 1): Projector {
  if (cam === 'top') {
    // looking straight down, lifter facing up the screen, lifter's right on the screen's right;
    // zoomed in, since a body seen from above is much smaller than seen from the side
    return {
      cam,
      x0,
      toCamera: [0, -1, 0],
      project: (p) => ({ p: [CX - zoom * p[2], TOP_V0 - zoom * (p[0] - x0)], d: -p[1] }),
    };
  }
  // yaw 0 would be the side view (camera on the lifter's right), 90 the front view, -90 the back view;
  // the camera also looks down a little so the floor, bar and bench read as 3-D
  const t = ((cam === 'front45' ? 45 : -45) * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const ce = Math.cos(ELEVATION);
  const se = Math.sin(ELEVATION);
  return {
    cam,
    x0,
    toCamera: [s * ce, -se, -c * ce],
    project: (p) => {
      const u = (p[0] - x0) * c + p[2] * s;
      const h = (p[0] - x0) * s - p[2] * c; // horizontal distance toward the camera
      const y = p[1] - TOP_V0;
      // lifted a few units so long bodies lying on the floor stay in frame
      return { p: [CX + u, TOP_V0 - LIFT + y * ce + h * se], d: h * ce - y * se };
    },
  };
}

const LIFT = 3;

/** How far the 3/4 cameras look down (radians). */
export const ELEVATION = (16 * Math.PI) / 180;

const PIVOT_CACHE = new WeakMap<MotionDef, number>();

/** Depth the camera turns around: the middle of everything the body reaches during the rep. */
export function pivotX(m: MotionDef): number {
  const hit = PIVOT_CACHE.get(m);
  if (hit !== undefined) return hit;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i <= 10; i++) {
    const sk = buildSkeleton(poseAt(m.frames, i / 10));
    Object.values(sk).forEach(([x]) => {
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    });
  }
  const x0 = (lo + hi) / 2;
  PIVOT_CACHE.set(m, x0);
  return x0;
}

const TOP_CACHE = new WeakMap<MotionDef, { x0: number; zoom: number }>();

/** Top view framing: centre on everything seen from above (body, implements, equipment) and zoom to fill. */
export function topFraming(m: MotionDef, cfg: FrontalConfig, scene: Scene3[] = []): { x0: number; zoom: number } {
  const hit = TOP_CACHE.get(m);
  if (hit) return hit;
  let x0 = Infinity;
  let x1 = -Infinity;
  let zMax = 0;
  const take = (p: Vec3) => {
    x0 = Math.min(x0, p[0]);
    x1 = Math.max(x1, p[0]);
    zMax = Math.max(zMax, Math.abs(p[2]));
  };
  for (let i = 0; i <= 16; i++) {
    const p = i / 16;
    const sk = buildSkeleton(poseAt(m.frames, p));
    const s3 = build3D(sk, cfg, p);
    Object.values(s3.j).forEach(take);
    props3D(m, cfg, sk, s3).forEach((pr) => {
      if (pr.kind === 'bar') {
        take(add3(pr.c, [0, 0, pr.half]));
        take(add3(pr.c, [0, 0, -pr.half]));
      } else if (pr.kind === 'club') take(pr.tip);
      else if (pr.kind === 'cable') take(pr.anchor);
      else take(pr.c);
    });
  }
  scene.forEach((s) => {
    if (s.kind === 'box' && s.tone !== 'wall') {
      take(s.min);
      take(s.max);
    } else if (s.kind === 'rod') {
      take(s.a);
      take(s.b);
    } else if (s.kind === 'wheel') take(s.c);
  });
  const span = Math.max(x1 - x0, 2 * zMax, 40);
  const out = { x0: (x0 + x1) / 2, zoom: Math.min(2.2, Math.max(1, 150 / span)) };
  TOP_CACHE.set(m, out);
  return out;
}

/** The camera for an exercise and angle, framed the same way everywhere (figure and tests). */
export function cameraFor(m: MotionDef, type: DiagramType | string, cfg: FrontalConfig, cam: ObliqueCamera): Projector {
  if (cam === 'top') {
    const f = topFraming(m, cfg, SCENE3D[type as DiagramType] ?? []);
    return projector('top', f.x0, f.zoom);
  }
  return projector(cam, pivotX(m));
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type Prop3 =
  /** straight bar along z, centred on c */
  | { kind: 'bar'; c: Vec3; half: number }
  | { kind: 'kettlebell'; c: Vec3; ball?: boolean }
  /** dumbbell handle along z */
  | { kind: 'dumbbell'; c: Vec3 }
  | { kind: 'club'; hand: Vec3; tip: Vec3 }
  | { kind: 'cable'; anchor: Vec3; hands: Vec3[] };

/** Same rule as the side view's prop placement. */
export function sidePropCenter(p: PropDef, sk: Skeleton, progress: number): Vec {
  if (p.kind === 'cable') return sk[p.at];
  if (p.kind === 'club') return sk[p.at];
  const d = p.d ?? [0, 0];
  const h = p.kind === 'kettlebell' ? p.handoff : undefined;
  const j = h && progress > h.from && progress <= h.to ? sk[h.at] : sk[p.at];
  return [j[0] + d[0], j[1] + d[1]];
}

/**
 * The frontal config lists every implement (both bells of a floor press, both cable handles);
 * the side view supplies depth and height offsets.
 */
export function props3D(m: MotionDef, cfg: FrontalConfig, sk: Skeleton, s3: Skeleton3): Prop3[] {
  // the frontal config's screen offsets turn into lateral offsets
  const latSign = cfg.view === 'front' ? 1 : -1;
  const out: Prop3[] = [];
  cfg.props.forEach((fp) => {
    switch (fp.kind) {
      case 'bar': {
        const sp = m.props.find((p) => p.kind === 'barbell');
        let c: Vec3;
        if (sp) {
          const v = sidePropCenter(sp, sk, s3.progress);
          c = [v[0], v[1], 0];
        } else if (fp.at === 'neck') {
          c = [sk.neck[0] - 3, sk.neck[1] + (fp.dy ?? 0), 0];
        } else {
          const a = s3.j.handN;
          const b = s3.j.handF;
          c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (fp.dy ?? 0), 0];
        }
        out.push({ kind: 'bar', c, half: fp.half });
        break;
      }
      case 'kettlebell':
      case 'dumbbell': {
        const ho = fp.kind === 'kettlebell' ? fp.handoff : undefined;
        const side = ho && s3.progress > ho.from && s3.progress <= ho.to ? ho.side : fp.side;
        const sp = m.props.find((p) => p.kind === fp.kind);
        const sd: Vec = sp && 'd' in sp && sp.d ? sp.d : [0, 0];
        const fd: Vec = fp.d ?? [0, 0];
        const hand = s3.j[`hand${side}`];
        const c: Vec3 = [hand[0] + sd[0], hand[1] + sd[1], hand[2] + latSign * fd[0]];
        out.push(fp.kind === 'kettlebell' && fp.ball ? { kind: 'kettlebell', c, ball: true } : { kind: fp.kind, c });
        break;
      }
      case 'club': {
        const hand = s3.j[`hand${fp.side}`];
        const elbow = s3.j[`elbow${fp.side}`];
        out.push({ kind: 'club', hand, tip: add3(hand, scale3(norm3(sub3(hand, elbow)), fp.len)) });
        break;
      }
      case 'cable': {
        const sp = m.props.find((p) => p.kind === 'cable');
        const a: Vec = sp && sp.kind === 'cable' ? sp.anchor : [fp.anchor[0], fp.anchor[1]];
        out.push({
          kind: 'cable',
          anchor: [a[0], a[1], latSign * (fp.anchor[0] - CX)],
          hands: fp.sides.map((sd) => s3.j[`hand${sd}`]),
        });
        break;
      }
    }
  });
  return out;
}

/** The point the side view traces, in 3-D. */
export function track3D(m: MotionDef, sk: Skeleton, s3: Skeleton3, props: Prop3[]): Vec3 {
  if ('joint' in m.track) return s3.j[jointTo3(m.track.joint)];
  const sp = m.props[m.track.prop];
  const find = <K extends Prop3['kind']>(k: K) => props.find((p) => p.kind === k) as Extract<Prop3, { kind: K }> | undefined;
  if (sp) {
    if (sp.kind === 'barbell') {
      const b = find('bar');
      if (b) return b.c;
    } else if (sp.kind === 'kettlebell' || sp.kind === 'dumbbell') {
      const b = find(sp.kind);
      if (b) return b.c;
    } else if (sp.kind === 'club') {
      const c = find('club');
      if (c) return c.tip;
    } else if (sp.kind === 'cable') {
      return s3.j[jointTo3(sp.at)];
    }
    const v = sidePropCenter(sp, sk, s3.progress);
    return [v[0], v[1], 0];
  }
  return s3.j.pelvis;
}

// ---------------------------------------------------------------------------
// Scenery
// ---------------------------------------------------------------------------

export type Scene3 =
  | { kind: 'box'; min: Vec3; max: Vec3; tone: 'pad' | 'steel' | 'wall' | 'plate' }
  | { kind: 'rod'; a: Vec3; b: Vec3; w: number; tone: 'steel' | 'bar' }
  /** a disc standing in the x-y plane (pulleys, flywheel) */
  | { kind: 'wheel'; c: Vec3; r: number };

const bench = (x: number, y: number, w: number, z0 = -16, z1 = 16): Scene3[] => {
  const legs: Scene3[] = [];
  for (const lx of [x + 10, x + w - 10]) {
    for (const lz of [z0 + 4, z1 - 4]) legs.push({ kind: 'rod', a: [lx, y + 8, lz], b: [lx, FLOOR_Y, lz], w: 3.5, tone: 'steel' });
  }
  return [...legs, { kind: 'box', min: [x, y, z0], max: [x + w, y + 9, z1], tone: 'pad' }];
};

const pullBar: Scene3[] = [
  { kind: 'rod', a: [100, 0, -52], b: [100, 0, 52], w: 3.5, tone: 'bar' },
  { kind: 'rod', a: [100, 0, -52], b: [100, -30, -52], w: 3, tone: 'steel' },
  { kind: 'rod', a: [100, 0, 52], b: [100, -30, 52], w: 3, tone: 'steel' },
];

const wall = (x0: number, x1: number, y0: number): Scene3 => ({ kind: 'box', min: [x0, y0, -70], max: [x1, FLOOR_Y, 70], tone: 'wall' });

/** Benches, racks, walls and machines with real width, built from the side-view scenery. */
export const SCENE3D: Partial<Record<DiagramType, Scene3[]>> = {
  tibialis: [wall(52, 61, 10)],
  step_down: [{ kind: 'box', min: [76, 166, -30], max: [120, FLOOR_Y, 30], tone: 'plate' }],
  bench_press: bench(28, 129, 112),
  // the rowing arm and standing leg hang off the lifter's right edge of the bench
  kb_row: bench(56, 140, 96, -2, 26),
  face_pull: [
    { kind: 'box', min: [172, 10, -5], max: [182, FLOOR_Y, 5], tone: 'steel' },
    { kind: 'wheel', c: [172, 58, 0], r: 4 },
  ],
  dead_hang: pullBar,
  warmup_dead_hang: pullBar,
  pullup: pullBar,
  hanging_knee_raise: pullBar,
  hanging_corkscrew: pullBar,
  biering_sorensen: [
    ...[40, 96].flatMap((x): Scene3[] => [-10, 10].map((zz) => ({ kind: 'rod', a: [x, 110, zz], b: [x, FLOOR_Y, zz], w: 3.5, tone: 'steel' }))),
    { kind: 'box', min: [24, 102, -15], max: [106, 111, 15], tone: 'pad' },
  ],
  lsit: [-18, 18].flatMap((zz): Scene3[] => [
    { kind: 'rod', a: [72, 166, zz], b: [88, 166, zz], w: 4, tone: 'steel' },
    { kind: 'rod', a: [74, 166, zz], b: [72, FLOOR_Y, zz], w: 3, tone: 'steel' },
    { kind: 'rod', a: [86, 166, zz], b: [88, FLOOR_Y, zz], w: 3, tone: 'steel' },
    { kind: 'rod', a: [70, FLOOR_Y, zz - 6], b: [70, FLOOR_Y, zz + 6], w: 3, tone: 'steel' },
    { kind: 'rod', a: [90, FLOOR_Y, zz - 6], b: [90, FLOOR_Y, zz + 6], w: 3, tone: 'steel' },
  ]),
  warmup_walk: [{ kind: 'box', min: [164, 156, -14], max: [192, FLOOR_Y, 14], tone: 'steel' }],
  warmup_row: [
    { kind: 'rod', a: [36, 164, 0], b: [168, 164, 0], w: 4, tone: 'steel' },
    { kind: 'rod', a: [40, 164, 0], b: [40, FLOOR_Y, 0], w: 3, tone: 'steel' },
    { kind: 'rod', a: [166, 164, 0], b: [166, FLOOR_Y, 0], w: 3, tone: 'steel' },
    { kind: 'rod', a: [32, FLOOR_Y, -12], b: [32, FLOOR_Y, 12], w: 3, tone: 'steel' },
    { kind: 'rod', a: [170, FLOOR_Y, -12], b: [170, FLOOR_Y, 12], w: 3, tone: 'steel' },
    { kind: 'rod', a: [150, 164, -10], b: [150, 164, 10], w: 3, tone: 'steel' },
    { kind: 'rod', a: [150, 164, 0], b: [158, 146, 0], w: 3, tone: 'steel' },
    { kind: 'wheel', c: [176, 146, 0], r: 16 },
  ],
  warmup_90_90: [{ kind: 'box', min: [132, 131, -22], max: [166, FLOOR_Y, 22], tone: 'plate' }],
  warmup_calf: [{ kind: 'box', min: [100, 166, -26], max: [140, FLOOR_Y, 26], tone: 'plate' }],
  warmup_wall_slide: [wall(52, 60, -20)],
};

// ---------------------------------------------------------------------------
// Which angle each exercise opens in
// ---------------------------------------------------------------------------

/** pulls and hinges: the back, the blades and the hip hinge read best from behind */
const REAR_FIRST: DiagramType[] = [
  'rdl',
  'good_morning',
  'kb_row',
  'pullup',
  'face_pull',
  'dead_hang',
  'warmup_dead_hang',
  'warmup_scapular',
  'biering_sorensen',
  'pelvic_drop',
];
/** rotation and foot placement read best from above */
const TOP_FIRST: DiagramType[] = [
  'single_leg_atw',
  'carry',
  'cossack_squat',
  'sp_windshield_wipers',
  'sp_scissors',
  'sp_seated_ab_circles',
  'sp_btb_pass',
];
/** a flexing and extending spine reads best straight from the side */
const SIDE_FIRST: DiagramType[] = ['cat_camel'];

export function defaultCamera(type: DiagramType | string, _exerciseName = ''): ObliqueCamera | 'side' {
  if ((SIDE_FIRST as string[]).includes(type)) return 'side';
  if ((TOP_FIRST as string[]).includes(type)) return 'top';
  if ((REAR_FIRST as string[]).includes(type)) return 'rear45';
  return 'front45';
}

const TOP_CUE: Partial<Record<DiagramType, string>> = {
  single_leg_atw: 'Bell circles the waist; stance foot stays planted',
  carry: 'Feet track straight ahead; bell stays by the hip',
  split_squat: 'Feet on two tracks, about hip-width apart',
  warmup_walk: 'Feet stay hip-width, straps pull straight',
  step_down: 'Stance foot centred on the step',
  core_mcgill: 'Reaching arm and leg stay in line with the spine',
  hanging_corkscrew: 'Knees swing to each side under a still torso',
  cossack_squat: 'Feet stay planted wide; hips slide over one foot',
  pelvic_drop: 'Pelvis level, stance foot centred under the hip',
  mountain_climber: 'Knee crosses under the body; hips stay level',
  sp_windshield_wipers: 'Knees sweep side to side; shoulders stay pinned',
  sp_scissors: 'Legs open wide and cross, top leg switching',
  sp_seated_ab_circles: 'Feet draw a wide circle; torso stays still',
  sp_btb_pass: 'Ball circles the waist; seat stays planted',
};

export function cameraCue(cam: ObliqueCamera, type: DiagramType | string, frontal: FrontalConfig): string {
  if (cam === 'top') return TOP_CUE[type as DiagramType] ?? 'Foot placement and rotation from above';
  return frontal.cue;
}
