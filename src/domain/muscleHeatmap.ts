// src/domain/muscleHeatmap.ts
import { CompletedWorkoutSession } from '../storage/storageManager';
import { WorkoutExercise, ALL_APP_SESSIONS } from './programData';
import { SetLogRecord } from '../components/ExerciseCard';
import { type HealthWorkout, interpretWorkout, withoutAppDuplicates } from './healthWorkouts';

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

// Exercise ID to target muscle groups map
const EXERCISE_MUSCLE_MAP: Record<string, string[]> = {
  // Lower A
  t1_bb_squat: ['quads', 'glutes', 'core'],
  t1_squat: ['quads', 'glutes', 'core'],
  t2_atg_split_squat: ['quads', 'glutes'],
  t3_bulgarian_split_squat: ['quads', 'glutes'],
  t3_tibialis_wall_raise: ['calves'],
  t3_patrick_step_down: ['quads', 'calves'],
  t3_mcgill_big_3: ['core', 'lower_back'],
  t3_loaded_horse_stance: ['quads', 'glutes', 'core'],

  // Upper A
  t1_bb_ohp: ['shoulders', 'triceps', 'traps'],
  t1_ohp: ['shoulders', 'triceps', 'traps'],
  t2_pullup_ladders: ['lats', 'biceps', 'traps'],
  t2_pullup: ['lats', 'biceps', 'traps'],
  t3_filly_kb_z_press: ['shoulders', 'core', 'triceps'],
  t3_yellow_dude_lsit: ['core'],
  t3_kb_arm_superset: ['biceps', 'triceps'],
  t3_german_hang_prep: ['shoulders', 'lats', 'biceps'],

  // Lower B
  t1_bb_rdl: ['hamstrings', 'glutes', 'lower_back', 'lats'],
  t1_deadlift: ['hamstrings', 'glutes', 'lower_back', 'lats'],
  t1_rdl: ['hamstrings', 'glutes', 'lower_back', 'lats'],
  t2_kb_good_morning: ['hamstrings', 'glutes', 'lower_back'],
  t3_patrick_step_down_b: ['quads', 'calves'],
  t3_biering_sorensen: ['lower_back', 'glutes', 'hamstrings'],
  t3_kb_suitcase_carry: ['core', 'shoulders'],
  t3_jefferson_curl: ['hamstrings', 'lower_back'],

  // Upper B
  t1_bb_bench_press: ['chest', 'shoulders', 'triceps'],
  t1_bench_press: ['chest', 'shoulders', 'triceps'],
  t2_barbell_row: ['lats', 'traps', 'biceps'],
  t2_incline_dumbbell_press: ['chest', 'shoulders', 'triceps'],
  t2_kb_single_arm_row: ['lats', 'traps', 'biceps'],
  t3_kb_floor_press_er: ['chest', 'triceps', 'shoulders'],
  t3_push_up: ['chest', 'triceps', 'shoulders'],
  t3_athlean_face_pull: ['shoulders', 'traps'],
  t3_dead_hang_club_mills: ['shoulders', 'lats', 'core'],

  // Athlean Abs & Finishers
  core_hanging_leg_raise: ['core'],
  t3_athlean_hanging_knee_raise: ['core'],
  t3_athlean_hanging_corkscrew: ['core'],
  t3_athlean_hollow_body_hold: ['core'],
  t3_athlean_cross_mountain_climber: ['core', 'shoulders'],
  t3_athlean_iso_crunch: ['core'],
  t3_athlean_serratus_plank: ['core', 'shoulders'],

  // Conditioning & Recovery
  t1_run_zone2: ['quads', 'hamstrings', 'calves'],
  t2_backward_locomotion: ['quads', 'calves'],
  t3_rowing_metabolic_flush: ['quads', 'hamstrings', 'lats'],
};

/**
 * Resolves muscle groups for an exercise, checking explicit muscleGroups array or fallback catalog.
 */
