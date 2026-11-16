// src/domain/muscleHeatmap.ts
import { CompletedWorkoutSession } from '../storage/storageManager';
import { WorkoutExercise, ALL_APP_SESSIONS } from './programData';
import { SetLogRecord } from '../components/ExerciseCard';
import { type HealthWorkout, interpretWorkout, withoutAppDuplicates } from './healthWorkouts';
import {
  EXERCISE_META,
  ROLE_WEIGHT,
  type MovementPattern,
  getExerciseMeta,
  muscleWeightsOf,
  muscleIdForLabel,
  sideFactor,
} from './exerciseMeta';

export type RecoveryStatus = 'fresh' | 'recovering' | 'fatigued';

export interface MuscleGroupInfo {
  id: string;
  name: string;
  category: 'upper' | 'lower' | 'core';
  view: 'front' | 'back' | 'both';
  recommendedTargetSets: number;
}

export const MUSCLE_GROUPS: MuscleGroupInfo[] = [
  { id: 'chest', name: 'Chest (Pectorals)', category: 'upper', view: 'front', recommendedTargetSets: 12 },
  { id: 'shoulders', name: 'Shoulders (Deltoids)', category: 'upper', view: 'both', recommendedTargetSets: 14 },
  { id: 'biceps', name: 'Biceps & Forearms', category: 'upper', view: 'front', recommendedTargetSets: 10 },
  { id: 'triceps', name: 'Triceps Brachii', category: 'upper', view: 'back', recommendedTargetSets: 10 },
  { id: 'lats', name: 'Lats & Upper Back', category: 'upper', view: 'back', recommendedTargetSets: 14 },
  { id: 'traps', name: 'Traps & Upper Back', category: 'upper', view: 'back', recommendedTargetSets: 8 },
  { id: 'core', name: 'Core & Abdominals', category: 'core', view: 'front', recommendedTargetSets: 12 },
  { id: 'lower_back', name: 'Lower Back & Erector Spinae', category: 'core', view: 'back', recommendedTargetSets: 8 },
  { id: 'quads', name: 'Quadriceps (VMO)', category: 'lower', view: 'front', recommendedTargetSets: 14 },
  { id: 'hamstrings', name: 'Hamstrings & Posterior Chain', category: 'lower', view: 'back', recommendedTargetSets: 12 },
  { id: 'glutes', name: 'Glutes (Maximus & Medius)', category: 'lower', view: 'back', recommendedTargetSets: 12 },
  { id: 'calves', name: 'Calves & Tibialis', category: 'lower', view: 'both', recommendedTargetSets: 10 },
];

export interface MuscleStatus {
  id: string;
  name: string;
  category: 'upper' | 'lower' | 'core';
  view: 'front' | 'back' | 'both';
  status: RecoveryStatus;
  lastTrainedDate: string | null;
  hoursElapsed: number | null;
  daysElapsed: number | null;
  setsLast7Days: number;
  recommendedTargetSets: number;
  recentExercises: string[];
  recoveryPercentage: number; // 0 to 100
  guidance: string;
}

/** A muscle below this share of a set gets volume credit but is not marked as "trained" (its recovery clock is left alone). */
const TRAINED_MIN_WEIGHT = 0.5;

/** Completed sets in one stored log value: a set array counts its completed sets, a legacy `{ completed: true }` record counts as 3. */
export function completedSetCount(logVal: unknown): number {
  if (Array.isArray(logVal)) return logVal.filter((s) => s && (s as { isCompleted?: boolean }).isCompleted).length;
  const v = logVal as { completed?: boolean; isCompleted?: boolean } | null | undefined;
  return v?.completed === true || v?.isCompleted === true ? 3 : 0;
}

/**
 * muscle id -> share of one set (1 primary, 0.5 secondary, 0.25 tertiary).
 * Exercises in EXERCISE_META use their authored roles. Anything else (variations, custom exercises) falls back
 * to its muscleGroups labels in listed order: the first recognised muscle is primary, the rest secondary.
 */
export function resolveExerciseMuscleWeights(exerciseId: string, exercise?: WorkoutExercise): Record<string, number> {
  const baseId = exerciseId.replace(/__side_(left|right)$/i, '');
  const known = EXERCISE_META[baseId];
  if (known) return muscleWeightsOf(known);

  const ex =
    exercise ||
    ALL_APP_SESSIONS.flatMap((s) => s.exercises).find((e) => e.id === baseId || e.baseExerciseId === baseId);

  const weights: Record<string, number> = {};
  (ex?.muscleGroups || []).forEach((label: string) => {
    const id = muscleIdForLabel(label);
    if (!id || weights[id] !== undefined) return;
    weights[id] = Object.keys(weights).length === 0 ? ROLE_WEIGHT.primary : ROLE_WEIGHT.secondary;
  });
  return weights;
}

/**
 * Muscle groups an exercise works, strongest role first.
 */
