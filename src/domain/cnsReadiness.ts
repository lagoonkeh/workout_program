// src/domain/cnsReadiness.ts
/**
 * CNS (nervous-system) readiness check, done before training and judged against the user's own rolling
 * baseline rather than population norms:
 * - 10-second finger-tap test (taps on the screen, same hand every time)
 * - simple reaction time (median of 5 trials)
 * - Health Connect HRV and resting HR, when available
 * - three quick self-ratings (drive to train, focus, stress)
 *
 * Day-to-day test scores are noisy, so a measure is only flagged when it moves more than its typical
 * day-to-day spread (and by a minimum percentage). This is a trend signal, not a diagnosis.
 */
import { healthForDate, restingHrTrend, type HealthDay } from './healthMetrics';
import { touchAppData } from '../storage/appDataClock';

export const STORAGE_KEY_CNS_CHECKS = 'workout_cns_readiness_checks_v1';
export const CNS_CHECKS_EVENT = 'cns-checks-updated';

export const TAP_TEST_SECONDS = 10;
export const REACTION_TRIALS = 5;
/** Earlier checks needed before tap / reaction results are compared to a baseline */
export const MIN_BASELINE_CHECKS = 3;
/** Most recent earlier checks used for the baseline */
export const BASELINE_WINDOW = 10;
/** Checks kept on the device and in the Drive backup */
export const MAX_STORED_CHECKS = 90;

export type CnsTier = 'ready' | 'moderate' | 'low';
export type Flag = 'ok' | 'watch' | 'poor' | 'good';

export interface CnsCheck {
  id: string; // 'cns_YYYY-MM-DD'
  date: string; // YYYY-MM-DD
  timestamp: number;
  taps: number | null; // taps in TAP_TEST_SECONDS
  reactionMs: number | null; // median reaction time
  drive: number; // 1-5, want to train
  focus: number; // 1-5, mental sharpness
  stress: number; // 1-5, 5 = very stressed
  hrvMs?: number | null;
  restingHr?: number | null;
  score: number; // 0-100
  tier: CnsTier;
}

export interface MetricResult {
  key: 'taps' | 'reaction' | 'hrv' | 'rhr' | 'drive' | 'focus' | 'stress';
  label: string;
  value: string;
  comparison: string | null; // e.g. '-8% vs baseline 62'
  flag: Flag;
  penalty: number;
}

export interface CnsInputs {
  taps: number | null;
  reactionMs: number | null;
  drive: number;
  focus: number;
  stress: number;
}

