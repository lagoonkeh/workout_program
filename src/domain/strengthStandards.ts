// src/domain/strengthStandards.ts
/**
 * Strength-development heatmap model (Symmetric-Strength style).
 *
 * 1. Each barbell lift gets a bodyweight-relative score from your best recent 1RM
 *    (tested on the quarterly assessment, or estimated from logged sets with Epley).
 * 2. Each muscle's score is the weighted average of the lifts that load it.
 * 3. Muscles can be rated against the general standards the app already uses, or as a
 *    percentage of the published average for an athlete group.
 *
 * Every athlete reference value below comes from a peer-reviewed study (see SOURCES).
 * Where no comparable published data exists for a lift or sport, the value is left out
 * rather than guessed, and the UI shows that muscle as "no data".
 */
import type { CompletedWorkoutSession } from '../storage/storageManager';
import type { QuarterlyAssessmentRecord } from './fitnessAssessment';

export type LiftId = 'squat' | 'deadlift' | 'bench' | 'ohp' | 'pullups';
export type MuscleId =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'lats'
  | 'traps'
  | 'core'
  | 'lower_back'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves';

export type StrengthTier = 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced' | 'Elite';

export interface LiftInfo {
  id: LiftId;
  name: string;
  /** 'ratio' = 1RM / bodyweight; 'reps' = strict bodyweight reps */
  unit: 'ratio' | 'reps';
}

export const LIFTS: LiftInfo[] = [
  { id: 'squat', name: 'Back Squat', unit: 'ratio' },
  { id: 'deadlift', name: 'Deadlift', unit: 'ratio' },
  { id: 'bench', name: 'Bench Press', unit: 'ratio' },
  { id: 'ohp', name: 'Overhead Press', unit: 'ratio' },
  { id: 'pullups', name: 'Strict Pull-ups', unit: 'reps' },
];

export const MUSCLES: { id: MuscleId; name: string; view: 'front' | 'back' }[] = [
  { id: 'chest', name: 'Chest', view: 'front' },
  { id: 'shoulders', name: 'Shoulders', view: 'front' },
  { id: 'biceps', name: 'Biceps', view: 'front' },
  { id: 'core', name: 'Core', view: 'front' },
  { id: 'quads', name: 'Quads', view: 'front' },
  { id: 'calves', name: 'Calves', view: 'back' },
  { id: 'traps', name: 'Traps', view: 'back' },
  { id: 'lats', name: 'Lats', view: 'back' },
  { id: 'triceps', name: 'Triceps', view: 'back' },
  { id: 'lower_back', name: 'Lower Back', view: 'back' },
  { id: 'glutes', name: 'Glutes', view: 'back' },
  { id: 'hamstrings', name: 'Hamstrings', view: 'back' },
];

/**
 * How much each lift counts toward each muscle (weights sum to 1 per muscle).
 * Prime movers get the larger share, following standard EMG/biomechanics descriptions
 * of the five lifts. Calves are not meaningfully loaded by any of them.
 */
export const MUSCLE_LIFT_WEIGHTS: Record<MuscleId, Partial<Record<LiftId, number>>> = {
  chest: { bench: 1 },
  shoulders: { ohp: 0.65, bench: 0.35 },
  triceps: { bench: 0.5, ohp: 0.5 },
  biceps: { pullups: 1 },
  lats: { pullups: 0.75, deadlift: 0.25 },
  traps: { deadlift: 0.6, ohp: 0.4 },
  core: { squat: 0.4, deadlift: 0.4, ohp: 0.2 },
  lower_back: { deadlift: 0.7, squat: 0.3 },
  quads: { squat: 1 },
  hamstrings: { deadlift: 1 },
  glutes: { squat: 0.5, deadlift: 0.5 },
  calves: {},
};

/**
 * General standards = percentile among lifters, from Strength Level's community data
 * (bench 48.7 M, squat 25.0 M, deadlift 23.0 M, press 0.9 M, pull-ups 4.9 M logged lifts).
 * Strength Level sets each level at a fixed percentile of its male lifters:
 * Beginner 5th · Novice 20th · Intermediate 50th · Advanced 80th · Elite 95th.
 * Male bodyweight tables, 110–310 lb; values between rows are interpolated by bodyweight.
 */
