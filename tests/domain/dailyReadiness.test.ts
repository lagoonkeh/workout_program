// tests/domain/dailyReadiness.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateReadinessIndex,
  analyzeDailyReadiness,
} from '../../src/domain/dailyReadiness';
import { WORKOUT_PROGRAM } from '../../src/domain/programData';

describe('dailyReadiness Domain', () => {
  it('calculates readiness score and tier correctly for pain-free high energy state', () => {
    const { score, tier } = calculateReadinessIndex(0, 1, 9, 8);
    expect(score).toBeGreaterThanOrEqual(90);
    expect(tier).toBe('peak');
  });

  it('calculates readiness score and tier correctly for elevated knee pain and low energy', () => {
    const { score, tier } = calculateReadinessIndex(6, 6, 3, 4);
    expect(score).toBeLessThan(60);
    expect(['cautious', 'rest_recovery']).toContain(tier);
  });

  it('triggers box squat regression and 4s eccentric tempo when knee pain >= 3 is reported', () => {
    const lowerASession = WORKOUT_PROGRAM.lower_a;
    const analysis = analyzeDailyReadiness(
      {
        date: '2026-10-17',
        kneePainScore: 4,
        hamstringTightness: 2,
        energyScore: 7,
        sleepScore: 7,
        sorenessTags: ['Knees Sore'],
        journalNotes: 'Left patellar tendon feels tender going down stairs this morning.',
      },
      lowerASession
    );

    expect(analysis.readinessScore).toBeLessThan(85);
    expect(analysis.biomechanicalFindings.some((f) => f.includes('Patellar tendon discomfort'))).toBe(true);

    const squatAdaptation = analysis.recommendedAdaptations.find(
      (a) => a.action === 'activate_regression' && a.exerciseId === 't1_bb_squat'
    );
    expect(squatAdaptation).toBeDefined();
    expect(squatAdaptation?.proposedValue).toBe('Barbell Box Squat to Parallel');

    const tempoAdaptation = analysis.recommendedAdaptations.find(
      (a) => a.action === 'adjust_tempo' && a.exerciseId === 't1_bb_squat'
    );
    expect(tempoAdaptation).toBeDefined();
    expect(tempoAdaptation?.proposedValue).toBe('3210');
  });

  it('triggers tempo adjustment when hamstring tightness >= 5 is reported on Lower B', () => {
    const lowerBSession = WORKOUT_PROGRAM.lower_b;
    const analysis = analyzeDailyReadiness(
      {
        date: '2026-10-17',
        kneePainScore: 0,
        hamstringTightness: 6,
        energyScore: 7,
        sleepScore: 8,
        sorenessTags: ['Tight Hamstrings'],
        journalNotes: 'Hamstrings feel quite stiff on forward bends.',
      },
      lowerBSession
    );

    expect(analysis.biomechanicalFindings.some((f) => f.includes('Posterior chain tightness'))).toBe(true);
    const rdlAdaptation = analysis.recommendedAdaptations.find(
      (a) => a.exerciseId === 't1_bb_rdl'
    );
    expect(rdlAdaptation).toBeDefined();
    expect(rdlAdaptation?.proposedValue).toBe('3111');
  });

  it('triggers autoregulation load reduction when systemic energy <= 4 is reported', () => {
    const lowerASession = WORKOUT_PROGRAM.lower_a;
    const analysis = analyzeDailyReadiness(
      {
        date: '2026-10-17',
        kneePainScore: 1,
        hamstringTightness: 2,
        energyScore: 3,
        sleepScore: 4,
        sorenessTags: [],
        journalNotes: 'Feeling very drained and exhausted from poor sleep.',
      },
      lowerASession
    );

    expect(analysis.biomechanicalFindings.some((f) => f.includes('Low systemic energy'))).toBe(true);
    const loadAdaptation = analysis.recommendedAdaptations.find(
      (a) => a.action === 'decrease_weight'
    );
    expect(loadAdaptation).toBeDefined();
    expect(Number(loadAdaptation?.proposedValue)).toBeLessThan(185);
  });
});