export function resolveExerciseMuscleGroups(exerciseId: string, exercise?: WorkoutExercise): string[] {
  const baseId = exerciseId.replace(/__side_(left|right)$/i, '');
  if (EXERCISE_MUSCLE_MAP[baseId]) {
    return EXERCISE_MUSCLE_MAP[baseId];
  }

  const ex = exercise || ALL_APP_SESSIONS.flatMap((s) => s.exercises).find(
    (e) => e.id === baseId || e.baseExerciseId === baseId
  );

  if (ex?.muscleGroups && ex.muscleGroups.length > 0) {
    const list: string[] = [];
    const lower = ex.muscleGroups.map((m: string) => m.toLowerCase());
    if (lower.some((m: string) => m.includes('chest') || m.includes('pectoral'))) list.push('chest');
    if (lower.some((m: string) => m.includes('lat') || m.includes('back'))) list.push('lats');
    if (lower.some((m: string) => m.includes('quad') || m.includes('vmo'))) list.push('quads');
    if (lower.some((m: string) => m.includes('hamstring') || m.includes('posterior'))) list.push('hamstrings');
    if (lower.some((m: string) => m.includes('glute'))) list.push('glutes');
    if (lower.some((m: string) => m.includes('shoulder') || m.includes('deltoid'))) list.push('shoulders');
    if (lower.some((m: string) => m.includes('tricep'))) list.push('triceps');
    if (lower.some((m: string) => m.includes('bicep'))) list.push('biceps');
    if (lower.some((m: string) => m.includes('core') || m.includes('ab') || m.includes('oblique'))) list.push('core');
    if (lower.some((m: string) => m.includes('calf') || m.includes('tibialis'))) list.push('calves');
    if (lower.some((m: string) => m.includes('trap'))) list.push('traps');
    if (list.length > 0) return list;
  }

  return [];
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

  // 1. Process active session logs (if athlete has completed sets right now)
  Object.entries(activeLogs).forEach(([exerciseId, sets]) => {
    const completedSets = sets.filter((s) => s.isCompleted).length;
    if (completedSets > 0) {
      const muscles = resolveExerciseMuscleGroups(exerciseId);
      muscles.forEach((mId) => {
        if (muscleData[mId]) {
          muscleData[mId].latestTimestampMs = Math.max(
            muscleData[mId].latestTimestampMs || 0,
            nowMs
          );
          muscleData[mId].sets7Days += completedSets;

          // Find exercise name from program data
          const exInfo = ALL_APP_SESSIONS.flatMap((s) => s.exercises).find(
            (e) => e.id === exerciseId || e.baseExerciseId === exerciseId
          );
          muscleData[mId].recentExercises.add(exInfo ? exInfo.name : exerciseId);
        }
      });
    }
  });

  // 2. Process historical completed sessions
  history.forEach((session) => {
    const sessionTimeMs = new Date(session.date).getTime();
    if (isNaN(sessionTimeMs)) return;

    const isWithin7Days = sessionTimeMs >= sevenDaysAgoMs;

    // Inspect logs within the session
    if (session.logs && typeof session.logs === 'object') {
      Object.entries(session.logs).forEach(([exerciseId, logVal]) => {
        const isCompleted =
          (logVal as any)?.completed === true ||
          (logVal as any)?.isCompleted === true ||
          (Array.isArray(logVal) && logVal.some((s) => s.isCompleted));

        const setCount = Array.isArray(logVal)
          ? logVal.filter((s) => s.isCompleted).length
          : isCompleted
          ? 3
          : 0;

        if (isCompleted || setCount > 0) {
          const muscles = resolveExerciseMuscleGroups(exerciseId);
          muscles.forEach((mId) => {
            if (muscleData[mId]) {
              // Track most recent training timestamp
              if (
                muscleData[mId].latestTimestampMs === null ||
                sessionTimeMs > muscleData[mId].latestTimestampMs!
              ) {
                muscleData[mId].latestTimestampMs = sessionTimeMs;
              }

              if (isWithin7Days) {
                muscleData[mId].sets7Days += setCount || 3;
              }

              const exInfo = ALL_APP_SESSIONS.flatMap((s) => s.exercises).find(
                (e) => e.id === exerciseId || e.baseExerciseId === exerciseId
              );
              muscleData[mId].recentExercises.add(exInfo ? exInfo.name : exerciseId);
            }
          });
        }
      });
    }
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
      if (hoursElapsed < 24 || data.sets7Days >= 14) {
        status = 'fatigued';
        recoveryPercentage = Math.min(45, Math.max(10, Math.round((hoursElapsed / 24) * 45)));
        guidance = hoursElapsed < 24
          ? `Trained ${hoursElapsed}h ago. Muscle protein breakdown elevated. Recommended: Active recovery or alternate muscle group.`
          : `High weekly volume (${data.sets7Days} sets). Recommend light recovery session or deload.`;
      } else if (hoursElapsed < 48 || data.sets7Days >= 8) {
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
      setsLast7Days: data.sets7Days,
      recommendedTargetSets: m.recommendedTargetSets,
      recentExercises: Array.from(data.recentExercises).slice(0, 4),
      recoveryPercentage,
      guidance,
    };
  });

  return result;
}