export const PERCENTILE_ANCHORS = [5, 20, 50, 80, 95] as const;

type Row = [number, number, number, number, number, number]; // bodyweight, B, N, I, A, E

export const STRENGTH_LEVEL_TABLES: Record<LiftId, { unit: 'lb' | 'reps'; rows: Row[] }> = {
  squat: {
    unit: 'lb',
    rows: [
      [110, 79, 120, 172, 234, 301], [120, 92, 136, 192, 257, 327], [130, 106, 153, 211, 279, 352],
      [140, 119, 168, 229, 300, 376], [150, 132, 184, 247, 320, 399], [160, 145, 199, 265, 340, 421],
      [170, 157, 213, 282, 359, 442], [180, 169, 228, 298, 377, 462], [190, 182, 242, 314, 395, 482],
      [200, 193, 255, 329, 413, 501], [210, 205, 269, 344, 430, 520], [220, 216, 281, 359, 446, 538],
      [230, 227, 294, 373, 462, 555], [240, 238, 307, 387, 477, 572], [250, 249, 319, 401, 493, 589],
      [260, 260, 331, 414, 507, 605], [270, 270, 342, 427, 522, 621], [280, 280, 354, 440, 536, 636],
      [290, 290, 365, 452, 550, 651], [300, 300, 376, 465, 563, 666], [310, 309, 387, 477, 576, 680],
    ],
  },
  deadlift: {
    unit: 'lb',
    rows: [
      [110, 101, 150, 211, 283, 361], [120, 116, 168, 233, 308, 389], [130, 131, 186, 254, 332, 416],
      [140, 146, 203, 274, 355, 442], [150, 160, 220, 293, 377, 466], [160, 174, 236, 312, 398, 490],
      [170, 188, 252, 330, 419, 513], [180, 201, 268, 348, 438, 535], [190, 214, 283, 365, 458, 556],
      [200, 227, 297, 382, 476, 576], [210, 239, 312, 398, 494, 596], [220, 252, 326, 413, 512, 615],
      [230, 263, 339, 429, 529, 634], [240, 275, 352, 443, 545, 652], [250, 287, 365, 458, 561, 669],
      [260, 298, 378, 472, 577, 686], [270, 309, 390, 486, 592, 703], [280, 320, 402, 499, 607, 719],
      [290, 330, 414, 513, 622, 735], [300, 341, 426, 526, 636, 751], [310, 351, 437, 538, 650, 766],
    ],
  },
  bench: {
    unit: 'lb',
    rows: [
      [110, 60, 90, 128, 172, 221], [120, 70, 102, 142, 189, 240], [130, 80, 114, 156, 205, 258],
      [140, 89, 125, 170, 221, 276], [150, 99, 137, 183, 236, 292], [160, 108, 148, 196, 250, 308],
      [170, 118, 158, 208, 264, 324], [180, 127, 169, 220, 277, 339], [190, 136, 179, 231, 290, 353],
      [200, 144, 189, 243, 303, 367], [210, 153, 199, 254, 315, 380], [220, 161, 208, 265, 327, 394],
      [230, 169, 218, 275, 339, 406], [240, 177, 227, 285, 350, 419], [250, 185, 236, 295, 361, 431],
      [260, 193, 244, 305, 372, 442], [270, 200, 253, 314, 383, 454], [280, 208, 261, 324, 393, 465],
      [290, 215, 269, 333, 403, 476], [300, 222, 278, 342, 413, 487], [310, 229, 285, 351, 422, 497],
    ],
  },
  ohp: {
    unit: 'lb',
    rows: [
      [110, 36, 55, 80, 109, 142], [120, 42, 63, 90, 121, 154], [130, 49, 71, 99, 131, 166],
      [140, 55, 78, 108, 141, 178], [150, 61, 86, 116, 151, 189], [160, 67, 93, 125, 161, 200],
      [170, 73, 100, 133, 170, 210], [180, 79, 107, 141, 179, 220], [190, 85, 114, 149, 188, 230],
      [200, 91, 120, 156, 196, 239], [210, 96, 127, 163, 205, 248], [220, 102, 133, 171, 213, 257],
      [230, 107, 139, 178, 220, 265], [240, 113, 145, 184, 228, 274], [250, 118, 151, 191, 235, 282],
      [260, 123, 157, 198, 242, 290], [270, 128, 163, 204, 250, 297], [280, 133, 168, 210, 256, 305],
      [290, 138, 174, 216, 263, 312], [300, 142, 179, 222, 270, 319], [310, 147, 184, 228, 276, 326],
    ],
  },
  // Strength Level lists Beginner as "< 1" (stored as 0.5) or 1 rep
  pullups: {
    unit: 'reps',
    rows: [
      [110, 0.5, 6, 14, 24, 34], [120, 0.5, 7, 14, 24, 34], [130, 0.5, 7, 14, 23, 33],
      [140, 0.5, 7, 14, 23, 32], [150, 0.5, 7, 14, 22, 31], [160, 0.5, 7, 14, 22, 30],
      [170, 0.5, 7, 13, 21, 29], [180, 1, 7, 13, 21, 28], [190, 1, 7, 13, 20, 28],
      [200, 1, 7, 12, 19, 27], [210, 1, 7, 12, 19, 26], [220, 0.5, 6, 11, 18, 25],
      [230, 0.5, 6, 11, 18, 24], [240, 0.5, 6, 11, 17, 24], [250, 0.5, 6, 10, 16, 23],
      [260, 0.5, 5, 10, 16, 22], [270, 0.5, 5, 10, 15, 21], [280, 0.5, 5, 9, 15, 21],
      [290, 0.5, 5, 9, 14, 20], [300, 0.5, 4, 9, 14, 19], [310, 0.5, 4, 9, 13, 19],
    ],
  },
};