export function resolveExerciseMuscleGroups(exerciseId: string, exercise?: WorkoutExercise): string[] {
  return Object.keys(resolveExerciseMuscleWeights(exerciseId, exercise));
}

/**
 * Calculates current recovery and fatigue status for all muscle groups based on:
 * 1. Historical completed workout sessions (storageManager.getHistory())
 * 2. Active in-progress workout set logs
 * 3. Reference now date (for deterministic testing & accurate time deltas)
 * 4. Workouts recorded outside the app (Health Connect), interpreted as set-equivalents per muscle
 */
export function calculateMuscleHeatmap(
  history: CompletedWorkoutSession[] = [],
  activeLogs: Record<string, SetLogRecord[]> = {},
  now: Date = new Date(),
  externalWorkouts: HealthWorkout[] = []
): Record<string, MuscleStatus> {
  const nowMs = now.getTime();
  const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;

  // Intermediate tracking per muscle
  const muscleData: Record<
    string,
    {
      latestTimestampMs: number | null;
      sets7Days: number;
      recentExercises: Set<string>;
    }
  > = {};

  MUSCLE_GROUPS.forEach((m) => {
    muscleData[m.id] = {
      latestTimestampMs: null,
      sets7Days: 0,
      recentExercises: new Set<string>(),
    };
  });

  const allExercises = ALL_APP_SESSIONS.flatMap((s) => s.exercises);
  const exerciseName = (exerciseId: string): string => {
    const info = allExercises.find((e) => e.id === exerciseId || e.baseExerciseId === exerciseId);
    return info ? info.name : exerciseId;
  };

  /** Credits `sets` of one exercise to each muscle by role; only primary/secondary muscles count as trained at `timeMs`. */
  const credit = (exerciseId: string, sets: number, timeMs: number, countsToward7Days: boolean) => {
    Object.entries(resolveExerciseMuscleWeights(exerciseId)).forEach(([mId, weight]) => {
      const d = muscleData[mId];
      if (!d) return;
      if (countsToward7Days) d.sets7Days += sets * weight * sideFactor(exerciseId);
      if (weight < TRAINED_MIN_WEIGHT) return;
      if (d.latestTimestampMs === null || timeMs > d.latestTimestampMs) d.latestTimestampMs = timeMs;
      d.recentExercises.add(exerciseName(exerciseId));
    });
  };

  // 1. Active session logs (sets completed right now)
  Object.entries(activeLogs).forEach(([exerciseId, sets]) => {
    const completedSets = completedSetCount(sets);
    if (completedSets > 0) credit(exerciseId, completedSets, nowMs, true);
  });

  // 2. Completed sessions from history
  history.forEach((session) => {
    const sessionTimeMs = new Date(session.date).getTime();
    if (isNaN(sessionTimeMs)) return;
    if (!session.logs || typeof session.logs !== 'object') return;
    const isWithin7Days = sessionTimeMs >= sevenDaysAgoMs;
    Object.entries(session.logs).forEach(([exerciseId, logVal]) => {
      const setCount = completedSetCount(logVal);
      if (setCount > 0) credit(exerciseId, setCount, sessionTimeMs, isWithin7Days);
    });
  });

  // 2b. Workouts from Health Connect (BJJ, runs, a watch-tracked lift...), minus copies of workouts logged here
  const appTimes = history.map((s) => new Date(s.date).getTime()).filter((t) => !isNaN(t));
  withoutAppDuplicates(externalWorkouts, appTimes).forEach((w) => {
    const it = interpretWorkout(w);
    if (isNaN(it.endMs) || it.endMs > nowMs + 60 * 60 * 1000) return;
    const isWithin7Days = it.endMs >= sevenDaysAgoMs;
    Object.entries(it.sets).forEach(([mId, sets]) => {
      const d = muscleData[mId];
      if (!d) return;
      if (isWithin7Days) d.sets7Days += Math.round(sets);
      if (!it.trained.includes(mId)) return;
      if (d.latestTimestampMs === null || it.endMs > d.latestTimestampMs) d.latestTimestampMs = it.endMs;
      d.recentExercises.add(`${it.label} (Health Connect)`);
    });
  });

  // 3. Classify recovery status for each muscle group
  const result: Record<string, MuscleStatus> = {};

  MUSCLE_GROUPS.forEach((m) => {
    const data = muscleData[m.id];
    const sets7Days = Math.round(data.sets7Days * 10) / 10;
    let hoursElapsed: number | null = null;
    let daysElapsed: number | null = null;
    let status: RecoveryStatus = 'fresh';
    let recoveryPercentage = 100;
    let guidance = 'Fully recovered. Optimal capacity for heavy loads and high neural output.';

    if (data.latestTimestampMs !== null) {
      const diffMs = Math.max(0, nowMs - data.latestTimestampMs);
      hoursElapsed = Math.floor(diffMs / (1000 * 60 * 60));
      daysElapsed = parseFloat((diffMs / (1000 * 60 * 60 * 24)).toFixed(1));

      // Rule:
      // 🔴 Fatigued: Trained in the last 24h (<24h) OR high accumulated volume (>=14 sets)
      // 🟡 Recovering: Trained 24–48h ago OR moderate weekly volume (8-13 sets)
      // 🟢 Fresh: >=48h elapsed AND manageable weekly volume
      if (hoursElapsed < 24 || sets7Days >= 14) {
        status = 'fatigued';
        recoveryPercentage = Math.min(45, Math.max(10, Math.round((hoursElapsed / 24) * 45)));
        guidance = hoursElapsed < 24
          ? `Trained ${hoursElapsed}h ago. Muscle protein breakdown elevated. Recommended: Active recovery or alternate muscle group.`
          : `High weekly volume (${sets7Days} sets). Recommend light recovery session or deload.`;
      } else if (hoursElapsed < 48 || sets7Days >= 8) {
        status = 'recovering';
        recoveryPercentage = Math.min(85, Math.max(50, 50 + Math.round(((hoursElapsed - 24) / 24) * 35)));
        guidance = `Trained ${hoursElapsed}h ago. Supercompensation underway. Moderate volume/accessories suitable; avoid maximal 1RM attempts.`;
      } else {
        status = 'fresh';
        recoveryPercentage = 100;
        guidance = `Trained ${daysElapsed} days ago. Fully restored glycogen and neuromuscular readiness. Primed for Tier 1 progression.`;
      }
    } else {
      // Never trained in recorded history
      status = 'fresh';
      recoveryPercentage = 100;
      guidance = 'No recorded strain. Ready for full programmed volume.';
    }

    result[m.id] = {
      id: m.id,
      name: m.name,
      category: m.category,
      view: m.view,
      status,
      lastTrainedDate: data.latestTimestampMs ? new Date(data.latestTimestampMs).toLocaleDateString() : null,
      hoursElapsed,
      daysElapsed,
      setsLast7Days: sets7Days,
      recommendedTargetSets: m.recommendedTargetSets,
      recentExercises: Array.from(data.recentExercises).slice(0, 4),
      recoveryPercentage,
      guidance,
    };
  });

  return result;
}

