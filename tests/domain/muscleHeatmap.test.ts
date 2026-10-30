// tests/domain/muscleHeatmap.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateMuscleHeatmap,
  resolveExerciseMuscleGroups,
  MUSCLE_GROUPS,
} from '../../src/domain/muscleHeatmap';
import { CompletedWorkoutSession } from '../../src/storage/storageManager';

describe('domain/muscleHeatmap', () => {
  describe('resolveExerciseMuscleGroups', () => {
    it('maps known compound movements to primary and secondary muscle groups', () => {
      expect(resolveExerciseMuscleGroups('t1_bench_press')).toEqual(['chest', 'shoulders', 'triceps']);
      expect(resolveExerciseMuscleGroups('t1_squat')).toEqual(['quads', 'glutes', 'core']);
      expect(resolveExerciseMuscleGroups('t1_deadlift')).toEqual(['hamstrings', 'glutes', 'lower_back', 'lats']);
      expect(resolveExerciseMuscleGroups('t2_barbell_row')).toEqual(['lats', 'traps', 'biceps']);
      expect(resolveExerciseMuscleGroups('t2_incline_dumbbell_press')).toEqual(['chest', 'shoulders', 'triceps']);
      expect(resolveExerciseMuscleGroups('core_hanging_leg_raise')).toEqual(['core']);
    });

    it('handles unilateral side suffix correctly', () => {
      expect(resolveExerciseMuscleGroups('t3_bulgarian_split_squat__side_left')).toEqual(['quads', 'glutes']);
      expect(resolveExerciseMuscleGroups('t3_bulgarian_split_squat__side_right')).toEqual(['quads', 'glutes']);
    });

    it('falls back to exercise.muscleGroups if exerciseId is not in hardcoded catalog', () => {
      const fallbackEx: any = {
        id: 'custom_bicep_curl',
        name: 'Custom Bicep Curl',
        muscleGroups: ['Biceps', 'Forearms'],
      };
      expect(resolveExerciseMuscleGroups('custom_bicep_curl', fallbackEx)).toEqual(['biceps']);
    });
  });

  describe('calculateMuscleHeatmap', () => {
    const fixedNow = new Date('2026-10-28T12:00:00Z');

    it('returns all 12 muscle groups as Fresh (100% recovery) when no workouts are logged', () => {
      const result = calculateMuscleHeatmap([], {}, fixedNow);

      expect(Object.keys(result).length).toBe(MUSCLE_GROUPS.length);

      MUSCLE_GROUPS.forEach((m) => {
        const item = result[m.id];
        expect(item).toBeDefined();
        expect(item.status).toBe('fresh');
        expect(item.recoveryPercentage).toBe(100);
        expect(item.hoursElapsed).toBeNull();
        expect(item.setsLast7Days).toBe(0);
      });
    });

    it('classifies muscle trained 8 hours ago as Fatigued (elevated breakdown)', () => {
      const eightHoursAgo = new Date(fixedNow.getTime() - 8 * 60 * 60 * 1000).toISOString();

      const session: CompletedWorkoutSession = {
        sessionId: 'upper_b',
        date: eightHoursAgo,
        logs: {
          t1_bb_bench_press: { completed: true, weight: 185, reps: 3, notes: '' },
        },
      };

      const result = calculateMuscleHeatmap([session], {}, fixedNow);

      const chest = result['chest'];
      expect(chest.status).toBe('fatigued');
      expect(chest.hoursElapsed).toBe(8);
      expect(chest.recoveryPercentage).toBeLessThan(45);
      expect(chest.recentExercises).toContain('Barbell Bench Press');

      // Shoulders and triceps were also engaged
      expect(result['shoulders'].status).toBe('fatigued');
      expect(result['triceps'].status).toBe('fatigued');

      // Quads should remain completely fresh
      expect(result['quads'].status).toBe('fresh');
      expect(result['quads'].recoveryPercentage).toBe(100);
    });

    it('classifies muscle trained 32 hours ago as Recovering (supercompensation underway)', () => {
      const thirtyTwoHoursAgo = new Date(fixedNow.getTime() - 32 * 60 * 60 * 1000).toISOString();

      const session: CompletedWorkoutSession = {
        sessionId: 'lower_a',
        date: thirtyTwoHoursAgo,
        logs: {
          t1_squat: { completed: true, weight: 275, reps: 3, notes: '' },
        },
      };

      const result = calculateMuscleHeatmap([session], {}, fixedNow);

      const quads = result['quads'];
      expect(quads.status).toBe('recovering');
      expect(quads.hoursElapsed).toBe(32);
      expect(quads.recoveryPercentage).toBeGreaterThanOrEqual(50);
      expect(quads.recoveryPercentage).toBeLessThanOrEqual(85);
    });

    it('classifies muscle trained 72 hours ago as Fresh (48h+ recovery)', () => {
      const seventyTwoHoursAgo = new Date(fixedNow.getTime() - 72 * 60 * 60 * 1000).toISOString();

      const session: CompletedWorkoutSession = {
        sessionId: 'lower_b',
        date: seventyTwoHoursAgo,
        logs: {
          t1_deadlift: { completed: true, weight: 315, reps: 3, notes: '' },
        },
      };

      const result = calculateMuscleHeatmap([session], {}, fixedNow);

      const hamstrings = result['hamstrings'];
      expect(hamstrings.status).toBe('fresh');
      expect(hamstrings.hoursElapsed).toBe(72);
      expect(hamstrings.recoveryPercentage).toBe(100);
    });

    it('classifies muscle as Fatigued if high weekly volume (>= 14 sets) even if 60h elapsed', () => {
      const sixtyHoursAgo = new Date(fixedNow.getTime() - 60 * 60 * 1000).toISOString();
      const threeDaysAgo = new Date(fixedNow.getTime() - 72 * 60 * 60 * 1000).toISOString();
      const fiveDaysAgo = new Date(fixedNow.getTime() - 120 * 60 * 60 * 1000).toISOString();

      // Create multiple sessions accumulating 15 sets of chest within 7 days
      const s1: CompletedWorkoutSession = {
        sessionId: 'upper_a',
        date: fiveDaysAgo,
        logs: {
          t1_bench_press: [
            { isCompleted: true, weight: 185, reps: 3 },
            { isCompleted: true, weight: 185, reps: 3 },
            { isCompleted: true, weight: 185, reps: 3 },
            { isCompleted: true, weight: 185, reps: 3 },
            { isCompleted: true, weight: 185, reps: 3 },
          ] as any,
        },
      };
      const s2: CompletedWorkoutSession = {
        sessionId: 'upper_b',
        date: threeDaysAgo,
        logs: {
          t2_incline_dumbbell_press: [
            { isCompleted: true, weight: 70, reps: 8 },
            { isCompleted: true, weight: 70, reps: 8 },
            { isCompleted: true, weight: 70, reps: 8 },
            { isCompleted: true, weight: 70, reps: 8 },
            { isCompleted: true, weight: 70, reps: 8 },
          ] as any,
        },
      };
      const s3: CompletedWorkoutSession = {
        sessionId: 'upper_a',
        date: sixtyHoursAgo,
        logs: {
          t3_push_up: [
            { isCompleted: true, weight: 0, reps: 15 },
            { isCompleted: true, weight: 0, reps: 15 },
            { isCompleted: true, weight: 0, reps: 15 },
            { isCompleted: true, weight: 0, reps: 15 },
            { isCompleted: true, weight: 0, reps: 15 },
          ] as any,
        },
      };

      const result = calculateMuscleHeatmap([s1, s2, s3], {}, fixedNow);

      const chest = result['chest'];
      expect(chest.setsLast7Days).toBe(15);
      expect(chest.status).toBe('fatigued'); // Over accumulated threshold (>=14)
    });

    it('integrates active in-progress sets from activeLogs in real time', () => {
      const activeLogs = {
        t1_squat: [
          { setIndex: 1, weight: 225, reps: 3, isCompleted: true },
          { setIndex: 2, weight: 225, reps: 3, isCompleted: true },
        ],
      };

      const result = calculateMuscleHeatmap([], activeLogs as any, fixedNow);

      const quads = result['quads'];
      expect(quads.status).toBe('fatigued');
      expect(quads.hoursElapsed).toBe(0);
      expect(quads.setsLast7Days).toBe(2);
    });
  });
});
