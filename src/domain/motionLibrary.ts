// src/domain/motionLibrary.ts
/**
 * Keyframed side-view demonstrations for every DiagramType. Lifter faces right, floor at y = 180.
 * Feet and hands use IK targets, so planted contacts stay put and bars follow a real path.
 */
import type { DiagramType } from './exerciseVisualsData';
import type { JointId, Keyframe, LimbSpec, MotionOrder, PoseSpec, SegmentId, Vec } from './motionRig';

export const FLOOR_Y = 180;

export type PropDef =
  | { kind: 'barbell'; at: JointId; d?: Vec }
  /** handoff: between progress `from` and `to` the bell rides on joint `at` instead (hand-to-hand passes) */
  | { kind: 'kettlebell'; at: JointId; d?: Vec; handoff?: { at: JointId; from: number; to: number } }
  | { kind: 'dumbbell'; at: JointId; d?: Vec }
  | { kind: 'club'; at: JointId; from: JointId; len: number }
  | { kind: 'cable'; anchor: Vec; at: JointId }

export type SceneryDef =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r?: number; tone?: 'pad' | 'steel' | 'wall' | 'plate' }
  | { kind: 'line'; from: Vec; to: Vec; w?: number; tone?: 'steel' | 'wall' }
  | { kind: 'bar'; y: number; x1: number; x2: number }
  | { kind: 'wheel'; c: Vec; r: number };

export type TrackRef = { prop: number } | { joint: JointId };

export interface MotionDef {
  title: string;
  order: MotionOrder;
  frames: Keyframe[];
  props: PropDef[];
  scenery: SceneryDef[];
  worked: SegmentId[];
  track: TrackRef;
  trackLabel: string;
  angle?: { joints: [JointId, JointId, JointId]; label: string };
  /** x of a vertical reference line (bar over mid-foot, stacked jointsâ€¦) */
  plumb?: { x: number; label: string };
  startCue: string;
  endCue: string;
}

// --- helpers ---------------------------------------------------------------
const to = (x: number, y: number, bend: 1 | -1 = 1): LimbSpec => ({ to: [x, y], bend });
const rel = (j: 'neck' | 'hip' | 'head', dx: number, dy: number, bend: 1 | -1 = 1): LimbSpec => ({
  to: { rel: j, d: [dx, dy] },
  bend,
});
const ang = (a: number, b: number): LimbSpec => ({ a: [a, b] });
const kf = (at: number, pose: PoseSpec): Keyframe => ({ at, pose });
const two = (start: PoseSpec, end: PoseSpec): Keyframe[] => [kf(0, start), kf(1, end)];

const benchScenery = (x: number, y: number, w: number): SceneryDef[] => [
  { kind: 'line', from: [x + 10, y + 8], to: [x + 10, FLOOR_Y], w: 4, tone: 'steel' },
  { kind: 'line', from: [x + w - 10, y + 8], to: [x + w - 10, FLOOR_Y], w: 4, tone: 'steel' },
  { kind: 'rect', x, y, w, h: 9, r: 3, tone: 'pad' },
];

const ARMS_DOWN = ang(92, 88);

