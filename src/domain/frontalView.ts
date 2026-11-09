// src/domain/frontalView.ts
/**
 * Front / back view of the same motion.
 *
 * The side-view skeleton already knows every joint's height (y) and depth (x). The frontal view
 * keeps the height, uses depth only for draw order, and places each joint left/right using a
 * per-exercise lateral width (grip, stance, knees out, elbow flare…) that can change over the rep.
 * Because it is a projection of the side view, both views are always in the same phase.
 *
 * Side "N" = lifter's right, "F" = lifter's left.
 */
import type { DiagramType } from './exerciseVisualsData';
import type { Skeleton, Vec } from './motionRig';
import { FLOOR_Y } from './motionLibrary';

export const CX = 100;

/** number = fixed; [a, b] = start -> end; 3+ values = evenly spaced keys over the rep (loops, hand-to-hand passes) */
export type Lateral = number | [number, number] | number[];

export type LatJoint = 'shoulder' | 'elbow' | 'hand' | 'hip' | 'knee' | 'ankle' | 'toe' | 'scap';

export type FrontalProp =
  /** straight bar held in both hands (or racked: y taken from the neck) */
  | { kind: 'bar'; at: 'hands' | 'neck'; half: number; dy?: number }
  | { kind: 'kettlebell' | 'dumbbell'; side: 'N' | 'F'; d?: Vec; handoff?: { side: 'N' | 'F'; from: number; to: number } }
  | { kind: 'cable'; anchor: Vec; sides: ('N' | 'F')[] }
  | { kind: 'club'; side: 'N' | 'F'; len: number };

export type FrontalScenery =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r?: number; tone?: 'pad' | 'steel' | 'wall' | 'plate' }
  | { kind: 'line'; from: Vec; to: Vec; w?: number }
  | { kind: 'bar'; y: number; half: number };

export interface FrontalConfig {
  view: 'front' | 'back';
  /** button / panel label */
  label: string;
  /** half-widths per joint, per side (N, F); a pair animates start → end */
  lat: Partial<Record<LatJoint, Lateral | { N: Lateral; F: Lateral }>>;
  props: FrontalProp[];
  scenery: FrontalScenery[];
  /** vertical guides: through the toes (knee tracking) or the midline (symmetry) */
  guide: 'toes' | 'midline' | 'none';
  track: { joint: 'hand' | 'knee' | 'elbow' | 'neck' | 'hip' | 'ankle'; side: 'N' | 'F' | 'mid'; label: string };
  cue: string;
  /** lateral slide of everything above the feet (+ toward the lifter's left), e.g. a Cossack squat */
  shift?: Lateral;
  /** how far the free (left) hip drops below level; negative lifts it (pelvic leveling) */
  hipDrop?: Lateral;
}

const DEFAULT_LAT: Record<LatJoint, number> = {
  shoulder: 15,
  elbow: 19,
  hand: 20,
  hip: 8.5,
  knee: 9.5,
  ankle: 10,
  toe: 12,
  scap: 9,
};

// helpers
const benchEndOn: FrontalScenery[] = [
  { kind: 'line', from: [CX - 12, 133], to: [CX - 12, FLOOR_Y], w: 4 },
  { kind: 'line', from: [CX + 12, 133], to: [CX + 12, FLOOR_Y], w: 4 },
  { kind: 'rect', x: CX - 16, y: 129, w: 32, h: 9, r: 3, tone: 'pad' },
];
const pullBar: FrontalScenery[] = [{ kind: 'bar', y: 0, half: 52 }];
const plumbFeetWide = { ankle: 13, toe: 17 } as const;

