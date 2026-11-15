// src/domain/sixPackMotions.ts
/**
 * Demos for the 21 floor and standing ab drills in the core finishers (mountain climbers left out).
 * Side view: floor at y = 180. Lying on the back the head is on the left; planks face right.
 * Twists, crossing knees and leg circles happen sideways, so they are carried by the front-view
 * widths (and from there the 3-D views); the side view shows the heights and the curl.
 */
import type { SixPackDiagramType } from './exerciseVisualsData';
import type { FrontalConfig } from './frontalView';
import type { MotionDef } from './motionLibrary';
import type { Keyframe, LimbSpec, PoseSpec, Vec } from './motionRig';

const to = (x: number, y: number, bend: 1 | -1 = 1): LimbSpec => ({ to: [x, y], bend });
const rel = (j: 'neck' | 'hip' | 'head', dx: number, dy: number, bend: 1 | -1 = 1): LimbSpec => ({ to: { rel: j, d: [dx, dy] }, bend });
const ang = (a: number, b: number): LimbSpec => ({ a: [a, b] });
const kf = (at: number, pose: PoseSpec): Keyframe => ({ at, pose });
const two = (start: PoseSpec, end: PoseSpec): Keyframe[] => [kf(0, start), kf(1, end)];
/** nine keys round one circle: centre + amplitude * cos/sin of the angle */
const wave = (c: number, amp: number, fn: 'sin' | 'cos'): number[] =>
  [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => c + amp * Math[fn]((i / 8) * 2 * Math.PI));
/** evenly spaced keys over the rep */
const even = (poses: PoseSpec[]): Keyframe[] => poses.map((p, i) => kf(i / (poses.length - 1), p));
const with_ = (p: PoseSpec, q: Partial<PoseSpec>): PoseSpec => ({ ...p, ...q });

// --- shared positions --------------------------------------------------------------------------
/** lying on the back, head left; arms long by the sides on the floor */
const ARMS_AT_SIDES = ang(3, 3);
/** hands cupped behind the head, elbows out wide (the front views spread the elbows) */
const HANDS_BEHIND_HEAD = rel('head', -3, 7, -1);
/** forearm plank, head right: elbows under the shoulders */
const PLANK: PoseSpec = { hip: [88, 148], torso: -5, head: -2, armN: to(162, 175, -1), legN: to(12, 165, 1), footN: 115 };

