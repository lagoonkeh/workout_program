// src/domain/postureAssessment.ts
/**
 * Athlean-X 6-test posture assessment + 22-day correction plan.
 * Source: "This Fixes 95% of Posture Problems (FAST!)" (ATHLEAN-X, https://youtu.be/633UP8zXNI8),
 * the same protocol as "Fix Bad Posture in 22 Days".
 *
 * Day 1: run the six pass/fail tests. Days 2–21 alternate stretch days (even days) and
 * strengthening days (odd days), doing only the corrections for tests you failed.
 * Day 22: retest and compare. A passed test needs no corrections.
 */
import { touchAppData } from '../storage/appDataClock';

export const POSTURE_VIDEO_URL = 'https://youtu.be/633UP8zXNI8';
export const POSTURE_PLAN_DAYS = 22;
export const STORAGE_KEY_POSTURE = 'workout_posture_assessment_v1';
export const POSTURE_ASSESSMENT_EVENT = 'posture-assessment-updated';
export const MAX_POSTURE_RECORDS = 24;

export type PostureTestId = 'thoracic' | 'hamstrings' | 'calves' | 'abs' | 'hipFlexors' | 'hipRotation';
export type PostureSide = 'left' | 'right' | 'both';
export type PostureResult = 'pass' | 'fail';
export type PostureDayType = 'test' | 'stretch' | 'strength' | 'retest';

export interface PosturePrescription {
  name: string;
  /** e.g. "3–4 × 45 s" */
  dose: string;
  cues: string[];
  /** Do it only on the failed side(s) */
  perSide: boolean;
  /** Banded toe pulls: every second strengthening day to keep the shins happy */
  everyOtherStrengthDay?: boolean;
  alternative?: string;
}

export interface PostureTestDef {
  id: PostureTestId;
  area: string;
  name: string;
  /** Tested left and right separately */
  perSide: boolean;
  howTo: string[];
  pass: string;
  failMeans: string;
  stretch: PosturePrescription;
  strength: PosturePrescription;
}