export const FRONTAL: Record<DiagramType, FrontalConfig> = {
  squat: {
    view: 'front', label: 'Front',
    lat: { hand: 25, elbow: 28, knee: [10, 16], ...plumbFeetWide },
    props: [{ kind: 'bar', at: 'neck', half: 50, dy: 2 }],
    scenery: [], guide: 'toes',
    track: { joint: 'knee', side: 'N', label: 'Knee tracking' },
    cue: 'Knees track over the toes, bar stays level',
  },
  split_squat: {
    view: 'front', label: 'Front',
    lat: { hip: 8, knee: { N: [9, 11], F: 9 }, ankle: 9, toe: 10 },
    props: [], scenery: [], guide: 'toes',
    track: { joint: 'knee', side: 'N', label: 'Front knee path' },
    cue: 'Front knee drives straight over the 2nd toe',
  },
  tibialis: {
    view: 'front', label: 'Front',
    lat: { ankle: 9, toe: 11, hand: 18 },
    props: [], scenery: [{ kind: 'rect', x: 40, y: -20, w: 120, h: 200, tone: 'wall' }], guide: 'toes',
    track: { joint: 'ankle', side: 'N', label: 'Both feet lift' },
    cue: 'Both feet lift evenly, heels stay down',
  },
  step_down: {
    view: 'front', label: 'Front',
    lat: { knee: { N: 8, F: 9 }, ankle: { N: 7, F: 9 }, toe: { N: 9, F: 11 }, hand: [18, 24] },
    props: [], scenery: [{ kind: 'rect', x: CX - 30, y: 166, w: 60, h: 14, r: 2, tone: 'plate' }], guide: 'toes',
    track: { joint: 'knee', side: 'N', label: 'Stance knee path' },
    cue: 'Stance knee stays over the toes, hips level',
  },
  core_mcgill: {
    view: 'back', label: 'Back',
    lat: { hand: { N: 12, F: [12, 10] }, elbow: 13, knee: 8, ankle: 8, toe: 8 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'hip', side: 'mid', label: 'Hips stay level' },
    cue: 'Hips and shoulders stay level, no rotation',
  },
  bench_press: {
    view: 'back', label: 'Head-end',
    lat: { hand: 25, elbow: [25, 31], knee: 18, ankle: 22, toe: 24 },
    props: [{ kind: 'bar', at: 'hands', half: 52 }],
    scenery: benchEndOn, guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Bar stays level' },
    cue: 'Bar level, elbows ~45° — not flared to 90°',
  },
  kb_row: {
    view: 'back', label: 'Back',
    lat: { hand: { N: [12, 13], F: 14 }, elbow: { N: [12, 17], F: 15 }, scap: { N: [11, 7], F: 9 }, knee: { N: 9, F: 11 }, ankle: { N: 10, F: 13 } },
    props: [{ kind: 'kettlebell', side: 'N', d: [0, 6] }],
    scenery: [], guide: 'midline',
    track: { joint: 'elbow', side: 'N', label: 'Elbow path' },
    cue: 'Shoulder blade pulls back, torso does not twist',
  },
  floor_press: {
    view: 'back', label: 'Head-end',
    lat: { hand: { N: 18, F: 18 }, elbow: { N: [18, 26], F: [18, 26] }, knee: 12, ankle: 14, toe: 16 },
    props: [{ kind: 'kettlebell', side: 'N', d: [0, -8] }, { kind: 'kettlebell', side: 'F', d: [0, -8] }],
    scenery: [], guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Press path' },
    cue: 'Bells stacked over the elbows, both sides even',
  },
  face_pull: {
    view: 'back', label: 'Back',
    lat: { hand: [5, 22], elbow: [12, 30], scap: [11, 6], knee: 10, ankle: 12 },
    props: [{ kind: 'cable', anchor: [CX, 58], sides: ['N', 'F'] }],
    scenery: [], guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Rope splits apart' },
    cue: 'Elbows high and wide, blades squeeze together',
  },
  dead_hang: {
    view: 'back', label: 'Back',
    lat: { hand: 26, elbow: 25, scap: [10, 8], knee: 5, ankle: 4, toe: 5 },
    props: [], scenery: pullBar, guide: 'midline',
    track: { joint: 'neck', side: 'mid', label: 'Shoulders drop down' },
    cue: 'Shoulders pull down away from the ears',
  },
  rdl: {
    view: 'back', label: 'Back',
    lat: { hand: 19, elbow: 18, knee: 9, ankle: 10, toe: 11 },
    props: [{ kind: 'bar', at: 'hands', half: 50 }],
    scenery: [], guide: 'midline',
    track: { joint: 'hip', side: 'mid', label: 'Hips square' },
    cue: 'Hips stay square, bar level, spine straight',
  },
  good_morning: {
    view: 'back', label: 'Back',
    lat: { hand: 9, elbow: 17, knee: 9, ankle: 10, toe: 11 },
    props: [{ kind: 'kettlebell', side: 'N', d: [-9, 0] }],
    scenery: [], guide: 'midline',
    track: { joint: 'hip', side: 'mid', label: 'Hips square' },
    cue: 'Spine straight from behind, hips square',
  },
  biering_sorensen: {
    view: 'back', label: 'Head-end',
    lat: { hand: 6, elbow: 13, knee: 6, ankle: 6, toe: 6 },
    props: [],
    scenery: [{ kind: 'rect', x: CX - 15, y: 102, w: 30, h: 9, r: 3, tone: 'pad' }, { kind: 'line', from: [CX - 10, 111], to: [CX - 10, FLOOR_Y], w: 4 }, { kind: 'line', from: [CX + 10, 111], to: [CX + 10, FLOOR_Y], w: 4 }],
    guide: 'midline',
    track: { joint: 'neck', side: 'mid', label: 'Torso rises straight' },
    cue: 'Torso rises without twisting',
  },
  single_leg_atw: {
    view: 'front', label: 'Front',
    // keys at 0 / .25 / .5 / .75 / 1: hands meet in front, right hand takes it round, meet behind, left hand brings it back
    lat: {
      // eighth-rep keys follow the same rounded loop as the side-view keyframes
      hand: { N: [3, 18, 24, 18, 3, 13, 17, 13, 3], F: [3, 13, 17, 13, 3, 18, 24, 18, 3] },
      elbow: { N: [13, 20, 23, 20, 14, 16, 17, 16, 13], F: [13, 16, 17, 16, 14, 20, 23, 20, 13] },
      knee: { N: 8, F: 11 }, ankle: { N: 8, F: 10 }, toe: { N: 9, F: 11 },
    },
    props: [{ kind: 'kettlebell', side: 'N', d: [0, 8], handoff: { side: 'F', from: 0.5, to: 1 } }],
    scenery: [], guide: 'midline',
    track: { joint: 'hip', side: 'mid', label: 'Hips stay level' },
    cue: 'Hips level, stance knee over the toes',
  },
  carry: {
    view: 'front', label: 'Front',
    lat: { hand: { N: 19, F: 20 }, elbow: { N: 18, F: 19 }, knee: 8, ankle: 8, toe: 9 },
    props: [{ kind: 'kettlebell', side: 'N', d: [0, 9] }],
    scenery: [], guide: 'midline',
    track: { joint: 'neck', side: 'mid', label: 'No side lean' },
    cue: 'Shoulders level — do not lean toward the bell',
  },
  ohp: {
    view: 'front', label: 'Front',
    lat: { hand: 19, elbow: [22, 19], knee: 9, ankle: 10, toe: 12 },
    props: [{ kind: 'bar', at: 'hands', half: 50 }],
    scenery: [], guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Bar stays level' },
    cue: 'Bar level, locks out over the midline',
  },
  pullup: {
    view: 'back', label: 'Back',
    lat: { hand: 27, elbow: [27, 31], scap: [10, 6], knee: 5, ankle: 4, toe: 5 },
    props: [], scenery: pullBar, guide: 'midline',
    track: { joint: 'neck', side: 'mid', label: 'Body rises straight' },
    cue: 'Elbows drive down to the ribs, blades together',
  },
  z_press: {
    view: 'front', label: 'Front',
    lat: { hand: { N: [17, 12], F: 14 }, elbow: { N: [21, 17], F: 16 }, knee: 9, ankle: 10, toe: 12 },
    props: [{ kind: 'kettlebell', side: 'N', d: [0, -8] }],
    scenery: [], guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Press path' },
    cue: 'No side lean — trunk stays over the hips',
  },
  lsit: {
    view: 'front', label: 'Front',
    lat: { hand: 17, elbow: 17, knee: 4, ankle: 3, toe: 3 },
    props: [],
    scenery: [{ kind: 'line', from: [CX - 24, 166], to: [CX - 11, 166], w: 4 }, { kind: 'line', from: [CX + 11, 166], to: [CX + 24, 166], w: 4 }, { kind: 'line', from: [CX - 18, 166], to: [CX - 18, FLOOR_Y], w: 3 }, { kind: 'line', from: [CX + 18, 166], to: [CX + 18, FLOOR_Y], w: 3 }],
    guide: 'midline',
    track: { joint: 'ankle', side: 'N', label: 'Legs together' },
    cue: 'Legs squeezed together, shoulders pushed down',
  },
  arms: {
    view: 'front', label: 'Front',
    lat: { hand: { N: 17, F: 8 }, elbow: { N: 17, F: 13 }, knee: 9, ankle: 10, toe: 12 },
    props: [{ kind: 'dumbbell', side: 'N' }, { kind: 'dumbbell', side: 'F' }],
    scenery: [], guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Curl path' },
    cue: 'Elbows stay pinned, wrists neutral',
  },
  warmup_walk: {
    view: 'front', label: 'Front',
    lat: { hand: 10, elbow: 16, knee: 9, ankle: 9, toe: 10 },
    props: [{ kind: 'cable', anchor: [CX, 160], sides: ['N', 'F'] }],
    scenery: [], guide: 'toes',
    track: { joint: 'knee', side: 'N', label: 'Knee tracking' },
    cue: 'Knees drive straight back over the toes',
  },
  warmup_hip: {
    view: 'front', label: 'Front',
    lat: { hand: [20, 14], elbow: 18, hip: 9, knee: { N: 30, F: 14 }, ankle: { N: 6, F: 6 }, toe: { N: 2, F: 2 } },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'neck', side: 'mid', label: 'Chest over shin' },
    cue: 'Square the chest over the front shin',
  },
  warmup_row: {
    view: 'back', label: 'Back',
    lat: { hand: 9, elbow: [14, 20], scap: [11, 7], knee: 10, ankle: 10, toe: 11 },
    props: [{ kind: 'cable', anchor: [CX, 146], sides: ['N', 'F'] }],
    scenery: [{ kind: 'line', from: [CX - 8, 164], to: [CX + 8, 164], w: 4 }, { kind: 'line', from: [CX, 164], to: [CX, FLOOR_Y], w: 3 }],
    guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Handle path' },
    cue: 'Even pull, blades squeeze at the finish',
  },
  warmup_90_90: {
    view: 'front', label: 'Feet-end',
    lat: { hand: 22, elbow: 20, knee: 10, ankle: 10, toe: 11 },
    props: [], scenery: [{ kind: 'rect', x: CX - 22, y: 131, w: 44, h: 49, r: 3, tone: 'plate' }], guide: 'midline',
    track: { joint: 'hip', side: 'mid', label: 'Pelvis level' },
    cue: 'Pelvis lifts level, knees hip-width',
  },
  warmup_calf: {
    view: 'back', label: 'Back',
    lat: { hand: 19, ankle: 8, toe: 9, knee: 9 },
    props: [], scenery: [{ kind: 'rect', x: CX - 26, y: 166, w: 52, h: 14, r: 2, tone: 'plate' }], guide: 'toes',
    track: { joint: 'ankle', side: 'N', label: 'Heel path' },
    cue: 'Heels rise straight — no rolling out',
  },
  warmup_ankle: {
    view: 'front', label: 'Front',
    lat: { hand: 16, knee: { N: [10, 12], F: 9 }, ankle: { N: 11, F: 9 }, toe: { N: 13, F: 9 } },
    props: [], scenery: [], guide: 'toes',
    track: { joint: 'knee', side: 'N', label: 'Knee over 2nd toe' },
    cue: 'Knee travels over the 2nd toe, arch stays up',
  },
  warmup_club: {
    view: 'front', label: 'Front',
    lat: { hand: { N: 20, F: 19 }, elbow: { N: 18, F: 18 }, knee: 9, ankle: 10, toe: 12 },
    props: [{ kind: 'club', side: 'N', len: 24 }],
    scenery: [], guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Club circle' },
    cue: 'Ribs down, trunk still while the club circles',
  },
  warmup_scapular: {
    view: 'back', label: 'Back',
    lat: { hand: [16, 27], elbow: [22, 29], scap: [11, 6], knee: 9, ankle: 10, toe: 11 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'elbow', side: 'N', label: 'Elbow path' },
    cue: 'Blades slide down and together, evenly',
  },
  warmup_elephant: {
    view: 'back', label: 'Back',
    lat: { hand: 14, elbow: 15, knee: 9, ankle: 10, toe: 11 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'hip', side: 'mid', label: 'Hips stay level' },
    cue: 'Hips stay level as the knees alternate',
  },
  warmup_dead_hang: {
    view: 'back', label: 'Back',
    lat: { hand: 26, elbow: 25, scap: [10, 7], knee: 5, ankle: 4, toe: 5 },
    props: [], scenery: pullBar, guide: 'midline',
    track: { joint: 'neck', side: 'mid', label: 'Shoulders drop down' },
    cue: 'Arms straight; only the shoulder blades move',
  },
  warmup_wall_slide: {
    view: 'front', label: 'Front',
    lat: { elbow: [33, 22], hand: [33, 28], knee: 9, ankle: 10, toe: 12 },
    props: [], scenery: [{ kind: 'rect', x: 30, y: -20, w: 140, h: 200, tone: 'wall' }], guide: 'midline',
    track: { joint: 'hand', side: 'N', label: '"W" to "Y"' },
    cue: '"W" to "Y" — forearms stay on the wall',
  },
  hanging_knee_raise: {
    view: 'front', label: 'Front',
    lat: { hand: 24, elbow: 24, scap: 9, knee: 6, ankle: 5, toe: 6 },
    props: [], scenery: pullBar, guide: 'midline',
    track: { joint: 'knee', side: 'N', label: 'Knees rise on the midline' },
    cue: 'Knees rise together; pelvis curls, no swing',
  },
  hanging_corkscrew: {
    view: 'front', label: 'Front',
    // keys at 0 / .25 / .5 / .75 / 1: centre, knees to the lifter's right, centre, to the left, centre
    lat: {
      hand: 24, elbow: 24, scap: 9,
      knee: { N: [6, 24, 6, -12, 6], F: [6, -12, 6, 24, 6] },
      ankle: { N: [5, 28, 5, -18, 5], F: [5, -18, 5, 28, 5] },
      toe: { N: [6, 30, 6, -16, 6], F: [6, -16, 6, 30, 6] },
    },
    props: [], scenery: pullBar, guide: 'midline',
    track: { joint: 'knee', side: 'N', label: 'Knees swing side to side' },
    cue: 'Pelvis twists to each side; shoulders stay square',
  },
  curl_up: {
    view: 'front', label: 'Feet-end',
    lat: { hand: 14, elbow: 15, knee: { N: 10, F: 9 }, ankle: { N: 10, F: 9 }, toe: { N: 11, F: 10 } },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'neck', side: 'mid', label: 'Shoulders lift evenly' },
    cue: 'Head and shoulders lift as one block; neck stays long',
  },
  plank_knee: {
    view: 'front', label: 'Head-end',
    lat: { hand: 9, elbow: 13, scap: [9, 12], knee: { N: [9, 12], F: 9 }, ankle: { N: [9, 11], F: 9 }, toe: 9 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'knee', side: 'N', label: 'Knee path' },
    cue: 'Hips stay level; blades spread as you push the floor away',
  },
  mountain_climber: {
    view: 'front', label: 'Head-end',
    lat: { hand: 15, elbow: 16, knee: { N: [-6, 9], F: [9, -6] }, ankle: { N: [2, 10], F: [10, 2] }, toe: { N: [2, 11], F: [11, 2] } },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'knee', side: 'N', label: 'Knee crosses the midline' },
    cue: 'Hips stay level and square as the knee crosses',
  },
  cossack_squat: {
    view: 'front', label: 'Front',
    // feet planted wide; the body slides 30 toward the lifter's right (N) foot and sinks
    lat: { hand: 9, elbow: 15, knee: { N: [30, 36], F: [36, 52] }, ankle: 48, toe: 51 },
    shift: [0, -30],
    props: [{ kind: 'kettlebell', side: 'N', d: [9, 0] }],
    scenery: [], guide: 'toes',
    track: { joint: 'hip', side: 'mid', label: 'Hips slide over one foot' },
    cue: 'Working knee tracks over the toes; trail leg long, toes up',
  },
  hollow_body: {
    view: 'front', label: 'Feet-end',
    lat: { hand: 8, elbow: 10, knee: 4, ankle: 3, toe: 3 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'ankle', side: 'N', label: 'Legs together' },
    cue: 'Legs squeezed together, low back glued to the floor',
  },
  cat_camel: {
    view: 'back', label: 'Back',
    lat: { hand: 14, elbow: 15, knee: 9, ankle: 9, toe: 9, scap: [8, 11, 8] },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'neck', side: 'mid', label: 'Spine stays centred' },
    cue: 'Move one segment at a time; hips do not sway',
  },
  pelvic_drop: {
    view: 'back', label: 'Back',
    lat: { hand: 18, elbow: 17, knee: { N: 9, F: 10 }, ankle: { N: 9, F: 11 }, toe: { N: 10, F: 12 } },
    hipDrop: [7, -1],
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'hip', side: 'F', label: 'Free hip rises level' },
    cue: 'Free-side hip lifts level; standing-side glute squeezes',
  },
};