export const SIX_PACK_MOTIONS: Record<SixPackDiagramType, MotionDef> = {
  // ---------------------------------------------------------------- lower abs (pelvis toward ribs)
  sp_heels_heavens: {
    title: 'Heels to the heavens',
    order: 'concentric-first',
    // legs straight up; the low back peels off the floor and the heels drive straight up, no swing
    frames: two(
      { hip: [104, 170], torso: 180, head: 182, armN: ARMS_AT_SIDES, legN: ang(-88, -88), footN: -10 },
      { hip: [102, 157], torso: 195, head: 188, armN: ARMS_AT_SIDES, legN: ang(-92, -92), footN: -10 }
    ),
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'ankleN' },
    trackLabel: 'Heels push straight up',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Legs straight up, arms long by the sides',
    endCue: 'Curl the hips off the floor, heels to the ceiling',
  },

  sp_iso_reverse_crunch: {
    title: 'ISO reverse crunch',
    order: 'hold',
    // knees tucked over the hips; the pelvis curls up toward the ribs and is held there
    frames: two(
      { hip: [108, 170], torso: 180, head: 182, armN: ARMS_AT_SIDES, legN: ang(-108, -20), footN: -30 },
      { hip: [105, 161], torso: 192, head: 186, armN: ARMS_AT_SIDES, legN: ang(-138, -42), footN: -55 }
    ),
    props: [],
    scenery: [],
    worked: ['torso'],
    track: { joint: 'kneeN' },
    trackLabel: 'Knees curl toward the head',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Knees over the hips, shins level',
    endCue: 'Tailbone curls up off the floor, hold it there',
  },

  sp_flutter_kicks: {
    title: 'Flutter kicks',
    order: 'cycle',
    // straight legs a few inches off the floor; small fast alternating kicks
    frames: two(
      { hip: [104, 170], torso: 180, head: 186, armN: ARMS_AT_SIDES, legN: ang(-24, -24), legF: ang(-7, -7), footN: -70, footF: -70 },
      { hip: [104, 170], torso: 180, head: 186, armN: ARMS_AT_SIDES, legN: ang(-7, -7), legF: ang(-24, -24), footN: -70, footF: -70 }
    ),
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'ankleN' },
    trackLabel: 'Small alternating kicks',
    startCue: 'Low back flat, legs long just off the floor',
    endCue: 'Kick small and quick, legs never touch down',
  },

  sp_scissors: {
    title: 'Scissors',
    order: 'loop',
    // legs hover low; they open wide and cross over, alternating which leg is on top (front views)
    frames: even([
      { hip: [104, 170], torso: 180, head: 186, armN: ARMS_AT_SIDES, legN: ang(-12, -12), legF: ang(-12, -12), footN: -60, footF: -60 },
      { hip: [104, 170], torso: 180, head: 186, armN: ARMS_AT_SIDES, legN: ang(-16, -16), legF: ang(-10, -10), footN: -60, footF: -60 },
      { hip: [104, 170], torso: 180, head: 186, armN: ARMS_AT_SIDES, legN: ang(-12, -12), legF: ang(-12, -12), footN: -60, footF: -60 },
      { hip: [104, 170], torso: 180, head: 186, armN: ARMS_AT_SIDES, legN: ang(-10, -10), legF: ang(-16, -16), footN: -60, footF: -60 },
      { hip: [104, 170], torso: 180, head: 186, armN: ARMS_AT_SIDES, legN: ang(-12, -12), legF: ang(-12, -12), footN: -60, footF: -60 },
    ]),
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'ankleN' },
    trackLabel: 'Legs open and cross',
    startCue: 'Legs low and long, low back down',
    endCue: 'Open wide, cross over, switch the top leg',
  },

  sp_hands_back_tucks: {
    title: 'Hands-back tucks',
    order: 'concentric-first',
    // seated, leaning back on the hands: legs reach long, then the knees tuck in to the chest
    frames: two(
      { hip: [100, 172], torso: -142, head: -130, armN: to(70, 177, -1), legN: ang(-8, -8), footN: -20 },
      { hip: [100, 172], torso: -118, head: -105, armN: to(70, 177, -1), legN: ang(-62, 40), footN: 10 }
    ),
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'kneeN' },
    trackLabel: 'Knees pull in to the chest',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Lean back on the hands, legs long, feet off the floor',
    endCue: 'Tuck the knees to the chest, chest comes to meet them',
  },

  // ---------------------------------------------------------------- middle (both ends meet)
  sp_hands_free_tucks: {
    title: 'Hands-free tucks',
    order: 'concentric-first',
    // balanced on the seat, hands at the chest: legs and torso open long, then fold together
    frames: two(
      { hip: [102, 172], torso: -138, head: -126, armN: rel('neck', 15, 9, -1), legN: ang(-10, -10), footN: -20 },
      { hip: [102, 172], torso: -110, head: -98, armN: rel('neck', 15, 9, -1), legN: ang(-64, 38), footN: 10 }
    ),
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'kneeN' },
    trackLabel: 'Knees and chest meet',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Balance on the seat, hands at the chest, legs long',
    endCue: 'Fold in: knees to the chest, no hands on the floor',
  },

  sp_vups: {
    title: 'V-ups',
    order: 'concentric-first',
    // lying long, arms overhead; legs and torso rise together and the hands reach for the feet
    frames: [
      kf(0, { hip: [108, 170], torso: 180, head: 182, armN: ang(183, 183), legN: ang(0, 0), footN: -80 }),
      kf(0.5, { hip: [108, 171], torso: 208, head: 212, armN: ang(255, 255), legN: ang(-28, -28), footN: -60 }),
      kf(1, { hip: [108, 172], torso: 236, head: 244, armN: ang(342, 342), legN: ang(-56, -56), footN: -40 }),
    ],
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'handN' },
    trackLabel: 'Hands reach for the toes',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Lie long, arms overhead, legs straight',
    endCue: 'Fold into a V: hands reach to the toes',
  },

  sp_x_man_crunch: {
    title: '"X" man crunch',
    order: 'concentric-first',
    // lying in a wide X; everything pulls into the middle: knees to the chest, hands to the shins
    frames: [
      kf(0, { hip: [106, 170], torso: 180, head: 182, armN: rel('neck', -40, -2, -1), legN: to(176, 172, 1), footN: -80 }),
      kf(0.5, { hip: [106, 171], torso: 212, head: 218, armN: rel('neck', 6, -44, -1), legN: ang(-34, 4), footN: -40 }),
      kf(1, { hip: [106, 172], torso: 238, head: 246, armN: rel('neck', 44, 12, -1), legN: ang(-58, 22), footN: 0 }),
    ],
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'handN' },
    trackLabel: 'Hands and knees meet in the middle',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Lie in a wide X, arms and legs long',
    endCue: 'Crunch into a ball: hands to the shins, balance on the seat',
  },

  sp_marching_plank: {
    title: 'Marching plank',
    order: 'cycle',
    // forearm plank; one straight leg lifts high behind, then the other, hips stay square
    frames: [
      kf(0, with_(PLANK, { legN: ang(198, 198), legF: to(12, 165, 1), footN: 120, footF: 115 })),
      kf(0.5, with_(PLANK, { legN: to(12, 165, 1), legF: to(12, 165, 1) })),
      kf(1, with_(PLANK, { legN: to(12, 165, 1), legF: ang(198, 198), footN: 115, footF: 120 })),
    ],
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'ankleN' },
    trackLabel: 'Straight leg lifts behind',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Forearm plank, body in one line',
    endCue: 'Lift one straight leg high, then the other; hips stay level',
  },

  sp_tuck_plank_opposite: {
    title: 'Tuck plank, knee to opposite elbow',
    order: 'cycle',
    // forearm plank; one knee tucks under the body toward the opposite elbow, back out, then the other
    frames: [
      kf(0, { hip: [90, 138], torso: 8, head: 10, armN: to(162, 175, -1), legN: to(94, 156, 1), legF: to(19, 164, 1), footN: 182, footF: 115 }),
      // hips stay a little high while the knee travels, so it skims just over the floor
      kf(0.25, { hip: [90, 134], torso: 12, head: 12, armN: to(162, 175, -1), legN: to(54, 154, 1), legF: to(21, 163, 1), footN: 150, footF: 115 }),
      kf(0.5, with_(PLANK, { legN: to(12, 165, 1), legF: to(12, 165, 1) })),
      kf(0.75, { hip: [90, 134], torso: 12, head: 12, armN: to(162, 175, -1), legN: to(21, 163, 1), legF: to(54, 154, 1), footN: 115, footF: 150 }),
      kf(1, { hip: [90, 138], torso: 8, head: 10, armN: to(162, 175, -1), legN: to(19, 164, 1), legF: to(94, 156, 1), footN: 115, footF: 182 }),
    ],
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'kneeN' },
    trackLabel: 'Knee tucks across',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Forearm plank, push the floor away',
    endCue: 'Tuck the knee across to the opposite elbow',
  },

  sp_russian_v_tuck_twist: {
    title: 'Russian "V" tuck twist',
    order: 'cycle',
    // balanced in a V, hands together: legs extend long at the centre, tuck in as the hands twist to a side
    frames: [
      kf(0, { hip: [104, 172], torso: -112, head: -100, armN: rel('neck', 17, 12, -1), legN: ang(-60, 30), footN: 10 }),
      kf(0.5, { hip: [104, 172], torso: -134, head: -122, armN: rel('neck', 22, 6, -1), legN: ang(-16, -16), footN: -20 }),
      kf(1, { hip: [104, 172], torso: -112, head: -100, armN: rel('neck', 17, 12, -1), legN: ang(-60, 30), footN: 10 }),
    ],
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'handN' },
    trackLabel: 'Hands twist side to side',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Balance in a V, legs long, hands together',
    endCue: 'Tuck the knees and twist the hands to one hip',
  },

  sp_seated_ab_circles: {
    title: 'Seated ab circles',
    order: 'loop',
    // leaning back on the hands; straight legs together draw a circle (the front views show the width)
    frames: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
      const t = (i / 8) * 2 * Math.PI;
      const a = -24 - 12 * Math.sin(t);
      // ankles sit 4 +/- 22 from the midline (front view); the hip sockets sit 8.5 out
      const short = (dz: number) => Math.sqrt(1 - (dz / 78) ** 2);
      const c = 22 * Math.cos(t);
      return kf(i / 8, { hip: [100, 172], torso: -136, head: -124, armN: to(68, 177, -1), legN: ang(a, a), footN: a - 40, scaleN: short(c - 4.5), scaleF: short(-c - 4.5) });
    }),
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'ankleN' },
    trackLabel: 'Feet draw a circle',
    startCue: 'Lean back on the hands, legs long and together',
    endCue: 'Draw big circles with the feet, torso still',
  },

  sp_btb_pass: {
    title: 'Behind-the-back ball pass',
    order: 'loop',
    // seated, knees bent, leaning back a little: the ball goes round the waist, front -> behind -> front
    frames: (
      [
        [0, [118, 158], [118, 158]],
        [0.125, [113, 162], [112, 160]],
        [0.25, [102, 165], [101, 163]],
        [0.375, [90, 162], [89, 160]],
        [0.5, [86, 156], [86, 156]],
        [0.625, [89, 160], [90, 162]],
        [0.75, [101, 163], [102, 165]],
        [0.875, [112, 160], [113, 162]],
        [1, [118, 158], [118, 158]],
      ] as [number, Vec, Vec][]
    ).map(([at, n, f]) =>
      kf(at, { hip: [100, 172], torso: -112, head: -100, armN: to(n[0], n[1], -1), armF: to(f[0], f[1], -1), legN: to(160, 176, 1), footN: 0 })
    ),
    props: [{ kind: 'kettlebell', ball: true, at: 'handN', d: [0, 2], handoff: { at: 'handF', from: 0.5, to: 1 } }],
    scenery: [],
    worked: ['torso'],
    track: { prop: 0 },
    trackLabel: 'Ball circles the waist',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Sit tall, lean back a little, ball in front',
    endCue: 'Pass it behind the back and round, torso twists',
  },

  sp_windshield_wipers: {
    title: 'Bent-knee windshield wipers',
    order: 'loop',
    // arms out wide, knees bent at 90/90: the knees drop slowly to one side, back to centre, to the other
    frames: even([
      { hip: [106, 170], torso: 180, head: 182, armN: ARMS_AT_SIDES, legN: ang(-90, 0), footN: -70 },
      { hip: [106, 170], torso: 180, head: 182, armN: ARMS_AT_SIDES, legN: to(142, 152, 1), footN: -40 },
      { hip: [106, 170], torso: 180, head: 182, armN: ARMS_AT_SIDES, legN: ang(-90, 0), footN: -70 },
      { hip: [106, 170], torso: 180, head: 182, armN: ARMS_AT_SIDES, legN: to(142, 152, 1), footN: -40 },
      { hip: [106, 170], torso: 180, head: 182, armN: ARMS_AT_SIDES, legN: ang(-90, 0), footN: -70 },
    ]),
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'kneeN' },
    trackLabel: 'Knees drop side to side',
    startCue: 'Arms out on the floor, knees bent and stacked over the hips',
    endCue: 'Lower the knees to one side, shoulders stay down',
  },

  sp_standing_ab_twist: {
    title: 'Standing ab twist',
    order: 'cycle',
    // standing, fists by the ears: one knee drives up and across as the opposite elbow twists down to it
    frames: [
      kf(0, { hip: [96, 100], torso: -80, head: -84, armN: rel('head', -2, 2, -1), legN: ang(-12, 82), legF: to(95, 176), footN: 60, footF: 0 }),
      kf(0.5, { hip: [96, 98.5], torso: -90, head: -90, armN: rel('head', -2, 2, -1), legN: to(97, 176), legF: to(95, 176), footN: 0, footF: 0 }),
      kf(1, { hip: [96, 100], torso: -80, head: -84, armN: rel('head', -2, 2, -1), legN: to(97, 176), legF: ang(-12, 82), footN: 0, footF: 60 }),
    ],
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'kneeN' },
    trackLabel: 'Knee drives up and across',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Stand tall, fists by the ears, elbows wide',
    endCue: 'Knee up and across to the opposite elbow',
  },

  // ---------------------------------------------------------------- upper abs (ribs toward pelvis)
  sp_9090_crunch: {
    title: '90/90 crunch',
    order: 'concentric-first',
    // hips and knees held at 90 degrees; only the upper back curls up off the floor
    frames: two(
      { hip: [110, 170], torso: 180, head: 182, armN: HANDS_BEHIND_HEAD, legN: ang(-90, 0), footN: -70 },
      { hip: [110, 170], torso: 208, head: 222, armN: HANDS_BEHIND_HEAD, legN: ang(-90, 0), footN: -70 }
    ),
    props: [],
    scenery: [],
    worked: ['torso'],
    track: { joint: 'neck' },
    trackLabel: 'Shoulder blades curl up',
    startCue: 'Hips and knees at 90 degrees, hands behind the head',
    endCue: 'Curl the shoulder blades up, ribs to the hips',
  },

  sp_crunch_and_twist: {
    title: 'Crunch and twist',
    order: 'cycle',
    // knees bent, feet flat: crunch up and turn one elbow toward the opposite knee, down, other side
    frames: [
      kf(0, { hip: [112, 170], torso: 204, head: 216, armN: HANDS_BEHIND_HEAD, legN: to(146, 176, 1), footN: 0 }),
      kf(0.5, { hip: [112, 170], torso: 182, head: 184, armN: HANDS_BEHIND_HEAD, legN: to(146, 176, 1), footN: 0 }),
      kf(1, { hip: [112, 170], torso: 204, head: 216, armN: HANDS_BEHIND_HEAD, legN: to(146, 176, 1), footN: 0 }),
    ],
    props: [],
    scenery: [],
    worked: ['torso'],
    track: { joint: 'elbowN' },
    trackLabel: 'Elbow turns to the opposite knee',
    startCue: 'Knees bent, feet flat, hands behind the head',
    endCue: 'Crunch up and twist: elbow toward the opposite knee',
  },

  sp_upper_circle_crunch: {
    title: 'Upper circle crunch',
    order: 'loop',
    // legs long on the floor: the upper body curls up and draws a circle, side, top, other side, down
    frames: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
      const t = (i / 8) * 2 * Math.PI;
      const up = 0.5 - 0.5 * Math.cos(t);
      return kf(i / 8, { hip: [110, 170], torso: 182 + 20 * up, head: 184 + 28 * up, armN: HANDS_BEHIND_HEAD, legN: ang(0, 0), footN: -80 });
    }),
    props: [],
    scenery: [],
    worked: ['torso'],
    track: { joint: 'head' },
    trackLabel: 'Upper body draws a circle',
    startCue: 'Legs long on the floor, hands behind the head',
    endCue: 'Curl up and circle round, keep the chin off the chest',
  },

  sp_jackknife: {
    title: 'Alternating jackknife',
    order: 'cycle',
    // lying long: one straight leg swings up as the torso curls and the hands reach for that foot
    frames: [
      kf(0, { hip: [108, 170], torso: 216, head: 224, armN: ang(325, 325), legN: ang(-78, -78), legF: ang(-4, -4), footN: -20, footF: -70 }),
      kf(0.5, { hip: [108, 170], torso: 182, head: 184, armN: ang(186, 186), legN: ang(-4, -4), legF: ang(-4, -4), footN: -70, footF: -70 }),
      kf(1, { hip: [108, 170], torso: 216, head: 224, armN: ang(325, 325), legN: ang(-4, -4), legF: ang(-78, -78), footN: -70, footF: -20 }),
    ],
    props: [],
    scenery: [],
    worked: ['torso', 'thN', 'thF'],
    track: { joint: 'handN' },
    trackLabel: 'Hands reach to the raised foot',
    angle: { joints: ['neck', 'hip', 'kneeN'], label: 'Hip' },
    startCue: 'Lie long, arms overhead, legs just off the floor',
    endCue: 'One leg up, curl up and reach both hands to that foot',
  },

  // ---------------------------------------------------------------- obliques (side of the trunk)
  sp_side_crunch: {
    title: 'Side crunch',
    order: 'concentric-first',
    // on one side, knees bent and stacked: the top elbow drives toward the hip, shoulders lift sideways
    frames: two(
      { hip: [112, 168], torso: 180, head: 181, armN: HANDS_BEHIND_HEAD, armF: ang(182, 182), legN: ang(6, 4), footN: 4, scaleN: 0.8 },
      { hip: [112, 168], torso: 200, head: 208, armN: HANDS_BEHIND_HEAD, armF: ang(170, 170), legN: ang(6, 4), footN: 4, scaleN: 0.8 }
    ),
    props: [],
    scenery: [],
    worked: ['torso'],
    track: { joint: 'neck' },
    trackLabel: 'Shoulders lift sideways',
    startCue: 'Lie on one side, knees bent, top hand behind the head',
    endCue: 'Crunch sideways: top elbow toward the hip',
  },

  sp_side_plank_lifts: {
    title: 'Side plank hip lifts',
    order: 'eccentric-first',
    // straight-arm side plank, top arm to the ceiling: hips dip toward the floor and drive back up
    frames: two(
      { hip: [82.8, 146.8], torso: -18, head: -20, armN: to(132, 177, -1), armF: ang(-90, -90), legN: to(12, 172, 1), footN: 180 },
      { hip: [88, 157.8], torso: -32, head: -30, armN: to(132, 177, -1), armF: ang(-90, -90), legN: to(12, 172, 1), footN: 180 }
    ),
    props: [],
    scenery: [],
    worked: ['torso', 'uaN'],
    track: { joint: 'hip' },
    trackLabel: 'Hips dip and lift',
    startCue: 'Hand under the shoulder, body in one line, top arm up',
    endCue: 'Dip the hips toward the floor, drive them back up',
  },
};

