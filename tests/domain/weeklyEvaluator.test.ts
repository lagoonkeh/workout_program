// tests/domain/weeklyEvaluator.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseAthleteComment,
  evaluateWeeklyPerformance,
} from '../../src/domain/weeklyEvaluator';
import { WORKOUT_PROGRAM, WorkoutExercise } from '../../src/domain/programData';
import { SetLogRecord } from '../../src/components/ExerciseCard';
import { MobilityEntry } from '../../src/domain/mobility';

const mockExercise: WorkoutExercise = {
  id: 't1_bb_squat',
  name: 'Barbell Back Squat',
  tier: 'T1',
  targetSets: 3,
  targetReps: '3',
  isAmrapLastSet: true,
  tempo: '31X1',
  restSeconds: 180,
  equipment: 'barbell',
  defaultWeightLbs: 185,
  muscleGroups: ['Quadriceps', 'Glutes'],
  biomechanicalRationale: 'Primary strength compound.',
  progressionRule: 'Add 10 lbs weekly.',
  regression: {
    condition: 'Patellar tendon pain > 2/10',
    exerciseId: 't1_bb_box_squat',
    name: 'Barbell Box Squat to Parallel',
    instructions: 'Pause on box without relaxing core.',
    tempo: '31X1',
  },
};

describe('weeklyEvaluator Domain Engine', () => {
  describe('parseAthleteComment', () => {
    it('detects knee tendinitis & joint pain flags and triggers regression recommendation', () => {
      const insight = parseAthleteComment('Knee felt achy, around 3/10 discomfort in the hole', mockExercise);
      expect(insight.sentiment).toBe('pain');
      expect(insight.keywordsDetected).toContain('knee');
      expect(insight.keywordsDetected).toContain('3/10');
      expect(insight.recommendation).toContain('Barbell Box Squat to Parallel');
    });

    it('detects ease and explosive readiness for progressive overload', () => {
      const insight = parseAthleteComment('Flew up, felt super light and easy, RPE 6', mockExercise);
      expect(insight.sentiment).toBe('positive');
      expect(insight.keywordsDetected).toContain('flew up');
      expect(insight.keywordsDetected).toContain('easy');
      expect(insight.recommendation).toContain('progressive overload');
    });

    it('detects technical failure and neuromuscular fatigue', () => {
      const insight = parseAthleteComment('Failed rep 3, heavy grind at sticking point, RPE 10', mockExercise);
      expect(insight.sentiment).toBe('fatigued');
      expect(insight.keywordsDetected).toContain('failed');
      expect(insight.keywordsDetected).toContain('grind');
      expect(insight.keywordsDetected).toContain('rpe 10');
      expect(insight.recommendation).toContain('rest intervals');
    });

    it('detects kinematic deviation and form breakdown', () => {
      const insight = parseAthleteComment('Slight knee cave and wobbly on ascending phase', mockExercise);
      expect(insight.sentiment).toBe('form_issue');
      expect(insight.keywordsDetected).toContain('knee cave');
      expect(insight.keywordsDetected).toContain('wobbly');
      expect(insight.recommendation).toContain('tempo');
    });

    it('detects time constraints and schedule crunches from skipped notes', () => {
      const insight = parseAthleteComment('[NOT DONE] Skipped: ran out of time before work meeting', mockExercise);
      expect(insight.sentiment).toBe('time_constraint');
      expect(insight.keywordsDetected).toContain('ran out of time');
      expect(insight.recommendation).toContain('time constraints');
    });

    it('detects gym equipment bottlenecks from skipped notes', () => {
      const insight = parseAthleteComment('[NOT DONE] Skipped: squat rack was occupied and gym was packed', mockExercise);
      expect(insight.sentiment).toBe('equipment_unavailable');
      expect(insight.keywordsDetected).toContain('occupied');
      expect(insight.recommendation).toContain('Barbell Box Squat to Parallel');
    });

    it('returns neutral sentiment for general training notes', () => {
      const insight = parseAthleteComment('Focused on breathing into belt', mockExercise);
      expect(insight.sentiment).toBe('neutral');
      expect(insight.keywordsDetected).toHaveLength(0);
    });
  });

  describe('evaluateWeeklyPerformance', () => {
    it('proposes progressive overload when AMRAP target is exceeded comfortably', () => {
      const logs: Record<string, SetLogRecord[]> = {
        t1_bb_squat: [
          { setNumber: 1, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: true, notes: 'Smooth' },
          { setNumber: 2, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: true, notes: 'Fast' },
          { setNumber: 3, targetReps: '3', weightLbs: 185, repsAchieved: 6, isCompleted: true, notes: 'AMRAP crushed (+3 reps)' },
        ],
      };

      const result = evaluateWeeklyPerformance(logs, [WORKOUT_PROGRAM.lower_a], [], 1);
      expect(result.overallStatus).toBe('progressing');
      expect(result.stats.totalSetsCompleted).toBe(3);
      expect(result.stats.totalTonnageLbs).toBe(185 * 3 + 185 * 3 + 185 * 6);

      const squatAdaptation = result.adaptations.find((a) => a.exerciseId === 't1_bb_squat');
      expect(squatAdaptation).toBeDefined();
      expect(squatAdaptation?.action).toBe('increase_weight');
      expect(squatAdaptation?.proposedValue).toBe(195); // 185 + 10 lbs for lower body
      expect(squatAdaptation?.creatorInfluence).toContain('Volume & Auto-Regulation');
    });

    it('proposes regression swap when athlete logs knee tendinitis note', () => {
      const logs: Record<string, SetLogRecord[]> = {
        t1_bb_squat: [
          { setNumber: 1, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: true, notes: 'Felt slight patellar tendon ache' },
        ],
      };

      const result = evaluateWeeklyPerformance(logs, [WORKOUT_PROGRAM.lower_a], [], 1);
      expect(result.overallStatus).toBe('adapting_for_recovery');

      const regressionAdaptation = result.adaptations.find(
        (a) => a.exerciseId === 't1_bb_squat' && a.action === 'activate_regression'
      );
      expect(regressionAdaptation).toBeDefined();
      expect(regressionAdaptation?.proposedLabel).toContain('Barbell Box Squat to Parallel');
      expect(regressionAdaptation?.creatorInfluence).toContain('Tendon Deload & Progression');
    });

    it('proposes rest interval increase when athlete notes fatigue and missed reps', () => {
      const logs: Record<string, SetLogRecord[]> = {
        t1_bb_squat: [
          { setNumber: 1, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: true, notes: '' },
          { setNumber: 2, targetReps: '3', weightLbs: 185, repsAchieved: 2, isCompleted: false, notes: 'Failed rep 3, exhausted' },
        ],
      };

      const result = evaluateWeeklyPerformance(logs, [WORKOUT_PROGRAM.lower_a], [], 1);
      const restAdaptation = result.adaptations.find(
        (a) => a.exerciseId === 't1_bb_squat' && a.action === 'increase_rest'
      );
      expect(restAdaptation).toBeDefined();
      expect(restAdaptation?.proposedValue).toBe(240); // 180 + 60s
    });

    it('proposes volume auto-regulation when an exercise was marked [NOT DONE] or skipped', () => {
      const logs: Record<string, SetLogRecord[]> = {
        t3_tibialis_wall_raise: [
          { setNumber: 1, targetReps: '15', weightLbs: 0, repsAchieved: 0, isCompleted: false, notes: '[NOT DONE] Skipped due to time constraints' },
        ],
      };

      const result = evaluateWeeklyPerformance(logs, [WORKOUT_PROGRAM.lower_a], [], 1);
      const volumeAdaptation = result.adaptations.find(
        (a) => a.exerciseId === 't3_tibialis_wall_raise' && a.action === 'adjust_volume'
      );
      expect(volumeAdaptation).toBeDefined();
      expect(volumeAdaptation?.parameter).toBe('targetSets');
      expect(volumeAdaptation?.proposedValue).toBe(2); // Reduced from 3 to 2 sets
      expect(volumeAdaptation?.proposedLabel).toContain('Auto-regulate to 2 sets');
      expect(volumeAdaptation?.creatorInfluence).toContain('Auto-Regulation');
    });

    it('cross-references ankle mobility restrictions and proposes pause tempo', () => {
      const logs: Record<string, SetLogRecord[]> = {};
      const mobility: MobilityEntry[] = [
        { testId: 'knee-to-wall', value: 3.2, unit: 'inches', date: new Date().toISOString() },
      ];

      const result = evaluateWeeklyPerformance(logs, [WORKOUT_PROGRAM.lower_a], mobility, 1);
      const ankleAdaptation = result.adaptations.find((a) => a.id === 'adapt_mobility_ankle_dorsiflexion');
      expect(ankleAdaptation).toBeDefined();
      expect(ankleAdaptation?.proposedLabel).toContain('31X1');
      expect(ankleAdaptation?.creatorInfluence).toContain('Joint Mobility & Rooting');
    });

    it('advances kettlebell movements strictly to the next Bowflex 840 notch (e.g. 20 -> 25 lbs)', () => {
      const kbExercise: WorkoutExercise = {
        id: 't3_horse_stance',
        name: 'Range of Strength Horse Stance Pulses',
        tier: 'T3',
        targetSets: 3,
        targetReps: '10',
        isAmrapLastSet: false,
        tempo: '2020',
        restSeconds: 90,
        equipment: 'kettlebell',
        defaultWeightLbs: 20,
        muscleGroups: ['Adductors', 'Hips'],
        biomechanicalRationale: 'Groin & hip strengthener.',
        progressionRule: 'Advance to next Bowflex 840 setting.',
      };

      const customSession = {
        ...WORKOUT_PROGRAM.lower_a,
        exercises: [kbExercise],
      };

      const logs: Record<string, SetLogRecord[]> = {
        t3_horse_stance: [
          { setNumber: 1, targetReps: '10', weightLbs: 20, repsAchieved: 10, isCompleted: true, notes: 'Flew up, felt super light and easy' },
          { setNumber: 2, targetReps: '10', weightLbs: 20, repsAchieved: 10, isCompleted: true, notes: '' },
          { setNumber: 3, targetReps: '10', weightLbs: 20, repsAchieved: 10, isCompleted: true, notes: '' },
        ],
      };

      const result = evaluateWeeklyPerformance(logs, [customSession], [], 1);
      const kbAdaptation = result.adaptations.find((a) => a.exerciseId === 't3_horse_stance' && a.action === 'increase_weight');
      expect(kbAdaptation).toBeDefined();
      expect(kbAdaptation?.proposedValue).toBe(25);
      expect(kbAdaptation?.proposedLabel).toContain('20 → 25 lbs · Bowflex 840');
    });
  });
});