export interface PatternBalance {
  /** completed sets in the last 7 days per movement pattern (not muscle-weighted; per-side sets count at half) */
  sets: Record<MovementPattern, number>;
  /** plain-language warnings; empty when balanced or when there is too little volume to judge */
  flags: string[];
}

const BALANCE_MIN_SETS = 6;
const BALANCE_MAX_RATIO = 1.5;

/**
 * 7-day strength-set balance between opposing movement patterns (upper push vs pull, squat vs hinge).
 * Counts only sets logged in this app; BJJ and other outside workouts are not included.
 */
export function calculatePatternBalance(
  history: CompletedWorkoutSession[] = [],
  activeLogs: Record<string, SetLogRecord[]> = {},
  now: Date = new Date()
): PatternBalance {
  const nowMs = now.getTime();
  const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const sets: Record<MovementPattern, number> = {
    upper_push: 0,
    upper_pull: 0,
    squat: 0,
    hinge: 0,
    core: 0,
    carry: 0,
    conditioning: 0,
    other: 0,
  };

  const add = (exerciseId: string, count: number) => {
    const m = getExerciseMeta(exerciseId);
    if (m && count > 0) sets[m.pattern] += count * sideFactor(exerciseId);
  };

  Object.entries(activeLogs).forEach(([exerciseId, logs]) => add(exerciseId, completedSetCount(logs)));

  history.forEach((session) => {
    const t = new Date(session.date).getTime();
    if (isNaN(t) || t < sevenDaysAgoMs || t > nowMs) return;
    if (!session.logs || typeof session.logs !== 'object') return;
    Object.entries(session.logs).forEach(([exerciseId, logVal]) => add(exerciseId, completedSetCount(logVal)));
  });

  const flags: string[] = [];
  const compare = (a: number, b: number, aLabel: string, bLabel: string, addA: string, addB: string) => {
    if (a + b < BALANCE_MIN_SETS) return;
    if (a > b * BALANCE_MAX_RATIO) flags.push(`${aLabel} is ahead of ${bLabel} (${a} vs ${b} sets in 7 days). ${addB}`);
    else if (b > a * BALANCE_MAX_RATIO) flags.push(`${bLabel} is ahead of ${aLabel} (${b} vs ${a} sets in 7 days). ${addA}`);
  };
  compare(sets.upper_push, sets.upper_pull, 'Pushing', 'pulling', 'Add a pressing set or two.', 'Add rows or pull-ups.');
  compare(sets.squat, sets.hinge, 'Squatting', 'hinging', 'Add a squat-pattern accessory.', 'Add a hinge accessory.');

  return { sets, flags };
}