export interface CnsEvaluation {
  score: number;
  tier: CnsTier;
  metrics: MetricResult[];
  baselineChecks: number;
  headline: string;
  advice: string[];
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const round1 = (x: number) => Math.round(x * 10) / 10;

export function median(xs: number[]): number | null {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
}

export interface Baseline {
  mean: number;
  sd: number;
  n: number;
}

/** Baseline of a numeric field over the most recent earlier checks (not including `date`). */
export function baselineOf(checks: CnsCheck[], date: string, pick: (c: CnsCheck) => number | null | undefined): Baseline | null {
  const vals = checks
    .filter((c) => c.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(pick)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
    .slice(0, BASELINE_WINDOW);
  if (vals.length < MIN_BASELINE_CHECKS) return null;
  return { mean: mean(vals), sd: sd(vals), n: vals.length };
}

/**
 * How far `value` sits from the baseline, in the "worse" direction, measured against noise.
 * A change counts only when it beats both the typical spread (sd) and a minimum percentage.
 */
function judge(value: number, base: Baseline, higherIsBetter: boolean, minPct: number): { pct: number; flag: Flag } {
  const pct = ((value - base.mean) / base.mean) * 100;
  const worsePct = higherIsBetter ? -pct : pct;
  const noisePct = (base.sd / base.mean) * 100;
  const watchAt = Math.max(minPct, noisePct);
  const poorAt = Math.max(minPct * 2, noisePct * 2);
  if (worsePct >= poorAt) return { pct, flag: 'poor' };
  if (worsePct >= watchAt) return { pct, flag: 'watch' };
  if (-worsePct >= watchAt) return { pct, flag: 'good' };
  return { pct, flag: 'ok' };
}

const signed = (pct: number) => `${pct > 0 ? '+' : ''}${Math.round(pct)}%`;

/** Today's HRV against the earlier 7 days of Health Connect readings. */
export function hrvTrend(days: HealthDay[], date: string): { today: number; baseline: number; sd: number; n: number } | null {
  const today = healthForDate(days, date)?.hrvMs;
  if (!today) return null;
  const prior = days
    .filter((d) => d.date < date && d.hrvMs)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map((d) => d.hrvMs as number);
  if (prior.length < 3) return null;
  return { today, baseline: round1(mean(prior)), sd: round1(sd(prior)), n: prior.length };
}

export function evaluateCns(inputs: CnsInputs, history: CnsCheck[], healthDays: HealthDay[], date: string): CnsEvaluation {
  const metrics: MetricResult[] = [];
  const PEN = { watch: 12, poor: 25 } as const;
  const pen = (f: Flag) => (f === 'poor' ? PEN.poor : f === 'watch' ? PEN.watch : 0);

  const tapBase = baselineOf(history, date, (c) => c.taps);
  if (inputs.taps !== null) {
    if (tapBase) {
      const { pct, flag } = judge(inputs.taps, tapBase, true, 5);
      metrics.push({ key: 'taps', label: 'Tap speed', value: `${inputs.taps} taps`, comparison: `${signed(pct)} vs your usual ${Math.round(tapBase.mean)}`, flag, penalty: pen(flag) });
    } else {
      metrics.push({ key: 'taps', label: 'Tap speed', value: `${inputs.taps} taps`, comparison: null, flag: 'ok', penalty: 0 });
    }
  }

  const rtBase = baselineOf(history, date, (c) => c.reactionMs);
  if (inputs.reactionMs !== null) {
    if (rtBase) {
      const { pct, flag } = judge(inputs.reactionMs, rtBase, false, 5);
      metrics.push({ key: 'reaction', label: 'Reaction time', value: `${inputs.reactionMs} ms`, comparison: `${signed(pct)} vs your usual ${Math.round(rtBase.mean)} ms`, flag, penalty: pen(flag) });
    } else {
      metrics.push({ key: 'reaction', label: 'Reaction time', value: `${inputs.reactionMs} ms`, comparison: null, flag: 'ok', penalty: 0 });
    }
  }

  const hrv = hrvTrend(healthDays, date);
  if (hrv) {
    // normal range: within half a standard deviation of the week's average (or 5%, whichever is wider)
    const band = Math.max(hrv.sd * 0.5, hrv.baseline * 0.05);
    const diff = hrv.today - hrv.baseline;
    const flag: Flag = diff < -2 * band ? 'poor' : diff < -band ? 'watch' : diff > band ? 'good' : 'ok';
    metrics.push({ key: 'hrv', label: 'HRV', value: `${Math.round(hrv.today)} ms`, comparison: `${signed((diff / hrv.baseline) * 100)} vs 7-day avg ${Math.round(hrv.baseline)} ms`, flag, penalty: pen(flag) });
  }

  const rhr = restingHrTrend(healthDays, date);
  if (rhr) {
    const flag: Flag = rhr.delta >= 8 ? 'poor' : rhr.delta >= 5 ? 'watch' : rhr.delta <= -3 ? 'good' : 'ok';
    metrics.push({ key: 'rhr', label: 'Resting HR', value: `${rhr.today} bpm`, comparison: `${rhr.delta > 0 ? '+' : ''}${rhr.delta} bpm vs 7-day avg ${Math.round(rhr.baseline)}`, flag, penalty: pen(flag) });
  }

  const self = (key: 'drive' | 'focus', label: string, v: number) => {
    const flag: Flag = v <= 1 ? 'poor' : v === 2 ? 'watch' : v >= 4 ? 'good' : 'ok';
    metrics.push({ key, label, value: `${v}/5`, comparison: null, flag, penalty: flag === 'poor' ? 12 : flag === 'watch' ? 6 : 0 });
  };
  self('drive', 'Drive to train', inputs.drive);
  self('focus', 'Focus', inputs.focus);
  {
    const v = inputs.stress;
    const flag: Flag = v >= 5 ? 'poor' : v === 4 ? 'watch' : v <= 2 ? 'good' : 'ok';
    metrics.push({ key: 'stress', label: 'Stress', value: `${v}/5`, comparison: null, flag, penalty: flag === 'poor' ? 12 : flag === 'watch' ? 6 : 0 });
  }

  const score = Math.max(0, Math.min(100, 100 - metrics.reduce((a, m) => a + m.penalty, 0)));
  const objective = metrics.filter((m) => m.key === 'taps' || m.key === 'reaction' || m.key === 'hrv' || m.key === 'rhr');
  const objPoor = objective.filter((m) => m.flag === 'poor').length;
  const objFlagged = objective.filter((m) => m.flag === 'poor' || m.flag === 'watch').length;

  const allPoor = metrics.filter((m) => m.flag === 'poor').length;
  let tier: CnsTier = score >= 80 ? 'ready' : score >= 60 ? 'moderate' : 'low';
  // two clearly-down objective measures outweigh feeling fine; 3+ poor measures drop to low
  if (objPoor >= 2 || allPoor >= 3) tier = 'low';
  else if (tier === 'ready' && (objPoor >= 1 || objFlagged >= 2)) tier = 'moderate';

  const baselineChecks = history.filter((c) => c.date < date).length;

  return { score, tier, metrics, baselineChecks, ...adviceFor(tier) };
}

export function adviceFor(tier: CnsTier): { headline: string; advice: string[] } {
  if (tier === 'ready') {
    return {
      headline: 'Ready — train as written',
      advice: [
        'Good day for your heaviest top sets and any planned weight increases.',
        'Keep normal rest periods on the main lifts.',
      ],
    };
  }
  if (tier === 'moderate') {
    return {
      headline: 'Moderate — train, but cap the intensity',
      advice: [
        'Keep main lifts at RPE 8 or below (2+ reps in reserve); no PR attempts.',
        'Hold today’s planned weight increases; repeat last session’s loads.',
        'Drop one set from the first compound lift if warm-ups feel slow; accessories as written.',
        'Take the longer end of your rest periods.',
      ],
    };
  }
  return {
    headline: 'Low — skip heavy and explosive work',
    advice: [
      'Do the session at about 70–80% of planned loads with half the working sets, or swap it for mobility / easy Zone 2.',
      'No jumps, sprints, max-effort sets or new weights today.',
      'Prioritise sleep tonight and re-test tomorrow before training.',
    ],
  };
}

export const TIER_LABEL: Record<CnsTier, string> = { ready: 'Ready', moderate: 'Moderate', low: 'Low' };

export function loadCnsChecks(): CnsCheck[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_CNS_CHECKS) || '[]');
    return Array.isArray(raw) ? raw.filter((c) => c && typeof c.date === 'string' && typeof c.tier === 'string') : [];
  } catch {
    return [];
  }
}

function persist(checks: CnsCheck[], opts: { silent?: boolean } = {}): CnsCheck[] {
  const trimmed = [...checks].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_STORED_CHECKS);
  try {
    localStorage.setItem(STORAGE_KEY_CNS_CHECKS, JSON.stringify(trimmed));
  } catch {
    // storage full or blocked
  }
  if (!opts.silent) touchAppData();
  try {
    window.dispatchEvent(new Event(CNS_CHECKS_EVENT));
  } catch {
    // non-browser
  }
  return trimmed;
}

/** Save today's check (one per day; a re-test replaces it). */
export function saveCnsCheck(check: CnsCheck): CnsCheck[] {
  return persist([...loadCnsChecks().filter((c) => c.date !== check.date), check]);
}

export function deleteCnsCheck(date: string): CnsCheck[] {
  return persist(loadCnsChecks().filter((c) => c.date !== date));
}

/** Used by the Drive restore. */
export function replaceCnsChecks(checks: CnsCheck[]): void {
  persist(checks.filter((c) => c && typeof c.date === 'string' && typeof c.tier === 'string'), { silent: true });
}