/** Strength Level row for any bodyweight (linear between table rows, clamped to 110–310 lb). */
export function strengthLevelRow(lift: LiftId, bodyweightLbs: number): number[] {
  const rows = STRENGTH_LEVEL_TABLES[lift].rows;
  const bw = Math.min(rows[rows.length - 1][0], Math.max(rows[0][0], bodyweightLbs || 170));
  for (let i = 1; i < rows.length; i++) {
    if (bw <= rows[i][0]) {
      const a = rows[i - 1];
      const b = rows[i];
      const t = (bw - a[0]) / (b[0] - a[0]);
      return [1, 2, 3, 4, 5].map((k) => a[k] + (b[k] - a[k]) * t);
    }
  }
  return rows[rows.length - 1].slice(1);
}

/** Level thresholds in the lift's unit (× bodyweight for barbell lifts, reps for pull-ups). */
export function percentileThresholds(lift: LiftId, bodyweightLbs = 170): number[] {
  const row = strengthLevelRow(lift, bodyweightLbs);
  return STRENGTH_LEVEL_TABLES[lift].unit === 'reps' ? row : row.map((v) => v / Math.min(310, Math.max(110, bodyweightLbs || 170)));
}

/** Cooper Institute bench press / bodyweight norms for men (percentile → ratio), by age band. */
export const COOPER_BENCH_NORMS_MEN: { maxAge: number; points: [number, number][] }[] = [
  { maxAge: 19, points: [[5, 0.76], [20, 0.89], [40, 1.06], [60, 1.19], [80, 1.34], [95, 1.76]] },
  { maxAge: 29, points: [[5, 0.72], [20, 0.88], [40, 0.99], [60, 1.14], [80, 1.32], [95, 1.63]] },
  { maxAge: 39, points: [[5, 0.65], [20, 0.78], [40, 0.88], [60, 0.98], [80, 1.12], [95, 1.35]] },
  { maxAge: 49, points: [[5, 0.59], [20, 0.72], [40, 0.8], [60, 0.88], [80, 1.0], [95, 1.2]] },
  { maxAge: 59, points: [[5, 0.53], [20, 0.63], [40, 0.71], [60, 0.79], [80, 0.9], [95, 1.05]] },
  { maxAge: 200, points: [[5, 0.49], [20, 0.57], [40, 0.66], [60, 0.72], [80, 0.82], [95, 0.94]] },
];