export function getFrontal(type: DiagramType | string): FrontalConfig {
  return (FRONTAL as Record<string, FrontalConfig>)[type] ?? FRONTAL.squat;
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export type Side = 'N' | 'F';
export interface FrontalPoint {
  p: Vec;
  /** side-view x: used for draw order */
  depth: number;
}
export type FrontalJoint = 'shoulder' | 'elbow' | 'hand' | 'hip' | 'knee' | 'ankle' | 'toe' | 'scap';

export interface FrontalSkeleton {
  view: 'front' | 'back';
  head: FrontalPoint;
  neck: FrontalPoint;
  pelvis: FrontalPoint;
  joints: Record<FrontalJoint, Record<Side, FrontalPoint>>;
  /** rep progress this projection was taken at */
  progress: number;
}

/** A fixed, start -> end, or evenly keyed value at rep progress. */
export function valueAt(l: Lateral, progress: number): number {
  if (!Array.isArray(l)) return l;
  if (l.length <= 2) return l[0] + ((l[1] ?? l[0]) - l[0]) * progress;
  const x = Math.min(1, Math.max(0, progress)) * (l.length - 1);
  const i = Math.min(l.length - 2, Math.floor(x));
  return l[i] + (l[i + 1] - l[i]) * (x - i);
}

export const shiftAt = (cfg: FrontalConfig, progress: number) => (cfg.shift === undefined ? 0 : valueAt(cfg.shift, progress));
export const hipDropAt = (cfg: FrontalConfig, progress: number) => (cfg.hipDrop === undefined ? 0 : valueAt(cfg.hipDrop, progress));

/** Lateral half-width of a joint at rep progress (also used by the 3-D oblique and top views). */
export function latFor(cfg: FrontalConfig, j: LatJoint, side: Side, progress: number): number {
  const v = cfg.lat[j];
  let l: Lateral = DEFAULT_LAT[j];
  if (v !== undefined) l = typeof v === 'object' && !Array.isArray(v) ? v[side] : v;
  if (!Array.isArray(l)) return l;
  if (l.length <= 2) return l[0] + ((l[1] ?? l[0]) - l[0]) * progress;
  const x = Math.min(1, Math.max(0, progress)) * (l.length - 1);
  const i = Math.min(l.length - 2, Math.floor(x));
  return l[i] + (l[i + 1] - l[i]) * (x - i);
}

/** Screen x for a lateral offset: lifter's right is on the viewer's left from the front. */
export function lateralX(view: 'front' | 'back', side: Side, lat: number): number {
  const sign = side === 'N' ? -1 : 1;
  return CX + (view === 'front' ? sign : -sign) * lat;
}

const SIDE_JOINT: Record<Exclude<FrontalJoint, 'shoulder' | 'scap'>, [keyof Skeleton, keyof Skeleton]> = {
  elbow: ['elbowN', 'elbowF'],
  hand: ['handN', 'handF'],
  hip: ['hip', 'hip'],
  knee: ['kneeN', 'kneeF'],
  ankle: ['ankleN', 'ankleF'],
  toe: ['toeN', 'toeF'],
};

export function projectFrontal(sk: Skeleton, cfg: FrontalConfig, progress: number): FrontalSkeleton {
  // the body slides sideways over planted feet; on screen that is +x from the front, -x from behind
  const sx = (cfg.view === 'front' ? 1 : -1) * shiftAt(cfg, progress);
  const drop = hipDropAt(cfg, progress);
  const pt = (side: Side, j: FrontalJoint): FrontalPoint => {
    const lat = latFor(cfg, j, side, progress);
    if (j === 'shoulder' || j === 'scap') {
      const y = sk.neck[1] + (j === 'scap' ? 9 : 3);
      return { p: [lateralX(cfg.view, side, lat) + sx, y], depth: sk.neck[0] };
    }
    const src = sk[SIDE_JOINT[j][side === 'N' ? 0 : 1]];
    const planted = j === 'ankle' || j === 'toe';
    const y = src[1] + (j === 'hip' && side === 'F' ? drop : 0);
    return { p: [lateralX(cfg.view, side, lat) + (planted ? 0 : sx), y], depth: src[0] };
  };
  const joints = {} as FrontalSkeleton['joints'];
  (['shoulder', 'elbow', 'hand', 'hip', 'knee', 'ankle', 'toe', 'scap'] as FrontalJoint[]).forEach((j) => {
    joints[j] = { N: pt('N', j), F: pt('F', j) };
  });
  return {
    view: cfg.view,
    head: { p: [CX + sx, sk.head[1]], depth: sk.head[0] },
    neck: { p: [CX + sx, sk.neck[1]], depth: sk.neck[0] },
    pelvis: { p: [CX + sx, sk.hip[1] + drop / 2], depth: sk.hip[0] },
    joints,
    progress,
  };
}

/** The point the frontal trajectory follows. */
export function frontalTrackPoint(fs: FrontalSkeleton, cfg: FrontalConfig): Vec {
  const t = cfg.track;
  if (t.side === 'mid') {
    if (t.joint === 'neck') return fs.neck.p;
    if (t.joint === 'hip') return fs.pelvis.p;
    const a = fs.joints[t.joint as FrontalJoint].N.p;
    const b = fs.joints[t.joint as FrontalJoint].F.p;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }
  if (t.joint === 'neck') return fs.neck.p;
  return fs.joints[t.joint as FrontalJoint][t.side].p;
}
