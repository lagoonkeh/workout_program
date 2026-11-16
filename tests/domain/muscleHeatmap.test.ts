// tests/domain/muscleHeatmap.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateMuscleHeatmap,
  resolveExerciseMuscleGroups,
  resolveExerciseMuscleWeights,
  calculatePatternBalance,
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

    it('credits muscle volume by role weight: bench 5 sets gives chest 5, shoulders 2.5, triceps 2.5', () => {
      const activeLogs = {
        t1_bb_bench_press: [
          { setIndex: 1, weight: 185, reps: 3, isCompleted: true },
          { setIndex: 2, weight: 185, reps: 3, isCompleted: true },
          { setIndex: 3, weight: 185, reps: 3, isCompleted: true },
          { setIndex: 4, weight: 185, reps: 3, isCompleted: true },
          { setIndex: 5, weight: 185, reps: 3, isCompleted: true },
        ],
      };

      const result = calculateMuscleHeatmap([], activeLogs as any, fixedNow);
      expect(result['chest'].setsLast7Days).toBe(5);
      expect(result['shoulders'].setsLast7Days).toBe(2.5);
      expect(result['triceps'].setsLast7Days).toBe(2.5);
    });

    it('tertiary muscle gets volume credit but recovery clock is left alone (core on squat)', () => {
      const eightHoursAgo = new Date(fixedNow.getTime() - 8 * 60 * 60 * 1000).toISOString();
      const session: CompletedWorkoutSession = {
        sessionId: 'lower_a',
        date: eightHoursAgo,
        logs: {
          t1_squat: [
            { isCompleted: true, weight: 275, reps: 3 },
            { isCompleted: true, weight: 275, reps: 3 },
            { isCompleted: true, weight: 275, reps: 3 },
            { isCompleted: true, weight: 275, reps: 3 },
          ] as any,
        },
      };

      const result = calculateMuscleHeatmap([session], {}, fixedNow);
      const core = result['core'];
      expect(core.setsLast7Days).toBe(1);
      expect(core.hoursElapsed).toBeNull();
      expect(core.status).toBe('fresh');
      expect(core.recentExercises.some((name) => name.toLowerCase().includes('squat'))).toBe(false);

      expect(result['quads'].status).toBe('fatigued');
    });

    it('fallback resolves muscle weights in listed order: first primary, others secondary', () => {
      const weights = resolveExerciseMuscleWeights('custom_x', {
        id: 'custom_x',
        name: 'X',
        muscleGroups: ['Lats', 'Biceps', 'Rear Deltoid'],
      } as any);
      expect(weights).toEqual({ lats: 1, biceps: 0.5, shoulders: 0.5 });
    });

    it('counts unilateral per-side sets at half for volume but maintains recovery status', () => {
      const eightHoursAgo = new Date(fixedNow.getTime() - 8 * 60 * 60 * 1000).toISOString();
      const bothSidesSession: CompletedWorkoutSession = {
        sessionId: 'lower_a',
        date: eightHoursAgo,
        logs: {
          t3_bulgarian_split_squat__side_left: [
            { isCompleted: true, weight: 45, reps: 8 },
            { isCompleted: true, weight: 45, reps: 8 },
            { isCompleted: true, weight: 45, reps: 8 },
          ] as any,
          t3_bulgarian_split_squat__side_right: [
            { isCompleted: true, weight: 45, reps: 8 },
            { isCompleted: true, weight: 45, reps: 8 },
            { isCompleted: true, weight: 45, reps: 8 },
          ] as any,
        },
      };

      const bothResult = calculateMuscleHeatmap([bothSidesSession], {}, fixedNow);
      expect(bothResult['quads'].setsLast7Days).toBe(3);
      expect(bothResult['glutes'].setsLast7Days).toBe(1.5);
      expect(calculatePatternBalance([bothSidesSession], {}, fixedNow).sets.squat).toBe(3);

      const oneSideSession: CompletedWorkoutSession = {
        sessionId: 'lower_a',
        date: eightHoursAgo,
        logs: {
          t3_bulgarian_split_squat__side_left: [
            { isCompleted: true, weight: 45, reps: 8 },
            { isCompleted: true, weight: 45, reps: 8 },
            { isCompleted: true, weight: 45, reps: 8 },
          ] as any,
        },
      };

      const oneResult = calculateMuscleHeatmap([oneSideSession], {}, fixedNow);
      expect(oneResult['quads'].setsLast7Days).toBe(1.5);
      expect(oneResult['quads'].status).toBe('fatigued');
    });

    it('calculatePatternBalance calculates 7-day pattern balance and emits warning flags', () => {
      const twoDaysAgo = new Date(fixedNow.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const eightDaysAgo = new Date(fixedNow.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();

      const session: CompletedWorkoutSession = {
        sessionId: 'upper_b',
        date: twoDaysAgo,
        logs: {
          t1_bb_bench_press: Array(10).fill({ isCompleted: true, weight: 185, reps: 3 }) as any,
          t2_barbell_row: Array(4).fill({ isCompleted: true, weight: 135, reps: 8 }) as any,
        },
      };

      const oldSession: CompletedWorkoutSession = {
        sessionId: 'upper_b',
        date: eightDaysAgo,
        logs: {
          t2_barbell_row: Array(10).fill({ isCompleted: true, weight: 135, reps: 8 }) as any,
        },
      };

      const balance = calculatePatternBalance([session, oldSession], {}, fixedNow);
      expect(balance.sets.upper_push).toBe(10);
      expect(balance.sets.upper_pull).toBe(4);
      expect(balance.flags.length).toBe(1);
      expect(balance.flags[0].startsWith('Pushing is ahead of pulling')).toBe(true);

      const smallSession: CompletedWorkoutSession = {
        sessionId: 'upper_b',
        date: twoDaysAgo,
        logs: {
          t1_bb_bench_press: Array(3).fill({ isCompleted: true, weight: 185, reps: 3 }) as any,
          t2_barbell_row: Array(2).fill({ isCompleted: true, weight: 135, reps: 8 }) as any,
        },
      };

      const smallBalance = calculatePatternBalance([smallSession], {}, fixedNow);
      expect(smallBalance.flags.length).toBe(0);
    });
  });
});
