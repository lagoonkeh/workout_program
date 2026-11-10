// Small helpers shared by WorkoutAppMain (src/App.tsx) and the components in src/workout/.
import type { WorkoutExercise } from '../domain/programData';
import type { SetLogRecord } from '../components/ExerciseCard';
import type { LoadSuggestion } from '../domain/progression';

export function ViewLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-16 text-slate-400 text-sm" role="status">
      Loading…
    </div>
  );
}

export const TIER_META: Record<string, { label: string; desc: string; badgeClass: string }> = {
  T1: {
    label: 'Tier 1',
    desc: 'Strength & Powerbuilding (AMRAP)',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  T2: {
    label: 'Tier 2',
    desc: 'Hypertrophy & Work Capacity',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  T3: {
    label: 'Tier 3',
    desc: 'Accessory & Joint Bulletproofing',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
};

export function createDefaultExerciseLogs(exercise: WorkoutExercise): SetLogRecord[] {
  return Array.from({ length: exercise.targetSets }, (_, i) => ({
    setNumber: i + 1,
    targetReps: exercise.targetReps,
    weightLbs: exercise.defaultWeightLbs || exercise.defaultWeight || 0,
    repsAchieved: 0,
    isCompleted: false,
    notes: '',
  }));
}

// A next-weight suggestion that was written into an exercise's sets (so it can be undone)
export type AppliedSuggestion = LoadSuggestion & { key: string; fromWeightLbs: number; undone?: boolean };
