// src/domain/progression.ts
/**
 * Load progression, "last time" lookups and planned deload weeks.
 *
 * - Last time: the most recent finished workout that logged completed sets for an exercise.
 * - Next load (double progression): add weight once every planned set reaches the top of the rep
 *   range without an RPE 9.5+ grind; hold while reps are still climbing; back off after missing the
 *   bottom of the range on most sets or knee pain >= 4/10. Kettlebells move between Bowflex 840 notches.
 *   Pain mentioned in a set note (back, hip, shoulder...) holds the load; so do poor recovery signals
 *   (see trainingReadiness.ts), which turn an increase into a hold with the reason shown.
 * - Deload: after 4 building weeks (a week with 2+ workouts) the 5th week is a deload: about half
 *   the sets at ~85% load. A week with no training, or a finished deload, starts a new block.
 */
import type { SetLogRecord } from '../components/ExerciseCard';
import { BOWFLEX_840_KETTLEBELL_SETTINGS, type WorkoutExercise } from './programData';

export interface HistoryRecord {
  id?: string;
  date: string;
  completedAt?: string;
  sessionId: string;
  logs: Record<string, unknown>;
  deload?: boolean;
}

export interface LastPerformance {
  recordId: string;
  date: string;
  deload: boolean;
  /** completed sets only, in set order */
  sets: SetLogRecord[];
}

export type LoadChange = 'increase' | 'hold' | 'decrease' | 'deload';

export interface LoadSuggestion {
  weightLbs: number;
  previousWeightLbs: number;
  change: LoadChange;
  reason: string;
  /** an increase held back by recovery signals: the pre-fill still writes last time's weight */
  readinessHold?: boolean;
  /** history record the suggestion was worked out from (one pre-fill per new record) */
  basisRecordId: string;
  basisDate: string;
}

const recordTime = (r: { date: string; completedAt?: string }) => new Date(r.completedAt || r.date).getTime();

function completedSets(raw: unknown): SetLogRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is SetLogRecord => !!s && typeof s === 'object' && (s as SetLogRecord).isCompleted === true)
    .map((s) => ({ ...s, weightLbs: Number(s.weightLbs) || 0, repsAchieved: Number(s.repsAchieved) || 0 }));
}

/** Most recent completed performance of an exercise (split left/right logs fall back to the whole exercise). */
export function findLastPerformance(
  exerciseId: string,
  history: HistoryRecord[],
  opts: { skipDeload?: boolean; before?: number } = {}
): LastPerformance | null {
  const keys = [exerciseId];
  const base = exerciseId.replace(/__side_(left|right)$/, '');
  if (base !== exerciseId) keys.push(base);
  let best: LastPerformance | null = null;
  let bestT = -Infinity;
  for (const r of history) {
    if (opts.skipDeload && r.deload) continue;
    const t = recordTime(r);
    if (isNaN(t) || t <= bestT) continue;
    if (opts.before !== undefined && t >= opts.before) continue;
    for (const k of keys) {
      const sets = completedSets(r.logs?.[k]);
      if (sets.length) {
        best = { recordId: r.id || `${r.sessionId}@${r.completedAt || r.date}`, date: r.completedAt || r.date, deload: !!r.deload, sets };
        bestT = t;
        break;
      }
    }
  }
  return best;
}

/** "8-10" -> 8..10, "3" -> 3..3, "20 Effective Reps" -> 20..20; timed targets ("30s", "45 sec hold") -> null */
export function repRange(targetReps: string): { min: number; max: number } | null {
  // "10 reps (5s hold)": the bracket is a cue, not the target
  const t = (targetReps || '').toLowerCase().replace(/\([^)]*\)/g, ' ');
  if (/\d\s*(s|sec|secs|seconds|min|mins|minutes)\b|\bhold\b|\d\s*m\b|\bmeters?\b|\byards?\b|\bfeet\b|\bft\b|\bsteps?\b|\brounds?\b/.test(t)) return null;
  const range = /(\d+)\s*(?:-|–|to)\s*(\d+)/.exec(t);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const n = /(\d+)/.exec(t);
  return n ? { min: Number(n[1]), max: Number(n[1]) } : null;
}

const BODY_PART = '(lower back|low back|upper back|back|spine|hip|groin|shoulder|elbow|wrist|neck|knee|hamstring|achilles|ankle|pec|chest|si joint)';
const PAIN_WORD = '(pain|hurts?|hurting|ache|aching|pinch|pinching|tweak(?:ed)?|strain(?:ed)?|sharp)';
const NO_PAIN = /\b(no|zero|without)\s+(\w+\s+){0,2}pain\b|pain[- ]free|\b0\s*\/\s*10/i;