export const POSTURE_TESTS: PostureTestDef[] = [
  {
    id: 'thoracic',
    area: 'Upper back (thoracic spine)',
    name: 'Wall arms-overhead test',
    perSide: false,
    howTo: [
      'Stand with heels, butt, upper back and the back of your head against a wall.',
      'Keep your low back flat to the wall (no arching) and your chin level.',
      'Raise both straight arms overhead, thumbs leading, and try to touch the wall.',
    ],
    pass: 'Thumbs reach the wall without your low back arching or your head leaving the wall.',
    failMeans: 'Your upper back is stuck rounded (thoracic kyphosis), which drags the shoulders and head forward.',
    stretch: {
      name: 'Kneeling T-spine stretch',
      dose: '3–4 × 45 s',
      cues: [
        'Kneel facing a bench, elbows on the edge, hands together behind your head.',
        'Sit your hips back and let your chest sink toward the floor, arching the upper back.',
      ],
      perSide: false,
    },
    strength: {
      name: 'Face pulls (band or bodyweight)',
      dose: '3–4 × 12–15',
      cues: ['Pull to your forehead with elbows high and rotate the hands back.', 'Finish with the shoulder blades squeezed down and back.'],
      perSide: false,
    },
  },
  {
    id: 'hamstrings',
    area: 'Hamstrings',
    name: 'Straight-leg raise',
    perSide: true,
    howTo: [
      'Lie on your back with both legs straight and the low back flat.',
      'Keeping the knee locked and the other leg flat on the floor, raise one leg as high as it goes.',
      'Repeat on the other side.',
    ],
    pass: 'The raised leg reaches roughly vertical (about 80–90°) with the knee straight and the other leg still down.',
    failMeans: 'Tight hamstrings pull the pelvis under (posterior tilt) and flatten the low back.',
    stretch: {
      name: 'Hamstring wall stretch',
      dose: '3–4 × 45 s per leg',
      cues: ['Lie in a doorway with one leg straight up the wall and the other flat through the door.', 'Scoot closer to the wall as the stretch eases.'],
      perSide: true,
    },
    strength: {
      name: 'Box high hip lifts',
      dose: '3–4 × 10–12',
      cues: ['Heels on a box or bench, knees slightly bent.', 'Drive the hips up high with the glutes and hamstrings, then lower slowly.'],
      perSide: false,
    },
  },
  {
    id: 'calves',
    area: 'Calves / ankles',
    name: 'Knee-to-wall test',
    perSide: true,
    howTo: [
      'Face a wall in a split stance with the front toes about 4 in (10 cm) from the wall.',
      'Keeping the front heel flat, drive the front knee forward over the toes toward the wall.',
      'Repeat on the other side.',
    ],
    pass: 'The knee touches the wall with the heel still flat on the floor.',
    failMeans: 'Tight calves limit ankle bend, which pushes the knees, hips and torso out of line when you squat, stand or walk.',
    stretch: {
      name: 'Ankle drop stretch',
      dose: '2 × 45 s straight knees + 2 × 45 s bent knees',
      cues: ['Balls of the feet on a step, heels hanging off.', 'Let the heels drop; bend the knees on the second pair to reach the soleus.'],
      perSide: false,
    },
    strength: {
      name: 'Banded toe pulls',
      dose: '3–4 × 12–15',
      cues: ['Sit with a band looped over the top of your foot, anchored in front.', 'Pull the toes up toward the shin, pause, lower slowly.'],
      perSide: false,
      everyOtherStrengthDay: true,
    },
  },
  {
    id: 'abs',
    area: 'Abs (front of the trunk)',
    name: 'Prone press-up',
    perSide: false,
    howTo: [
      'Lie face down with your hands under your shoulders.',
      'Relax your glutes and low back and press your chest up, keeping your hips on the floor.',
    ],
    pass: 'Arms reach fully straight while your hips stay on the floor, with no pinching in the low back.',
    failMeans: 'Short, stiff abs pull the ribcage down and the shoulders forward into a slump.',
    stretch: {
      name: 'Bow stretch',
      dose: '3–4 × 45 s',
      cues: ['Lie face down, bend the knees and grab your ankles.', 'Kick into your hands to lift the chest and thighs into a bow.'],
      perSide: false,
      alternative: 'Or lie back over a physio ball with arms overhead.',
    },
    strength: {
      name: 'Supermans',
      dose: '3–4 × 12–15',
      cues: ['Lie face down, arms overhead.', 'Lift arms, chest and legs together, squeeze the upper back and glutes, lower with control.'],
      perSide: false,
    },
  },
  {
    id: 'hipFlexors',
    area: 'Hip flexors',
    name: 'Thomas test',
    perSide: true,
    howTo: [
      'Sit on the very end of a bench, hug one knee to your chest and roll onto your back.',
      'Let the other leg hang off the end, relaxed.',
      'Repeat on the other side.',
    ],
    pass: 'The hanging thigh rests flat (level with the bench or lower) with the knee bent to about 90°.',
    failMeans: 'Tight hip flexors tip the pelvis forward (anterior tilt) and over-arch the low back.',
    stretch: {
      name: 'Lunge and reach stretch',
      dose: '3–4 × 45 s on the tight side(s)',
      cues: ['Half-kneel with the tight side’s knee down; squeeze that glute and tuck the pelvis.', 'Reach the same-side arm overhead and over to the opposite side.'],
      perSide: true,
    },
    strength: {
      name: 'Glute bridge heel taps',
      dose: '3–4 × 10–12 per leg',
      cues: ['Hold a glute bridge with the hips level.', 'Lift one foot and tap the heel back down, alternating, without the hips dropping.'],
      perSide: false,
    },
  },
  {
    id: 'hipRotation',
    area: 'Hip rotation',
    name: 'Seated hip rotation test',
    perSide: true,
    howTo: [
      'Sit tall on the edge of a bench, knees bent 90° and together.',
      'Keeping the thigh still, swing one foot out to the side (hip internal rotation), then in across (external rotation).',
      'Repeat on the other side and compare.',
    ],
    pass: 'The foot swings out to about 35–45° each way, and both sides look about the same.',
    failMeans: 'Stiff hip rotators make the pelvis and low back twist to make up the motion, and are a common source of left-right imbalance.',
    stretch: {
      name: 'Pretzel stretch',
      dose: '3–4 × 45 s on the tight side(s)',
      cues: ['Set up in a 90/90 position on the floor with the tight hip as the back leg.', 'Sit tall and lean toward the front knee until you feel the back hip stretch.'],
      perSide: true,
    },
    strength: {
      name: 'Frog glute presses',
      dose: '3–4 × 12–15',
      cues: ['Lie face down, knees bent and wide, heels touching.', 'Squeeze the glutes to press the heels toward the ceiling, pause, lower.'],
      perSide: false,
    },
  },
];

export type PostureTestResults = Partial<Record<PostureTestId, Partial<Record<PostureSide, PostureResult>>>>;

export interface PostureAssessmentRecord {
  id: string;
  /** Local date YYYY-MM-DD */
  date: string;
  kind: 'baseline' | 'retest';
  results: PostureTestResults;
}