export type SourceId =
  | 'latin1994'
  | 'mcbride2009'
  | 'stahl2019'
  | 'styles2016'
  | 'wisloff2004'
  | 'loturco2022'
  | 'vandenhoek2024'
  | 'strengthlevel'
  | 'cooper'
  | 'epley';

export interface SourceInfo {
  id: SourceId;
  citation: string;
  url: string;
}

export const SOURCES: Record<SourceId, SourceInfo> = {
  latin1994: {
    id: 'latin1994',
    citation:
      'Latin RW, Berg K, Baechle T. Physical and performance characteristics of NCAA Division I male basketball players. J Strength Cond Res. 1994;8(4):214–218.',
    url: 'https://researchworks.creighton.edu/esploro/outputs/journalArticle/Physical-and-performance-characteristics-of-NCAA/991005930217302656',
  },
  mcbride2009: {
    id: 'mcbride2009',
    citation:
      'McBride JM, Blow D, Kirby TJ, et al. Relationship between maximal squat strength and five, ten, and forty yard sprint times. J Strength Cond Res. 2009;23(6):1633–1636.',
    url: 'https://doi.org/10.1519/JSC.0b013e3181b2b8aa',
  },
  stahl2019: {
    id: 'stahl2019',
    citation:
      'Stahl CA, Mann JB, Lockie RG, Dawes JJ. Comparison of estimated-1RM and 225-lb bench press performance between starters and non-starters among a NCAA Division I college football team. Int J Phys Educ Fit Sports. 2019;8(4):64–75.',
    url: 'https://doi.org/10.26524/ijpefs194',
  },
  styles2016: {
    id: 'styles2016',
    citation:
      'Styles WJ, Matthews MJ, Comfort P. Effects of strength training on squat and sprint performance in soccer players. J Strength Cond Res. 2016;30(6):1534–1539.',
    url: 'https://doi.org/10.1519/JSC.0000000000001243',
  },
  wisloff2004: {
    id: 'wisloff2004',
    citation:
      'Wisløff U, Castagna C, Helgerud J, Jones R, Hoff J. Strong correlation of maximal squat strength with sprint performance and vertical jump height in elite soccer players. Br J Sports Med. 2004;38(3):285–288.',
    url: 'https://bjsm.bmj.com/content/38/3/285',
  },
  loturco2022: {
    id: 'loturco2022',
    citation:
      'Loturco I, McGuigan M, Freitas TT, et al. Squat and countermovement jump performance across a range of loads: a comparison between Smith machine and free weight execution modes in elite sprinters. Biol Sport. 2022;39(4):1043–1048.',
    url: 'https://doi.org/10.5114/biolsport.2022.112085',
  },
  vandenhoek2024: {
    id: 'vandenhoek2024',
    citation:
      'van den Hoek DJ, Beaumont PL, van den Hoek AK, et al. Normative data for the squat, bench press and deadlift exercises in powerlifting: data from 809,986 competition entries. J Sci Med Sport. 2024;27(10):734–742.',
    url: 'https://doi.org/10.1016/j.jsams.2024.07.005',
  },
  strengthlevel: {
    id: 'strengthlevel',
    citation:
      'Strength Level. Strength standards for squat, deadlift, bench press, military press and pull-ups, male bodyweight tables 110–310 lb (community data from tens of millions of logged lifts; Beginner/Novice/Intermediate/Advanced/Elite = stronger than 5/20/50/80/95% of lifters).',
    url: 'https://strengthlevel.com/strength-standards',
  },
  cooper: {
    id: 'cooper',
    citation:
      'The Cooper Institute. Physical Fitness Assessments and Norms for Adults and Law Enforcement — 1RM bench press / body weight, men (reprinted in ACE Bench Press Assessment Protocol).',
    url: 'https://contentcdn.eacefitness.com/assets/certification/ace-answers/forms/pt/38_Bench-Press_Assessment_Protocol.pdf',
  },
  epley: {
    id: 'epley',
    citation: 'Epley B. Poundage Chart. Boyd Epley Workout. Lincoln, NE; 1985. (1RM = weight × (1 + reps/30))',
    url: 'https://en.wikipedia.org/wiki/One-repetition_maximum#Epley_formula',
  },
};