/** RPE, knee pain (n/10) and any other pain written in quick-chip or free-text notes. */
export function readSetTags(notes: string): { rpe: number; kneePain: number; painNote: string | null } {
  const text = notes || '';
  const rpe = /RPE\s*(\d+(?:\.\d+)?)/i.exec(text);
  const pains = Array.from(text.matchAll(/Pain(?:-Free)?\s*(\d+(?:\.\d+)?)\s*\/\s*10/gi), (m) => parseFloat(m[1]));
  let painNote: string | null = null;
  for (const part of text.split(/[·.;\n]/)) {
    if (NO_PAIN.test(part) || /pain\s*\d/i.test(part)) continue;
    const m = new RegExp(`\\b${BODY_PART}\\b[^·.;]{0,25}\\b${PAIN_WORD}\\b|\\b${PAIN_WORD}\\b[^·.;]{0,25}\\b${BODY_PART}\\b`, 'i').exec(part);
    if (m) {
      painNote = (m[1] || m[4] || '').toLowerCase();
      break;
    }
  }
  return { rpe: rpe ? parseFloat(rpe[1]) : 0, kneePain: pains.length ? Math.max(...pains) : 0, painNote };
}

const NOTCHES: readonly number[] = BOWFLEX_840_KETTLEBELL_SETTINGS;
const LOWER_BODY = /squat|deadlift|\brdl\b|hinge|lunge|split|step|good morning|hip thrust|cossack|calf|leg/i;
const round5 = (w: number) => Math.round(w / 5) * 5;

function stepUp(w: number, ex: WorkoutExercise): number {
  if (ex.equipment === 'kettlebell') return NOTCHES.find((n) => n > w) ?? w;
  if (ex.equipment === 'barbell') return w + (LOWER_BODY.test(ex.name) ? 10 : 5);
  return w + 5;
}

function stepDown(w: number, ex: WorkoutExercise): number {
  if (ex.equipment === 'kettlebell') return [...NOTCHES].reverse().find((n) => n < w) ?? NOTCHES[0];
  const floor = ex.equipment === 'barbell' ? 45 : 0;
  return Math.max(floor, Math.min(w - 5, round5(w * 0.9)));
}

export function deloadLoad(w: number, ex: WorkoutExercise): number {
  if (ex.equipment === 'kettlebell') return [...NOTCHES].reverse().find((n) => n <= w * 0.85) ?? NOTCHES[0];
  const floor = ex.equipment === 'barbell' ? 45 : 0;
  return Math.max(floor, round5(w * 0.85));
}

/** Deload sets: about half, never below one. */
export const deloadSets = (sets: number) => Math.max(1, Math.ceil(sets / 2));