export interface PosturePlan {
  /** Day 1 (local date YYYY-MM-DD) */
  startDate: string;
  baselineId: string;
  completedDays: number[];
}

export interface PostureState {
  records: PostureAssessmentRecord[];
  plan: PosturePlan | null;
}

export interface PostureRoutineItem {
  testId: PostureTestId;
  area: string;
  prescription: PosturePrescription;
  /** Sides to do it on; empty when the move is not side-specific */
  sides: Array<'left' | 'right'>;
}

export function getTest(id: PostureTestId): PostureTestDef {
  const t = POSTURE_TESTS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown posture test: ${id}`);
  return t;
}

export function sidesFor(test: PostureTestDef): PostureSide[] {
  return test.perSide ? ['left', 'right'] : ['both'];
}

/** True when every side of every test has a result. */
export function isRecordComplete(results: PostureTestResults): boolean {
  return POSTURE_TESTS.every((t) => sidesFor(t).every((s) => results[t.id]?.[s] === 'pass' || results[t.id]?.[s] === 'fail'));
}

/** Sides that failed for one test (empty = passed or not tested). */
export function failedSides(test: PostureTestDef, results: PostureTestResults): PostureSide[] {
  return sidesFor(test).filter((s) => results[test.id]?.[s] === 'fail');
}

export function failedTests(results: PostureTestResults): PostureTestId[] {
  return POSTURE_TESTS.filter((t) => failedSides(t, results).length > 0).map((t) => t.id);
}

export function passCount(results: PostureTestResults): number {
  return POSTURE_TESTS.filter((t) => sidesFor(t).every((s) => results[t.id]?.[s] === 'pass')).length;
}

function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Plan day for a date: 1 on the start date. Can be < 1 or > 22. */
export function planDayNumber(startDate: string, today: Date = new Date()): number {
  const start = parseLocalDate(startDate);
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((now.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function dayType(day: number): PostureDayType {
  if (day <= 1) return 'test';
  if (day >= POSTURE_PLAN_DAYS) return 'retest';
  return day % 2 === 0 ? 'stretch' : 'strength';
}

/** 1-based index among strengthening days (day 3 → 1, day 5 → 2 …); 0 for other days. */
export function strengthDayIndex(day: number): number {
  return dayType(day) === 'strength' ? (day - 1) / 2 : 0;
}

/** The corrections to do on a plan day, from the baseline's failed tests. */
export function routineForDay(results: PostureTestResults, day: number): PostureRoutineItem[] {
  const type = dayType(day);
  if (type !== 'stretch' && type !== 'strength') return [];
  const items: PostureRoutineItem[] = [];
  for (const test of POSTURE_TESTS) {
    const failed = failedSides(test, results);
    if (failed.length === 0) continue;
    const prescription = type === 'stretch' ? test.stretch : test.strength;
    if (prescription.everyOtherStrengthDay && strengthDayIndex(day) % 2 === 0) continue;
    const sides: Array<'left' | 'right'> =
      test.perSide && prescription.perSide ? (failed.filter((s) => s !== 'both') as Array<'left' | 'right'>) : [];
    items.push({ testId: test.id, area: test.area, prescription, sides });
  }
  return items;
}

export interface PostureComparison {
  testId: PostureTestId;
  before: PostureResult | null;
  after: PostureResult | null;
  change: 'fixed' | 'still-failing' | 'held' | 'regressed' | 'n/a';
}

function overall(test: PostureTestDef, results: PostureTestResults): PostureResult | null {
  const vals = sidesFor(test).map((s) => results[test.id]?.[s]);
  if (vals.some((v) => v === 'fail')) return 'fail';
  if (vals.every((v) => v === 'pass')) return 'pass';
  return null;
}

export function compareRecords(before: PostureTestResults, after: PostureTestResults): PostureComparison[] {
  return POSTURE_TESTS.map((test) => {
    const b = overall(test, before);
    const a = overall(test, after);
    let change: PostureComparison['change'] = 'n/a';
    if (b && a) {
      if (b === 'fail' && a === 'pass') change = 'fixed';
      else if (b === 'fail' && a === 'fail') change = 'still-failing';
      else if (b === 'pass' && a === 'pass') change = 'held';
      else change = 'regressed';
    }
    return { testId: test.id, before: b, after: a, change };
  });
}

// ---------- storage ----------

const EMPTY_STATE: PostureState = { records: [], plan: null };

const RESULT_VALUES = new Set<string>(['pass', 'fail']);
const SIDE_VALUES = new Set<string>(['left', 'right', 'both']);
const TEST_IDS = new Set<string>(POSTURE_TESTS.map((t) => t.id));

function sanitizeResults(raw: unknown): PostureTestResults {
  const out: PostureTestResults = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, sides] of Object.entries(raw as Record<string, unknown>)) {
    if (!TEST_IDS.has(id) || !sides || typeof sides !== 'object') continue;
    const clean: Partial<Record<PostureSide, PostureResult>> = {};
    for (const [side, val] of Object.entries(sides as Record<string, unknown>)) {
      if (SIDE_VALUES.has(side) && typeof val === 'string' && RESULT_VALUES.has(val)) {
        clean[side as PostureSide] = val as PostureResult;
      }
    }
    out[id as PostureTestId] = clean;
  }
  return out;
}

export function sanitizePostureState(raw: unknown): PostureState {
  if (!raw || typeof raw !== 'object') return { records: [], plan: null };
  const r = raw as Partial<PostureState>;
  const records = Array.isArray(r.records)
    ? r.records
        .filter((x) => x && typeof x.id === 'string' && typeof x.date === 'string')
        .map((x) => ({
          id: x.id,
          date: x.date,
          kind: x.kind === 'retest' ? ('retest' as const) : ('baseline' as const),
          results: sanitizeResults(x.results),
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-MAX_POSTURE_RECORDS)
    : [];
  const p = r.plan;
  const plan =
    p && typeof p.startDate === 'string' && typeof p.baselineId === 'string'
      ? {
          startDate: p.startDate,
          baselineId: p.baselineId,
          completedDays: Array.isArray(p.completedDays)
            ? Array.from(new Set(p.completedDays.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= POSTURE_PLAN_DAYS))).sort((a, b) => a - b)
            : [],
        }
      : null;
  return { records, plan };
}

export function loadPostureState(): PostureState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_POSTURE);
    return raw ? sanitizePostureState(JSON.parse(raw)) : { ...EMPTY_STATE, records: [] };
  } catch {
    return { records: [], plan: null };
  }
}

export function savePostureState(state: PostureState, opts: { silent?: boolean } = {}): PostureState {
  const clean = sanitizePostureState(state);
  try {
    window.localStorage.setItem(STORAGE_KEY_POSTURE, JSON.stringify(clean));
  } catch {
    // storage unavailable
  }
  if (!opts.silent) touchAppData();
  try {
    window.dispatchEvent(new Event(POSTURE_ASSESSMENT_EVENT));
  } catch {
    // non-browser
  }
  return clean;
}

/** Used by the Drive restore. */
export function replacePostureState(state: unknown): void {
  savePostureState(sanitizePostureState(state), { silent: true });
}

/**
 * Save a finished test. A baseline starts a new 22-day plan on that date; a retest is stored
 * alongside and ends the plan view on day 22.
 */
export function saveAssessment(
  state: PostureState,
  results: PostureTestResults,
  kind: 'baseline' | 'retest',
  today: Date = new Date(),
): PostureState {
  const date = toLocalDateKey(today);
  const record: PostureAssessmentRecord = { id: `posture-${date}-${kind}-${today.getTime()}`, date, kind, results: sanitizeResults(results) };
  const records = [...state.records, record];
  let plan = state.plan;
  if (kind === 'baseline') plan = { startDate: date, baselineId: record.id, completedDays: [1] };
  else if (plan) plan = { ...plan, completedDays: Array.from(new Set([...plan.completedDays, POSTURE_PLAN_DAYS])).sort((a, b) => a - b) };
  return savePostureState({ records, plan });
}

export function toggleDayComplete(state: PostureState, day: number): PostureState {
  if (!state.plan) return state;
  const has = state.plan.completedDays.includes(day);
  const completedDays = has ? state.plan.completedDays.filter((d) => d !== day) : [...state.plan.completedDays, day];
  return savePostureState({ ...state, plan: { ...state.plan, completedDays } });
}

export function endPlan(state: PostureState): PostureState {
  return savePostureState({ ...state, plan: null });
}

export function deleteRecord(state: PostureState, id: string): PostureState {
  const records = state.records.filter((r) => r.id !== id);
  const plan = state.plan && state.plan.baselineId === id ? null : state.plan;
  return savePostureState({ records, plan });
}

export function baselineFor(state: PostureState): PostureAssessmentRecord | null {
  if (!state.plan) return null;
  return state.records.find((r) => r.id === state.plan!.baselineId) ?? null;
}

/** Retest recorded on or after the plan start, if any. */
export function retestFor(state: PostureState): PostureAssessmentRecord | null {
  if (!state.plan) return null;
  const start = state.plan.startDate;
  const retests = state.records.filter((r) => r.kind === 'retest' && r.date >= start);
  return retests.length ? retests[retests.length - 1] : null;
}