export interface AthleteLiftReference {
  /** Group mean expressed in the lift's unit (1RM ÷ bodyweight for barbell lifts) */
  value: number;
  /** Squat depth used in the study — half squats are heavier than full-depth squats */
  depth?: 'full' | 'half';
  detail: string;
  source: SourceId;
}

export interface AthleteGroup {
  id: string;
  label: string;
  shortLabel: string;
  population: string;
  lifts: Partial<Record<LiftId, AthleteLiftReference>>;
  caveat?: string;
}

export const ATHLETE_GROUPS: AthleteGroup[] = [
  {
    id: 'football',
    label: 'American Football (NCAA D-I)',
    shortLabel: 'Football',
    population: 'College football players',
    lifts: {
      squat: {
        value: 1.94,
        depth: 'full',
        detail: '166.5 kg at 85.9 kg body mass · n = 17 · Division I-AA · squat to 70° knee angle (below parallel)',
        source: 'mcbride2009',
      },
      bench: {
        value: 1.4,
        detail: '156.9 kg estimated 1RM at 112.4 kg body mass · n = 31 · Division I',
        source: 'stahl2019',
      },
    },
    caveat: 'NFL combine data is a 225-lb rep test, not a 1RM, so college data is used. Squat and bench come from different teams.',
  },
  {
    id: 'basketball',
    label: 'Basketball (NCAA D-I)',
    shortLabel: 'Basketball',
    population: 'College basketball players',
    lifts: {
      squat: {
        value: 1.67,
        depth: 'full',
        detail: '152.2 kg at 91.3 kg body mass · n = 437 players from 45 Division I teams',
        source: 'latin1994',
      },
      bench: {
        value: 1.12,
        detail: '102.7 kg at 91.3 kg body mass · n = 437 · Division I',
        source: 'latin1994',
      },
    },
    caveat: 'NBA teams do not publish 1RM data; this is the largest published Division I sample.',
  },
  {
    id: 'soccer',
    label: 'Soccer (Professional)',
    shortLabel: 'Soccer',
    population: 'Professional soccer players',
    lifts: {
      squat: {
        value: 1.66,
        depth: 'full',
        detail: '125.4 kg · n = 17 professional players, age 18 · squat to 90° knee angle · before a strength block',
        source: 'styles2016',
      },
    },
    caveat:
      'Internationals in Wisløff 2004 half-squatted 2.2× body mass (not depth-comparable). No published pro-soccer bench 1RM was found.',
  },
  {
    id: 'sprinters',
    label: 'Sprinters (Elite)',
    shortLabel: 'Sprinters',
    population: 'Highly trained male sprinters',
    lifts: {
      squat: {
        value: 2.54,
        depth: 'half',
        detail: 'Half-squat 1RM 2.54× body mass · n = 10 highly trained sprinters',
        source: 'loturco2022',
      },
    },
    caveat:
      'Sprint studies test the half squat, which is heavier than a full squat, so your full-squat percentage reads low against this group.',
  },
  {
    id: 'powerlifters',
    label: 'Powerlifters (90th %ile)',
    shortLabel: 'Powerlifters',
    population: 'Top 10% of drug-tested raw male powerlifters, age 18–35',
    lifts: {
      squat: { value: 2.83, depth: 'full', detail: '90th percentile, 571,650 male competition entries', source: 'vandenhoek2024' },
      bench: { value: 1.95, detail: '90th percentile, men 18–35', source: 'vandenhoek2024' },
      deadlift: { value: 3.25, detail: '90th percentile, men 18–35', source: 'vandenhoek2024' },
    },
  },
];

/** Sports that were asked about but have no usable published 1RM data. */
export const DATA_GAPS: { label: string; reason: string }[] = [
  {
    label: 'Tennis',
    reason:
      'Published tennis studies measure grip, isometric and medicine-ball power, not barbell 1RMs, so there is no honest number to compare against.',
  },
];

// ---------------------------------------------------------------------------
// Your numbers
// ---------------------------------------------------------------------------