/** Hard caps written into an exercise's progression rule ("Strictly capped at 8-12 lbs"). */
export function loadCap(ex: WorkoutExercise): number | null {
  const m = /capped at\s*(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*lbs?/i.exec(ex.progressionRule || '');
  return m ? Number(m[2] || m[1]) : null;
}

export function suggestNextLoad(
  ex: WorkoutExercise,
  last: LastPerformance | null,
  opts: { deload?: boolean; holdIncreasesReason?: string | null } = {}
): LoadSuggestion | null {
  if (!last || ex.equipment === 'bodyweight') return null;
  const working = last.sets.filter((s) => s.weightLbs > 0);
  if (!working.length) return null;
  const top = Math.max(...working.map((s) => s.weightLbs));
  const base = { previousWeightLbs: top, basisRecordId: last.recordId, basisDate: last.date };
  const cap = loadCap(ex);
  const capped = (w: number) => (cap !== null ? Math.min(w, Math.max(cap, top)) : w);
  const tags = last.sets.map((s) => readSetTags(s.notes));
  const maxRpe = Math.max(0, ...tags.map((t) => t.rpe));
  const maxPain = Math.max(0, ...tags.map((t) => t.kneePain));
  const painNote = tags.find((t) => t.painNote)?.painNote ?? null;

  if (opts.deload) {
    return { ...base, weightLbs: deloadLoad(top, ex), change: 'deload', reason: `Deload week: about 85% of ${top} lb with half the sets` };
  }
  if (maxPain >= 4) {
    return { ...base, weightLbs: stepDown(top, ex), change: 'decrease', reason: `Knee pain ${maxPain}/10 last time, so the load comes down` };
  }
  const range = repRange(ex.targetReps);
  if (!range) return null;
  const atTop = working.filter((s) => s.weightLbs === top);
  const missed = atTop.filter((s) => s.repsAchieved < range.min).length;
  if (atTop.length >= 2 && missed >= Math.ceil(atTop.length / 2)) {
    return {
      ...base,
      weightLbs: stepDown(top, ex),
      change: 'decrease',
      reason: `Missed ${range.min} reps on ${missed} of ${atTop.length} sets at ${top} lb`,
    };
  }
  const everySetTopped = atTop.length >= ex.targetSets && atTop.every((s) => s.repsAchieved >= range.max);
  if (everySetTopped && painNote) {
    return { ...base, weightLbs: top, change: 'hold', readinessHold: true, reason: `You noted ${painNote} pain last time: repeat ${top} lb with clean form before adding weight` };
  }
  if (everySetTopped && maxRpe < 9.5) {
    const next = capped(stepUp(top, ex));
    if (next > top && opts.holdIncreasesReason) {
      return { ...base, weightLbs: top, change: 'hold', readinessHold: true, reason: `${opts.holdIncreasesReason}. Repeat ${top} lb today` };
    }
    if (next > top) {
      return {
        ...base,
        weightLbs: next,
        change: 'increase',
        reason: `Hit ${range.max}+ reps on all ${atTop.length} sets at ${top} lb${maxRpe ? ` (RPE ${maxRpe})` : ''}`,
      };
    }
    return {
      ...base,
      weightLbs: top,
      change: 'hold',
      reason: cap !== null && top >= cap ? `At the ${cap} lb cap for this exercise` : 'Top of the kettlebell range: add reps or slow the tempo',
    };
  }
  if (everySetTopped) {
    return { ...base, weightLbs: top, change: 'hold', reason: `Every rep done, but at RPE ${maxRpe}: repeat ${top} lb` };
  }
  return {
    ...base,
    weightLbs: top,
    change: 'hold',
    reason:
      range.min < range.max
        ? `Build to ${range.max} reps on every set before adding weight`
        : `Repeat ${top} lb until all ${ex.targetSets} sets hit ${range.max}`,
  };
}

/** Set list resized to `target` sets (extra sets copy the last weight); only for exercises not started yet. */
export function resizeSets(logs: SetLogRecord[], target: number, targetReps: string): SetLogRecord[] {
  if (logs.length === target || target < 1) return logs;
  if (logs.length > target) return logs.slice(0, target);
  const template = logs[logs.length - 1];
  const extra = Array.from({ length: target - logs.length }, (_, i) => ({
    setNumber: logs.length + i + 1,
    targetReps: template?.targetReps || targetReps,
    weightLbs: template?.weightLbs || 0,
    repsAchieved: 0,
    isCompleted: false,
    notes: '',
  }));
  return [...logs, ...extra];
}

// ---------------------------------------------------------------------------
// Planned deloads
// ---------------------------------------------------------------------------

export const BLOCK_WEEKS = 5; // 4 building weeks, then a deload week

/** Local Monday 00:00 of the week containing `d`. */
export function weekStart(d: Date): number {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon = 0
  return new Date(x.getFullYear(), x.getMonth(), x.getDate() - dow).getTime();
}
export const weekKey = (d: Date) => {
  const s = new Date(weekStart(d));
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
};

export interface DeloadStatus {
  isDeloadWeek: boolean;
  /** position of this week in the block, 1..BLOCK_WEEKS (can exceed it while a deload is postponed) */
  blockWeek: number;
  weeksUntilDeload: number;
  postponed: boolean;
  weekKey: string;
}

export function deloadStatus(
  history: HistoryRecord[],
  now: Date = new Date(),
  opts: { postponedWeekKey?: string | null; isLifting?: (sessionId: string) => boolean } = {}
): DeloadStatus {
  const thisWeek = weekStart(now);
  const weeks = new Map<number, { count: number; deload: boolean }>();
  for (const r of history) {
    if (opts.isLifting && !opts.isLifting(r.sessionId)) continue;
    const t = recordTime(r);
    if (isNaN(t) || t >= thisWeek) continue;
    const w = weekStart(new Date(t));
    const e = weeks.get(w) || { count: 0, deload: false };
    e.count += 1;
    e.deload = e.deload || !!r.deload;
    weeks.set(w, e);
  }
  let built = 0;
  // walk back week by week (dates, not 7-day steps, so daylight-saving changes don't skip a week)
  const cursor = new Date(thisWeek);
  for (let i = 0; i < 104; i++) {
    cursor.setDate(cursor.getDate() - 7);
    const e = weeks.get(weekStart(cursor));
    if (!e || e.deload) break; // a week off or a finished deload starts the block
    if (e.count >= 2) built++;
  }
  const key = weekKey(now);
  const postponed = opts.postponedWeekKey === key;
  const due = built >= BLOCK_WEEKS - 1;
  return {
    isDeloadWeek: due && !postponed,
    blockWeek: built + 1,
    weeksUntilDeload: Math.max(0, BLOCK_WEEKS - 1 - built),
    postponed: due && postponed,
    weekKey: key,
  };
}