/** front / back widths for the same drills (see frontalView.ts) */
export const SIX_PACK_FRONTAL: Record<SixPackDiagramType, FrontalConfig> = {
  sp_heels_heavens: {
    view: 'front', label: 'Feet-end',
    lat: { hand: 18, elbow: 17, knee: 4, ankle: 3, toe: 4 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'ankle', side: 'N', label: 'Heels rise straight up' },
    cue: 'Legs together and straight up; push, do not swing',
  },
  sp_iso_reverse_crunch: {
    view: 'front', label: 'Feet-end',
    lat: { hand: 18, elbow: 17, knee: 6, ankle: 6, toe: 7 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'knee', side: 'N', label: 'Knees stay together' },
    cue: 'Knees together on the midline, hips curl straight up',
  },
  sp_flutter_kicks: {
    view: 'front', label: 'Feet-end',
    lat: { hand: 18, elbow: 17, knee: 6, ankle: 6, toe: 7 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'ankle', side: 'N', label: 'Legs kick up and down' },
    cue: 'Legs stay hip-width and kick straight up and down',
  },
  sp_scissors: {
    view: 'front', label: 'Feet-end',
    // open, right leg crosses over, open, left leg crosses over, open
    lat: {
      hand: 18, elbow: 17,
      knee: { N: [16, -4, 16, 3, 16], F: [16, 3, 16, -4, 16] },
      ankle: { N: [24, -8, 24, 4, 24], F: [24, 4, 24, -8, 24] },
      toe: { N: [25, -8, 25, 4, 25], F: [25, 4, 25, -8, 25] },
    },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'ankle', side: 'N', label: 'Legs open and cross' },
    cue: 'Open wide, then cross; the top leg switches each time',
  },
  sp_hands_back_tucks: {
    view: 'front', label: 'Front',
    lat: { hand: 20, elbow: 19, knee: 6, ankle: 5, toe: 6 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'knee', side: 'N', label: 'Knees pull in together' },
    cue: 'Knees together, chest stays open',
  },
  sp_hands_free_tucks: {
    view: 'front', label: 'Front',
    lat: { hand: 3, elbow: 16, knee: 6, ankle: 5, toe: 6 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'knee', side: 'N', label: 'Knees pull in together' },
    cue: 'Balance on the seat; knees and chest meet in the middle',
  },
  sp_vups: {
    view: 'front', label: 'Front',
    lat: { hand: 10, elbow: 12, knee: 5, ankle: 4, toe: 5 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Hands reach to the feet' },
    cue: 'Arms and legs rise together and meet over the hips',
  },
  sp_x_man_crunch: {
    view: 'front', label: 'Front',
    lat: { hand: [44, 8], elbow: [30, 13], knee: [17, 7], ankle: [26, 6], toe: [28, 7] },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Wide X pulls into a ball' },
    cue: 'Arms and legs start wide and pull into the middle together',
  },
  sp_marching_plank: {
    view: 'front', label: 'Head-end',
    lat: { hand: 9, elbow: 13, knee: 8, ankle: 9, toe: 9 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'hip', side: 'mid', label: 'Hips stay level' },
    cue: 'Hips stay level and square while a leg lifts',
  },
  sp_tuck_plank_opposite: {
    view: 'front', label: 'Head-end',
    lat: {
      hand: 9, elbow: 13, scap: [12, 9, 12],
      knee: { N: [-7, 8, 8], F: [8, 8, -7] },
      ankle: { N: [2, 9, 9], F: [9, 9, 2] },
      toe: { N: [3, 9, 9], F: [9, 9, 3] },
    },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'knee', side: 'N', label: 'Knee crosses the midline' },
    cue: 'Knee travels under the body to the opposite elbow',
  },
  sp_russian_v_tuck_twist: {
    view: 'front', label: 'Front',
    // tucked + twisted to the lifter's right, long at the centre, tucked + twisted to the left
    lat: {
      hand: { N: [22, 3, -16], F: [-16, 3, 22] },
      elbow: { N: [24, 14, 6], F: [6, 14, 24] },
      knee: 6, ankle: 5, toe: 6,
    },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Hands twist side to side' },
    cue: 'Hands travel hip to hip while the knees tuck',
  },
  sp_seated_ab_circles: {
    view: 'front', label: 'Front',
    lat: {
      hand: 18, elbow: 17,
      // both legs together sweep side to side, a quarter turn out of step with the up-down of the side view
      knee: { N: wave(6, 11, 'cos'), F: wave(6, -11, 'cos') },
      ankle: { N: wave(4, 22, 'cos'), F: wave(4, -22, 'cos') },
      toe: { N: wave(5, 24, 'cos'), F: wave(5, -24, 'cos') },
    },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'ankle', side: 'N', label: 'Feet draw a circle' },
    cue: 'Legs stay glued together; the circle comes from the hips',
  },
  sp_btb_pass: {
    view: 'front', label: 'Front',
    lat: {
      hand: { N: [3, 18, 24, 18, 3, 13, 17, 13, 3], F: [3, 13, 17, 13, 3, 18, 24, 18, 3] },
      elbow: { N: [14, 22, 25, 22, 15, 18, 19, 18, 14], F: [14, 18, 19, 18, 15, 22, 25, 22, 14] },
      knee: 9, ankle: 8, toe: 9,
    },
    props: [{ kind: 'kettlebell', ball: true, side: 'N', d: [0, 2], handoff: { side: 'F', from: 0.5, to: 1 } }],
    scenery: [], guide: 'midline',
    track: { joint: 'hip', side: 'mid', label: 'Seat stays planted' },
    cue: 'Torso turns to each side as the ball goes round',
  },
  sp_windshield_wipers: {
    view: 'front', label: 'Feet-end',
    // centre, knees to the lifter's right, centre, knees to the left, centre
    lat: {
      hand: 30, elbow: 22,
      knee: { N: [5, 27, 5, -17, 5], F: [5, -17, 5, 27, 5] },
      ankle: { N: [5, 38, 5, -28, 5], F: [5, -28, 5, 38, 5] },
      toe: { N: [6, 40, 6, -28, 6], F: [6, -28, 6, 40, 6] },
    },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'knee', side: 'N', label: 'Knees sweep side to side' },
    cue: 'Knees stay together; both shoulders stay on the floor',
  },
  sp_standing_ab_twist: {
    view: 'front', label: 'Front',
    lat: {
      hand: { N: [12, 20, 20], F: [20, 20, 12] },
      elbow: { N: [30, 32, 22], F: [22, 32, 30] },
      knee: { N: [-2, 9, 9], F: [9, 9, -2] },
      ankle: { N: [4, 10, 10], F: [10, 10, 4] },
      toe: { N: [5, 12, 12], F: [12, 12, 5] },
    },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'knee', side: 'N', label: 'Knee crosses toward the midline' },
    cue: 'Opposite elbow and knee meet in front of the body',
  },
  sp_9090_crunch: {
    view: 'front', label: 'Feet-end',
    lat: { hand: 8, elbow: 28, knee: 8, ankle: 8, toe: 9 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'neck', side: 'mid', label: 'Shoulders lift evenly' },
    cue: 'Elbows stay wide; knees stay still over the hips',
  },
  sp_crunch_and_twist: {
    view: 'front', label: 'Feet-end',
    // up turned to the lifter's right, down, up turned to the left
    lat: {
      hand: 8,
      elbow: { N: [26, 23, 12], F: [12, 23, 26] },
      knee: 11, ankle: 10, toe: 11,
    },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'elbow', side: 'F', label: 'Elbow crosses toward the knee' },
    cue: 'Turn the shoulder across, not just the elbow',
  },
  sp_upper_circle_crunch: {
    view: 'front', label: 'Feet-end',
    lat: {
      hand: 8,
      shoulder: { N: wave(15, 4, 'sin'), F: wave(15, -4, 'sin') },
      elbow: { N: wave(22, 5, 'sin'), F: wave(22, -5, 'sin') },
      knee: 5, ankle: 4, toe: 5,
    },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'neck', side: 'mid', label: 'Upper body circles' },
    cue: 'Upper body sweeps side to side as it circles; hips stay down',
  },
  sp_jackknife: {
    view: 'front', label: 'Front',
    lat: {
      hand: { N: [11, 9, 1], F: [1, 9, 11] },
      elbow: { N: [14, 13, 8], F: [8, 13, 14] },
      knee: 6, ankle: 5, toe: 6,
    },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'hand', side: 'N', label: 'Both hands go to the raised foot' },
    cue: 'Both hands reach to the raised foot; the other leg hovers',
  },
  sp_side_crunch: {
    view: 'front', label: 'Top',
    // lying on the left side: knees bent forward (toward the viewer), top elbow wide
    lat: { hand: { N: 8, F: 14 }, elbow: { N: 26, F: 16 }, knee: { N: -24, F: 24 }, ankle: { N: -12, F: 12 }, toe: { N: -14, F: 14 } },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'neck', side: 'mid', label: 'Shoulders lift sideways' },
    cue: 'Knees stay stacked; lift straight up sideways, no rolling back',
  },
  sp_side_plank_lifts: {
    view: 'front', label: 'Front',
    lat: { hand: { N: 10, F: 8 }, elbow: { N: 12, F: 10 }, shoulder: 14, hip: 8, knee: 5, ankle: 5, toe: 5 },
    props: [], scenery: [], guide: 'midline',
    track: { joint: 'hip', side: 'mid', label: 'Hips stay stacked' },
    cue: 'Hips stay stacked over each other as they dip and lift',
  },
};