export const MOTIONS: Record<DiagramType, MotionDef> = {
  squat: {
    title: 'Barbell back squat',
    order: 'eccentric-first',
    frames: two(
      { hip: [96, 98.3], torso: -91, head: -88, armN: rel('neck', -3, -2, 1), legN: to(95, 176), legF: to(92, 176) },
      { hip: [70, 140], torso: -50, head: -62, armN: rel('neck', -3, -2, 1), legN: to(95, 176), legF: to(92, 176) }
    ),
    props: [{ kind: 'barbell', at: 'neck', d: [-3, 2] }],
    scenery: [],
    worked: ['thN', 'thF'],
    track: { prop: 0 },
    trackLabel: 'Bar path',
    angle: { joints: ['hip', 'kneeN', 'ankleN'], label: 'Knee' },
    plumb: { x: 101, label: 'mid-foot' },
    startCue: 'Brace & root the tripod foot',
    endCue: 'Femur parallel, bar over mid-foot',
  },

  split_squat: {
    title: 'ATG split squat',
    order: 'eccentric-first',
    frames: two(
      { hip: [96, 104], torso: -88, head: -88, armN: ARMS_DOWN, legN: to(124, 176), legF: to(56, 170), footF: 40 },
      { hip: [110, 143], torso: -86, head: -86, armN: ang(80, 70), legN: to(124, 176), legF: to(56, 170), footF: 40 }
    ),
    props: [],
    scenery: [],
    worked: ['thN', 'shN', 'thF'],
    track: { joint: 'kneeN' },
    trackLabel: 'Knee travel',
    angle: { joints: ['hip', 'kneeN', 'ankleN'], label: 'Front knee' },
    startCue: 'Long stance, rear glute squeezed',
    endCue: 'Knee past toes, hamstring covers calf',
  },

  tibialis: {
    title: 'Tibialis wall raise',
    order: 'concentric-first',
    frames: two(
      { hip: [70, 104], torso: -95, head: -94, armN: ang(98, 82), legN: to(102, 175), footN: 0 },
      { hip: [70, 104], torso: -95, head: -94, armN: ang(98, 82), legN: to(102, 175), footN: -42 }
    ),
    props: [],
    scenery: [{ kind: 'rect', x: 52, y: 10, w: 9, h: 170, tone: 'wall' }],
    worked: ['shN', 'shF'],
    track: { joint: 'toeN' },
    trackLabel: 'Toe arc',
    angle: { joints: ['kneeN', 'ankleN', 'toeN'], label: 'Ankle' },
    startCue: 'Heels planted, legs straight',
    endCue: 'Toes pulled up hard',
  },

  step_down: {
    title: 'Patrick step-down',
    order: 'eccentric-first',
    frames: two(
      { hip: [94, 85], torso: -90, head: -88, armN: ang(85, 80), legN: to(96, 162), legF: to(110, 154), footF: 15 },
      { hip: [92, 102.5], torso: -82, head: -84, armN: ang(-4, -4), legN: to(96, 162), legF: to(110, 174), footF: -18 }
    ),
    props: [],
    scenery: [{ kind: 'rect', x: 76, y: 166, w: 44, h: 14, r: 2, tone: 'plate' }],
    worked: ['thN', 'shN'],
    track: { joint: 'kneeN' },
    trackLabel: 'Knee over toe',
    angle: { joints: ['hip', 'kneeN', 'ankleN'], label: 'Knee' },
    startCue: 'Single-leg lockout on the step',
    endCue: 'Heel tap, knee over toes',
  },

  core_mcgill: {
    title: 'Bird-dog (McGill)',
    order: 'hold',
    frames: two(
      {
        hip: [72, 136], torso: -10, head: 4,
        armN: to(124, 177, 1), armF: to(128, 177, 1),
        legN: ang(90, 180), legF: ang(90, 180), footN: 180, footF: 180,
      },
      {
        hip: [72, 136], torso: -10, head: -4,
        armN: to(124, 177, 1), armF: ang(-10, -10),
        legN: ang(178, 178), legF: ang(90, 180), footN: 90, footF: 180,
      }
    ),
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'uaF'],
    track: { joint: 'handF' },
    trackLabel: 'Reach path',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Neutral table-top, brace',
    endCue: 'Opposite arm & leg long, no rotation',
  },

  bench_press: {
    title: 'Barbell bench press',
    order: 'eccentric-first',
    frames: [
      kf(0, { hip: [118, 124], torso: 180, head: 182, armN: to(70, 76, -1), legN: to(148, 176), footN: 0 }),
      kf(0.5, { hip: [118, 124], torso: 180, head: 182, armN: to(77, 94, -1), legN: to(148, 176), footN: 0 }),
      kf(1, { hip: [118, 124], torso: 180, head: 182, armN: to(84, 112, -1), legN: to(148, 176), footN: 0 }),
    ],
    props: [{ kind: 'barbell', at: 'handN' }],
    scenery: benchScenery(28, 129, 112),
    worked: ['torso', 'uaN', 'faN'],
    track: { prop: 0 },
    trackLabel: 'J-curve bar path',
    angle: { joints: ['neck', 'elbowN', 'handN'], label: 'Elbow' },
    startCue: 'Bar stacked over shoulders',
    endCue: 'Touch lower sternum, elbows ~45Â°',
  },

  kb_row: {
    title: 'Single-arm kettlebell row',
    order: 'concentric-first',
    frames: two(
      {
        hip: [80, 100], torso: -6, head: 8, armN: to(130, 146.4, -1), armF: to(134, 139, 1),
        legN: to(92, 176), legF: ang(92, 180), footF: 180,
      },
      {
        hip: [80, 100], torso: -6, head: 8, armN: to(108, 104, -1), armF: to(134, 139, 1),
        legN: to(92, 176), legF: ang(92, 180), footF: 180,
      }
    ),
    props: [{ kind: 'kettlebell', at: 'handN', d: [0, 9] }],
    scenery: benchScenery(56, 140, 96),
    worked: ['uaN', 'torso'],
    track: { joint: 'handN' },
    trackLabel: 'Bell path',
    angle: { joints: ['neck', 'elbowN', 'handN'], label: 'Elbow' },
    startCue: 'Flat back, arm long, lat stretched',
    endCue: 'Elbow to hip pocket, no twist',
  },

  floor_press: {
    title: 'Kettlebell floor press',
    order: 'eccentric-first',
    frames: two(
      { hip: [116, 170], torso: 180, head: 181, armN: ang(-90, -90), legN: to(150, 176, 1), footN: 0 },
      { hip: [116, 170], torso: 180, head: 181, armN: ang(4, -90), legN: to(150, 176, 1), footN: 0 }
    ),
    props: [{ kind: 'kettlebell', at: 'handN', d: [0, -9] }],
    scenery: [],
    worked: ['torso', 'uaN', 'faN'],
    track: { prop: 0 },
    trackLabel: 'Press path',
    angle: { joints: ['neck', 'elbowN', 'handN'], label: 'Elbow' },
    startCue: 'Vertical lockout over shoulder',
    endCue: 'Triceps touch the floor',
  },

  face_pull: {
    title: 'Cable face pull',
    order: 'concentric-first',
    frames: two(
      { hip: [94, 98.3], torso: -92, head: -90, armN: to(140, 60, -1), legN: to(100, 176), legF: to(84, 176) },
      { hip: [94, 98.3], torso: -94, head: -90, armN: to(102, 38, -1), legN: to(100, 176), legF: to(84, 176) }
    ),
    props: [{ kind: 'cable', anchor: [172, 58], at: 'handN' }],
    scenery: [
      { kind: 'rect', x: 172, y: 10, w: 10, h: 170, tone: 'steel' },
      { kind: 'wheel', c: [172, 58], r: 4 },
    ],
    worked: ['uaN', 'faN'],
    track: { joint: 'handN' },
    trackLabel: 'Hand path',
    angle: { joints: ['hip', 'neck', 'elbowN'], label: 'Shoulder' },
    startCue: 'Arms long toward the anchor',
    endCue: 'High elbows, rotate hands back',
  },

  dead_hang: {
    title: 'Dead hang',
    order: 'hold',
    frames: two(
      { hip: [100, 108], torso: -90, head: -90, armN: to(100, 2, 1), legN: ang(92, 152), footN: 118, shrug: 4 },
      { hip: [100, 104], torso: -90, head: -90, armN: to(100, 2, 1), legN: ang(93, 152), footN: 118 }
    ),
    props: [],
    scenery: [{ kind: 'bar', y: 0, x1: 50, x2: 150 }],
    worked: ['uaN', 'torso'],
    track: { joint: 'neck' },
    trackLabel: 'Shoulder path',
    startCue: 'Passive hang, decompress',
    endCue: 'Pull shoulders down, pack the lats',
  },

  rdl: {
    title: 'Romanian deadlift',
    order: 'eccentric-first',
    // straight arms; the mid keyframe keeps the bar over mid-foot (skimming the thighs) all the way down
    frames: [
      kf(0, { hip: [92, 99], torso: -90, head: -88, armN: ang(82, 82), legN: to(94, 176), legF: to(91, 176) }),
      kf(0.5, { hip: [78, 102.5], torso: -52, head: -46, armN: ang(98.6, 98.6), legN: to(94, 176), legF: to(91, 176) }),
      kf(1, { hip: [63, 108], torso: -14, head: -4, armN: ang(100, 100), legN: to(94, 176), legF: to(91, 176) }),
    ],
    props: [{ kind: 'barbell', at: 'handN' }],
    scenery: [],
    worked: ['thN', 'thF', 'torso'],
    track: { prop: 0 },
    trackLabel: 'Bar path',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    plumb: { x: 101, label: 'mid-foot' },
    startCue: 'Tall, bar against thighs',
    endCue: 'Hips back, bar skims the legs',
  },

  good_morning: {
    title: 'Kettlebell good morning',
    order: 'eccentric-first',
    frames: two(
      { hip: [92, 99], torso: -90, head: -88, armN: rel('neck', 6, 12, 1), legN: to(94, 176), legF: to(91, 176) },
      { hip: [67, 106], torso: -38, head: -30, armN: rel('neck', 6, 12, 1), legN: to(94, 176), legF: to(91, 176) }
    ),
    props: [{ kind: 'kettlebell', at: 'handN', d: [3, 0] }],
    scenery: [],
    worked: ['thN', 'thF', 'torso'],
    track: { joint: 'hip' },
    trackLabel: 'Hips travel back',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Bell hugged at the chest',
    endCue: 'Hips back, hamstrings loaded',
  },

  biering_sorensen: {
    title: 'Biering-SÃ¸rensen hold',
    order: 'hold',
    frames: two(
      { hip: [104, 97], torso: 35, head: 45, armN: rel('neck', -12, 3, 1), legN: ang(180, 180), footN: -90 },
      { hip: [104, 97], torso: 0, head: 0, armN: rel('neck', -12, 3, 1), legN: ang(180, 180), footN: -90 }
    ),
    props: [],
    scenery: [
      { kind: 'line', from: [40, 110], to: [40, FLOOR_Y], w: 4, tone: 'steel' },
      { kind: 'line', from: [96, 110], to: [96, FLOOR_Y], w: 4, tone: 'steel' },
      { kind: 'rect', x: 24, y: 102, w: 82, h: 9, r: 3, tone: 'pad' },
    ],
    worked: ['torso'],
    track: { joint: 'head' },
    trackLabel: 'Torso arc',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Hang off the bench, relaxed',
    endCue: 'Spine horizontal, hold',
  },

  carry: {
    title: 'Suitcase carry',
    order: 'cycle',
    frames: two(
      { hip: [100, 100], torso: -90, head: -90, armN: ang(90, 90), armF: ang(72, 60), legN: to(114, 176), legF: to(86, 175), footF: 18 },
      { hip: [100, 100], torso: -90, head: -90, armN: ang(90, 90), armF: ang(108, 98), legN: to(86, 175), legF: to(114, 176), footN: 18, footF: 0 }
    ),
    props: [{ kind: 'kettlebell', at: 'handN', d: [0, 9] }],
    scenery: [],
    worked: ['torso', 'faN'],
    track: { prop: 0 },
    trackLabel: 'Bell stays still',
    plumb: { x: 100, label: 'stay tall' },
    startCue: 'Tall spine, bell by the hip',
    endCue: 'No lean toward the bell',
  },

  single_leg_atw: {
    title: 'Single-leg KB around-the-world',
    order: 'loop',
    // Bell circles the waist: front (0) -> lifter's right (0.25) -> behind (0.5) -> left (0.75) -> front.
    // Near side drawn slightly lower and far side slightly higher so the horizontal circle reads as an ellipse.
    frames: [
      kf(0, { hip: [100, 100], torso: -90, head: -90, armN: to(112, 99, -1), armF: to(112, 99, -1), legN: to(100, 176), legF: to(94, 150), footF: 25 }),
      kf(0.25, { hip: [100, 100], torso: -90, head: -90, armN: to(100, 101.5, -1), armF: to(99, 101.5, -1), legN: to(100, 176), legF: to(94, 150), footF: 25 }),
      kf(0.5, { hip: [100, 100], torso: -90, head: -90, armN: to(88, 99, -1), armF: to(88, 99, -1), legN: to(100, 176), legF: to(94, 150), footF: 25 }),
      kf(0.75, { hip: [100, 100], torso: -90, head: -90, armN: to(99, 101.5, -1), armF: to(100, 96, -1), legN: to(100, 176), legF: to(94, 150), footF: 25 }),
      kf(1, { hip: [100, 100], torso: -90, head: -90, armN: to(112, 99, -1), armF: to(112, 99, -1), legN: to(100, 176), legF: to(94, 150), footF: 25 }),
    ],
    props: [{ kind: 'kettlebell', at: 'handN', d: [0, 8], handoff: { at: 'handF', from: 0.5, to: 1 } }],
    scenery: [],
    worked: ['thN', 'torso'],
    track: { prop: 0 },
    trackLabel: 'Bell circles the waist',
    angle: { joints: ['hip', 'kneeN', 'ankleN'], label: 'Stance knee' },
    plumb: { x: 100, label: 'stay tall' },
    startCue: 'One leg, soft knee, bell in front',
    endCue: 'Pass behind — torso stays still',
  },

  ohp: {
    title: 'Barbell overhead press',
    order: 'concentric-first',
    frames: [
      kf(0, { hip: [96, 98.3], torso: -91, head: -88, armN: to(106, 54, -1), legN: to(96, 176), legF: to(93, 176) }),
      kf(0.35, { hip: [97, 98.3], torso: -95, head: -100, armN: to(102, 30, -1), legN: to(96, 176), legF: to(93, 176) }),
      kf(1, { hip: [96, 98.3], torso: -90, head: -86, armN: to(97, -3.5, -1), legN: to(96, 176), legF: to(93, 176) }),
    ],
    props: [{ kind: 'barbell', at: 'handN' }],
    scenery: [],
    worked: ['uaN', 'faN'],
    track: { prop: 0 },
    trackLabel: 'Bar path around the chin',
    angle: { joints: ['hip', 'neck', 'elbowN'], label: 'Shoulder' },
    plumb: { x: 97, label: 'mid-foot' },
    startCue: 'Front rack, glutes tight',
    endCue: 'Lockout, bar over mid-foot',
  },

  pullup: {
    title: 'Pull-up',
    order: 'concentric-first',
    frames: two(
      { hip: [100, 104], torso: -88, head: -90, armN: to(100, 2, 1), legN: ang(94, 152), footN: 118 },
      { hip: [104, 50], torso: -80, head: -84, armN: to(100, 2, 1), legN: ang(98, 154), footN: 118 }
    ),
    props: [],
    scenery: [{ kind: 'bar', y: 0, x1: 50, x2: 150 }],
    worked: ['uaN', 'uaF', 'torso'],
    track: { joint: 'head' },
    trackLabel: 'Head path',
    angle: { joints: ['neck', 'elbowN', 'handN'], label: 'Elbow' },
    startCue: 'Dead hang, hollow body',
    endCue: 'Chin over the bar',
  },

  z_press: {
    title: 'Kettlebell Z-press',
    order: 'concentric-first',
    frames: two(
      { hip: [70, 170], torso: -90, head: -88, armN: to(82, 112, -1), armF: ang(70, 100), legN: ang(0, 0), footN: -80 },
      { hip: [70, 170], torso: -90, head: -86, armN: to(72, 68.5, -1), armF: ang(70, 100), legN: ang(0, 0), footN: -80 }
    ),
    props: [{ kind: 'kettlebell', at: 'handN', d: [2, -8] }],
    scenery: [],
    worked: ['uaN', 'torso'],
    track: { prop: 0 },
    trackLabel: 'Press path',
    angle: { joints: ['hip', 'neck', 'elbowN'], label: 'Shoulder' },
    plumb: { x: 70, label: 'stacked over hips' },
    startCue: 'Seated tall, bell in the rack',
    endCue: 'Biceps by the ear, no lean',
  },

  lsit: {
    title: 'L-sit',
    order: 'hold',
    frames: two(
      { hip: [80, 166], torso: -100, head: -92, armN: to(80, 164, -1), legN: ang(-45, 60), footN: 30 },
      { hip: [80, 162], torso: -98, head: -88, armN: to(80, 164, -1), legN: ang(2, 2), footN: 4 }
    ),
    props: [],
    scenery: [
      { kind: 'line', from: [72, 166], to: [88, 166], w: 4, tone: 'steel' },
      { kind: 'line', from: [74, 166], to: [72, FLOOR_Y], w: 3, tone: 'steel' },
      { kind: 'line', from: [86, 166], to: [88, FLOOR_Y], w: 3, tone: 'steel' },
    ],
    worked: ['thN', 'torso'],
    track: { joint: 'ankleN' },
    trackLabel: 'Leg path',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Tuck, shoulders pushed down',
    endCue: 'Legs straight at 90Â°',
  },

  arms: {
    title: 'Hammer curl + overhead extension',
    order: 'concentric-first',
    frames: two(
      { hip: [100, 98.3], torso: -90, head: -90, armN: ang(92, 92), armF: ang(-98, 112), legN: to(102, 176), legF: to(96, 176) },
      { hip: [100, 98.3], torso: -90, head: -90, armN: ang(94, -62), armF: ang(-98, -101), legN: to(102, 176), legF: to(96, 176) }
    ),
    props: [
      { kind: 'dumbbell', at: 'handN' },
      { kind: 'dumbbell', at: 'handF' },
    ],
    scenery: [],
    worked: ['uaN', 'faN', 'uaF'],
    track: { joint: 'handN' },
    trackLabel: 'Curl arc',
    angle: { joints: ['neck', 'elbowN', 'handN'], label: 'Elbow' },
    startCue: 'Elbows pinned, arms long',
    endCue: 'Squeeze both at the top',
  },

  warmup_walk: {
    title: 'Backward sled drag',
    order: 'cycle',
    frames: two(
      { hip: [94, 104], torso: -100, head: -92, armN: to(113, 97, 1), legN: to(116, 176), legF: to(72, 172), footF: 28 },
      { hip: [92, 104], torso: -100, head: -92, armN: to(111, 97, 1), legN: to(72, 172), legF: to(114, 176), footN: 28, footF: 0 }
    ),
    props: [{ kind: 'cable', anchor: [170, 160], at: 'handN' }],
    scenery: [{ kind: 'rect', x: 164, y: 156, w: 28, h: 24, r: 3, tone: 'steel' }],
    worked: ['thN', 'shN'],
    track: { joint: 'kneeN' },
    trackLabel: 'Knee drive',
    angle: { joints: ['hip', 'kneeN', 'ankleN'], label: 'Knee' },
    startCue: 'Lean back into the straps',
    endCue: 'Push through the ball of the foot',
  },

  warmup_hip: {
    title: '90/90 hip reset',
    order: 'hold',
    frames: two(
      { hip: [96, 168], torso: -90, head: -88, armN: ang(80, 80), legN: ang(8, 170), legF: ang(172, 10), footN: 180, footF: 0 },
      { hip: [96, 168], torso: -45, head: -30, armN: ang(25, 25), legN: ang(8, 170), legF: ang(172, 10), footN: 180, footF: 0 }
    ),
    props: [],
    scenery: [],
    worked: ['thN', 'torso'],
    track: { joint: 'head' },
    trackLabel: 'Chest over shin',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Tall spine in 90/90',
    endCue: 'Lean the chest over the front shin',
  },

  warmup_row: {
    title: 'Rower',
    order: 'concentric-first',
    frames: two(
      { hip: [108, 156], torso: -62, head: -52, armN: ang(54, 46), legN: to(146, 158, 1), footN: -62 },
      { hip: [69, 156], torso: -110, head: -98, armN: ang(100, -4), legN: to(146, 158, 1), footN: -62 }
    ),
    props: [{ kind: 'cable', anchor: [168, 146], at: 'handN' }],
    scenery: [
      { kind: 'line', from: [36, 164], to: [168, 164], w: 4, tone: 'steel' },
      { kind: 'wheel', c: [176, 146], r: 16 },
      { kind: 'line', from: [150, 164], to: [158, 146], w: 3, tone: 'steel' },
      { kind: 'line', from: [40, 164], to: [40, FLOOR_Y], w: 3, tone: 'steel' },
      { kind: 'line', from: [166, 164], to: [166, FLOOR_Y], w: 3, tone: 'steel' },
    ],
    worked: ['thN', 'torso', 'uaN'],
    track: { joint: 'handN' },
    trackLabel: 'Handle path',
    angle: { joints: ['hip', 'kneeN', 'ankleN'], label: 'Knee' },
    startCue: 'Catch: shins vertical, arms long',
    endCue: 'Finish: legs, hips, then arms',
  },

  warmup_90_90: {
    title: '90/90 breathing + bridge',
    order: 'hold',
    frames: two(
      { hip: [100, 170], torso: 180, head: 181, armN: ang(2, 2), legN: to(138, 128, -1), footN: -80 },
      { hip: [100, 150], torso: 157, head: 172, armN: ang(22, 0), legN: to(138, 128, -1), footN: -80 }
    ),
    props: [],
    scenery: [{ kind: 'rect', x: 132, y: 131, w: 34, h: 49, r: 3, tone: 'plate' }],
    worked: ['thN', 'torso'],
    track: { joint: 'hip' },
    trackLabel: 'Hip lift',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Heels on the box, ribs down',
    endCue: 'Tuck the pelvis and bridge',
  },

  warmup_calf: {
    title: 'Deficit calf raise',
    order: 'concentric-first',
    frames: two(
      { hip: [92, 94.3], torso: -90, head: -90, armN: ARMS_DOWN, legN: to(92, 172), footN: -26 },
      { hip: [96, 77.6], torso: -90, head: -90, armN: ARMS_DOWN, legN: to(95, 155.3), footN: 50 }
    ),
    props: [],
    scenery: [{ kind: 'rect', x: 100, y: 166, w: 40, h: 14, r: 2, tone: 'plate' }],
    worked: ['shN', 'shF'],
    track: { joint: 'ankleN' },
    trackLabel: 'Heel path',
    angle: { joints: ['kneeN', 'ankleN', 'toeN'], label: 'Ankle' },
    startCue: 'Heels below the step, 3 s stretch',
    endCue: 'Up onto the big toe',
  },

  warmup_ankle: {
    title: 'Half-kneeling ankle rock',
    order: 'hold',
    frames: two(
      { hip: [70, 138], torso: -90, head: -88, armN: ang(80, 70), legN: to(112, 176), legF: ang(95, 180), footF: 180 },
      { hip: [91, 145], torso: -86, head: -86, armN: ang(50, 40), legN: to(112, 176), legF: ang(124, 180), footF: 180 }
    ),
    props: [],
    scenery: [],
    worked: ['shN'],
    track: { joint: 'kneeN' },
    trackLabel: 'Knee glide',
    angle: { joints: ['kneeN', 'ankleN', 'toeN'], label: 'Ankle' },
    startCue: 'Half-kneeling, shin vertical',
    endCue: 'Knee past toes, heel stays down',
  },

  warmup_club: {
    title: 'Indian club circles',
    order: 'loop',
    frames: [
      kf(0, { hip: [96, 98.3], torso: -90, head: -90, armN: ang(60, 50), legN: to(98, 176), legF: to(92, 176) }),
      kf(0.25, { hip: [96, 98.3], torso: -90, head: -90, armN: ang(-30, -40), legN: to(98, 176), legF: to(92, 176) }),
      kf(0.5, { hip: [96, 98.3], torso: -90, head: -90, armN: ang(-110, -130), legN: to(98, 176), legF: to(92, 176) }),
      kf(0.75, { hip: [96, 98.3], torso: -90, head: -90, armN: ang(-195, -215), legN: to(98, 176), legF: to(92, 176) }),
      kf(1, { hip: [96, 98.3], torso: -90, head: -90, armN: ang(-300, -310), legN: to(98, 176), legF: to(92, 176) }),
    ],
    props: [{ kind: 'club', at: 'handN', from: 'elbowN', len: 24 }],
    scenery: [],
    worked: ['uaN'],
    track: { joint: 'handN' },
    trackLabel: 'Club circle',
    startCue: 'Heart-guard start',
    endCue: 'Smooth circle behind the head',
  },

  warmup_scapular: {
    title: 'Scapular pull-down',
    order: 'concentric-first',
    frames: [
      kf(0, { hip: [96, 98.3], torso: -90, head: -90, armN: ang(-84, -88), legN: to(98, 176), legF: to(92, 176) }),
      kf(0.5, { hip: [96, 98.3], torso: -91, head: -90, armN: ang(6, -64), legN: to(98, 176), legF: to(92, 176) }),
      kf(1, { hip: [96, 98.3], torso: -92, head: -90, armN: ang(98, -40), legN: to(98, 176), legF: to(92, 176) }),
    ],
    props: [],
    scenery: [],
    worked: ['uaN', 'torso'],
    track: { joint: 'elbowN' },
    trackLabel: 'Elbow path',
    angle: { joints: ['hip', 'neck', 'elbowN'], label: 'Shoulder' },
    startCue: 'Arms overhead, neutral',
    endCue: 'Elbows to ribs, blades down & back',
  },

  warmup_elephant: {
    title: 'Elephant walk',
    order: 'cycle',
    frames: two(
      { hip: [90, 100], torso: 46, head: 70, armN: to(140, 176, 1), legN: to(90, 176), legF: to(86, 168), footF: 32 },
      { hip: [90, 100], torso: 46, head: 70, armN: to(140, 176, 1), legN: to(94, 168), legF: to(86, 176), footN: 32, footF: 0 }
    ),
    props: [],
    scenery: [],
    worked: ['thN', 'thF'],
    track: { joint: 'kneeN' },
    trackLabel: 'Knee pump',
    angle: { joints: ['hip', 'kneeN', 'ankleN'], label: 'Knee' },
    startCue: 'Hands down, one knee locked',
    endCue: 'Switch: pump the other heel',
  },

  warmup_dead_hang: {
    title: 'Scapular hang pulls',
    order: 'concentric-first',
    frames: two(
      { hip: [100, 109], torso: -90, head: -90, armN: to(100, 2, 1), legN: ang(92, 152), footN: 118, shrug: 5 },
      { hip: [100, 104], torso: -90, head: -90, armN: to(100, 2, 1), legN: ang(93, 152), footN: 118 }
    ),
    props: [],
    scenery: [{ kind: 'bar', y: 0, x1: 50, x2: 150 }],
    worked: ['uaN', 'torso'],
    track: { joint: 'neck' },
    trackLabel: 'Shoulder path',
    startCue: 'Passive hang',
    endCue: 'Shoulders down, arms straight',
  },

  warmup_wall_slide: {
    title: 'Wall slide',
    order: 'concentric-first',
    frames: two(
      { hip: [68, 98.6], torso: -92, head: -90, armN: ang(92, -84), legN: to(76, 176), legF: to(72, 176) },
      { hip: [68, 98.6], torso: -92, head: -90, armN: ang(-96, -94), legN: to(76, 176), legF: to(72, 176) }
    ),
    props: [],
    scenery: [{ kind: 'rect', x: 52, y: -20, w: 8, h: 200, tone: 'wall' }],
    worked: ['uaN'],
    track: { joint: 'handN' },
    trackLabel: 'Hand path',
    angle: { joints: ['hip', 'neck', 'elbowN'], label: 'Shoulder' },
    startCue: '"W": forearms on the wall',
    endCue: '"Y": reach up, ribs down',
  },
};

/** Fallback for any future DiagramType without its own motion */
export const GENERIC_MOTION: MotionDef = MOTIONS.squat;

export function getMotion(type: DiagramType | string): MotionDef {
  return (MOTIONS as Record<string, MotionDef>)[type] ?? GENERIC_MOTION;
}