/** Program exercise ids that are the same movement as a scored lift. RDLs are not counted as deadlifts. */
export const EXERCISE_TO_LIFT: Record<string, LiftId> = {
  t1_bb_squat: 'squat',
  t1_squat: 'squat',
  t1_deadlift: 'deadlift',
  t1_bb_bench_press: 'bench',
  t1_bench_press: 'bench',
  t1_bb_ohp: 'ohp',
  t1_ohp: 'ohp',
};

/** Epley estimates get unreliable past ~10 reps, so higher-rep sets are ignored. */
export const MAX_REPS_FOR_ESTIMATE = 10;
export const LOG_LOOKBACK_DAYS = 180;

export function epley1RM(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export interface LiftResult {
  lift: LiftId;
  /** 1RM in lbs (or reps for pull-ups) */
  best: number;
  /** best ÷ bodyweight, or reps for pull-ups */
  value: number;
  /** bodyweight on the day of the lift, used for value and percentile */
  bodyweightLbs: number;
  origin: 'tested' | 'estimated';
  originDetail: string;
  date: string;
}

interface SetLike {
  weight: number;
  reps: number;
  completed: boolean;
}

function readSets(logVal: unknown): SetLike[] {
  if (Array.isArray(logVal)) {
    return logVal.map((s: any) => ({
      weight: Number(s?.weightLbs ?? s?.weight ?? 0),
      reps: Number(s?.repsAchieved ?? s?.reps ?? 0),
      completed: s?.isCompleted === true || s?.completed === true,
    }));
  }
  if (logVal && typeof logVal === 'object') {
    const v = logVal as any;
    return [
      {
        weight: Number(v.weight ?? v.weightLbs ?? 0),
        reps: Number(v.reps ?? v.repsAchieved ?? 0),
        completed: v.completed === true || v.isCompleted === true,
      },
    ];
  }
  return [];
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Best recent value per lift: the latest quarterly assessment's tested 1RMs and pull-up reps,
 * replaced by a higher Epley estimate from any logged set in the last 180 days.
 */
export interface LiftContext {
  /** bodyweight on a given date (from the bodyweight log); defaults to the assessment's bodyweight */
  bodyweightAt?: (date: string) => number;
  /** current bodyweight for display */
  currentBodyweightLbs?: number;
  /** age from the profile */
  age?: number;
}

export function computeLiftResults(
  assessment: QuarterlyAssessmentRecord | null,
  history: CompletedWorkoutSession[] = [],
  now: Date = new Date(),
  ctx: LiftContext = {}
): { bodyweightLbs: number; age: number | null; lifts: Partial<Record<LiftId, LiftResult>> } {
  const assessedBw = assessment?.bodyweightLbs && assessment.bodyweightLbs > 0 ? assessment.bodyweightLbs : 168;
  const bwAt = (date: string) => {
    const v = ctx.bodyweightAt?.(date);
    return v && v > 0 ? v : assessedBw;
  };
  const bodyweightLbs = ctx.currentBodyweightLbs && ctx.currentBodyweightLbs > 0 ? ctx.currentBodyweightLbs : assessedBw;
  const lifts: Partial<Record<LiftId, LiftResult>> = {};

  if (assessment) {
    const s = assessment.scores || {};
    const tested: [LiftId, number | undefined][] = [
      ['squat', s.squat1rmLbs],
      ['deadlift', s.deadlift1rmLbs],
      ['bench', s.bench1rmLbs],
      ['ohp', s.ohp1rmLbs],
    ];
    tested.forEach(([lift, v]) => {
      if (v && v > 0) {
        lifts[lift] = {
          lift,
          best: v,
          value: v / bwAt(assessment.date),
          bodyweightLbs: bwAt(assessment.date),
          origin: 'tested',
          originDetail: `Tested 1RM ${v} lb · ${assessment.quarterLabel}`,
          date: assessment.date,
        };
      }
    });
    if (s.strictPullupsReps && s.strictPullupsReps > 0) {
      lifts.pullups = {
        lift: 'pullups',
        best: s.strictPullupsReps,
        value: s.strictPullupsReps,
        bodyweightLbs: bwAt(assessment.date),
        origin: 'tested',
        originDetail: `${s.strictPullupsReps} strict reps · ${assessment.quarterLabel}`,
        date: assessment.date,
      };
    }
  }

  const cutoff = now.getTime() - LOG_LOOKBACK_DAYS * 86400000;
  history.forEach((session) => {
    const t = new Date(session.date).getTime();
    if (isNaN(t) || t < cutoff || t > now.getTime() + 86400000) return;
    if (!session.logs || typeof session.logs !== 'object') return;
    Object.entries(session.logs).forEach(([exerciseId, logVal]) => {
      const lift = EXERCISE_TO_LIFT[exerciseId.replace(/__side_(left|right)$/i, '')];
      if (!lift) return;
      readSets(logVal).forEach((set) => {
        if (!set.completed || set.reps > MAX_REPS_FOR_ESTIMATE) return;
        const est = Math.round(epley1RM(set.weight, set.reps));
        if (est > 0 && est > (lifts[lift]?.best ?? 0)) {
          lifts[lift] = {
            lift,
            best: est,
            value: est / bwAt(session.date),
            bodyweightLbs: bwAt(session.date),
            origin: 'estimated',
            originDetail: `Est. ${est} lb from ${set.weight} × ${set.reps} · ${fmtDate(session.date)}`,
            date: session.date,
          };
        }
      });
    });
  });

  return { bodyweightLbs, age: ctx.age ?? assessment?.age ?? null, lifts };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Level from a percentile: the highest Strength Level anchor reached. */
export function tierFromScore(percentile: number): StrengthTier {
  if (percentile >= 95) return 'Elite';
  if (percentile >= 80) return 'Advanced';
  if (percentile >= 50) return 'Intermediate';
  if (percentile >= 20) return 'Novice';
  return 'Beginner';
}

/**
 * Estimated percentile among lifters (1–99), interpolated linearly between the
 * Strength Level anchors; 0 at no load, 99 at 15% past the Elite line.
 */
export function liftPercentile(lift: LiftId, value: number, bodyweightLbs = 170): number {
  if (!(value > 0)) return 1;
  // outside the 110–310 lb tables, compare absolute loads at the nearest table bodyweight
  const bwClamped = Math.min(310, Math.max(110, bodyweightLbs || 170));
  if (STRENGTH_LEVEL_TABLES[lift].unit === 'lb' && bwClamped !== bodyweightLbs) value = (value * bodyweightLbs) / bwClamped;
  const t = percentileThresholds(lift, bwClamped);
  const anchors: [number, number][] = [
    [0, 0],
    ...t.map((x, i) => [x, PERCENTILE_ANCHORS[i]] as [number, number]),
    [t[4] * 1.15, 99],
  ];
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i];
    const [x0, y0] = anchors[i - 1];
    if (value <= x1) return Math.min(99, Math.max(1, Math.round(y0 + ((value - x0) / (x1 - x0)) * (y1 - y0))));
  }
  return 99;
}

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th, 21st */
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** Percentile against Cooper Institute bench norms for the user's age band (clamped to 5–95). */
export function cooperBenchPercentile(ratio: number, age: number): number {
  const band = COOPER_BENCH_NORMS_MEN.find((b) => age <= b.maxAge) ?? COOPER_BENCH_NORMS_MEN[COOPER_BENCH_NORMS_MEN.length - 1];
  const pts = band.points;
  if (ratio <= pts[0][1]) return pts[0][0];
  if (ratio >= pts[pts.length - 1][1]) return pts[pts.length - 1][0];
  for (let i = 1; i < pts.length; i++) {
    const [p1, r1] = pts[i];
    const [p0, r0] = pts[i - 1];
    if (ratio <= r1) return Math.round(p0 + ((ratio - r0) / (r1 - r0)) * (p1 - p0));
  }
  return pts[pts.length - 1][0];
}

export type CompareMode = 'general' | string; // 'general' or an AthleteGroup id

export interface LiftScore {
  lift: LiftId;
  result: LiftResult | null;
  /** general: percentile among lifters (1–99); athlete: % of group mean */
  score: number | null;
  reference: AthleteLiftReference | null;
}

export interface MuscleScore {
  id: MuscleId;
  name: string;
  view: 'front' | 'back';
  score: number | null;
  tier: StrengthTier | null;
  contributors: { lift: LiftId; weight: number; score: number }[];
  missingLifts: LiftId[];
}

export interface StrengthProfile {
  mode: CompareMode;
  group: AthleteGroup | null;
  bodyweightLbs: number;
  age: number | null;
  lifts: Record<LiftId, LiftScore>;
  muscles: Record<MuscleId, MuscleScore>;
  /** Weighted mean across rated muscles */
  overall: number | null;
  /** Muscles more than 15 points (general) / 15 % (athlete) below the overall */
  laggards: MuscleId[];
}

export function buildStrengthProfile(
  input: ReturnType<typeof computeLiftResults>,
  mode: CompareMode = 'general'
): StrengthProfile {
  const group = mode === 'general' ? null : ATHLETE_GROUPS.find((g) => g.id === mode) ?? null;

  const lifts = {} as Record<LiftId, LiftScore>;
  LIFTS.forEach(({ id }) => {
    const result = input.lifts[id] ?? null;
    let score: number | null = null;
    let reference: AthleteLiftReference | null = null;
    if (result) {
      if (!group) {
        score = liftPercentile(id, result.value, result.bodyweightLbs);
      } else {
        reference = group.lifts[id] ?? null;
        if (reference) score = Math.round((result.value / reference.value) * 100);
      }
    } else if (group) {
      reference = group.lifts[id] ?? null;
    }
    lifts[id] = { lift: id, result, score, reference };
  });

  const muscles = {} as Record<MuscleId, MuscleScore>;
  MUSCLES.forEach((m) => {
    const weights = MUSCLE_LIFT_WEIGHTS[m.id];
    const contributors: MuscleScore['contributors'] = [];
    const missingLifts: LiftId[] = [];
    (Object.entries(weights) as [LiftId, number][]).forEach(([lift, w]) => {
      const s = lifts[lift].score;
      if (s === null) missingLifts.push(lift);
      else contributors.push({ lift, weight: w, score: s });
    });
    const totalW = contributors.reduce((a, c) => a + c.weight, 0);
    const score = totalW > 0 ? Math.round(contributors.reduce((a, c) => a + c.weight * c.score, 0) / totalW) : null;
    muscles[m.id] = {
      id: m.id,
      name: m.name,
      view: m.view,
      score,
      tier: score !== null && !group ? tierFromScore(score) : null,
      contributors,
      missingLifts,
    };
  });

  const rated = Object.values(muscles).filter((m) => m.score !== null);
  const overall = rated.length ? Math.round(rated.reduce((a, m) => a + (m.score as number), 0) / rated.length) : null;
  const laggards =
    overall === null
      ? []
      : rated.filter((m) => (m.score as number) < overall - 15).map((m) => m.id);

  return { mode, group, bodyweightLbs: input.bodyweightLbs, age: input.age, lifts, muscles, overall, laggards };
}

// ---------------------------------------------------------------------------
// Colour scales (shared by the widget and tests)
// ---------------------------------------------------------------------------

export const TIER_COLORS: Record<StrengthTier, string> = {
  Beginner: '#f43f5e',
  Novice: '#f59e0b',
  Intermediate: '#06b6d4',
  Advanced: '#3b82f6',
  Elite: '#10b981',
};

/** Athlete mode bands: % of group average. */
export const PERCENT_BANDS: { min: number; label: string; color: string }[] = [
  { min: 115, label: '≥115% · above the group', color: '#10b981' },
  { min: 100, label: '100–114% · at group level', color: '#3b82f6' },
  { min: 85, label: '85–99% · close', color: '#06b6d4' },
  { min: 70, label: '70–84% · gap', color: '#f59e0b' },
  { min: 0, label: '<70% · large gap', color: '#f43f5e' },
];

export const NO_DATA_COLOR = '#334155';

export function colorForScore(score: number | null, mode: CompareMode): string {
  if (score === null) return NO_DATA_COLOR;
  if (mode === 'general') return TIER_COLORS[tierFromScore(score)];
  return (PERCENT_BANDS.find((b) => score >= b.min) ?? PERCENT_BANDS[PERCENT_BANDS.length - 1]).color;
}
