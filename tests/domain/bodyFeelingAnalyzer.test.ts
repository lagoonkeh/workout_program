// tests/domain/bodyFeelingAnalyzer.test.ts
import { describe, it, expect } from 'vitest';
import {
  extractPastTwoWeeksNotes,
  analyzeBodyFeelingAndHistory,
} from '../../src/domain/bodyFeelingAnalyzer';
import { WORKOUT_PROGRAM } from '../../src/domain/programData';
import { CompletedWorkoutSession } from '../../src/storage/storageManager';

describe('bodyFeelingAnalyzer domain', () => {
  const createMockCompletedSession = (
    id: string,
    daysAgo: number,
    sessionTitle: string,
    setLogs: Record<string, any>,
    skippedExercises: any[] = []
  ): CompletedWorkoutSession => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return {
      id,
      sessionId: 'lower_a',
      sessionTitle,
      date: d.toISOString(),
      totalDurationSeconds: 3600,
      totalVolumeLbs: 5000,
      logs: setLogs,
      skippedExercises,
    };
  };

  describe('extractPastTwoWeeksNotes', () => {
    it('returns empty array when history is empty', () => {
      const snippets = extractPastTwoWeeksNotes([]);
      expect(snippets).toEqual([]);
    });

    it('filters out workouts older than 14 days', () => {
      const oldSession = createMockCompletedSession('old_1', 20, 'Lower A', {
        t1_bb_squat: [{ setNumber: 1, notes: 'knee pain here' }],
      });
      const recentSession = createMockCompletedSession('recent_1', 3, 'Lower A', {
        t1_bb_squat: [{ setNumber: 1, notes: 'patella ache' }],
      });

      const snippets = extractPastTwoWeeksNotes([oldSession, recentSession]);
      expect(snippets.length).toBe(1);
      expect(snippets[0].note).toBe('patella ache');
      expect(snippets[0].category).toBe('knee');
    });

    it('categorizes notes across different body regions correctly', () => {
      const session = createMockCompletedSession('recent_2', 2, 'Full Body', {
        t1_squat: [{ setNumber: 1, notes: 'patellar tendon crepitus' }],
        t2_rdl: [{ setNumber: 1, notes: 'tight lower back and lumbar stiffness' }],
        t1_bench: [{ setNumber: 1, notes: 'shoulder pinch during lockout' }],
        t3_curl: [{ setNumber: 1, notes: 'hamstring strain on left side' }],
        t2_lunge: [{ setNumber: 1, notes: 'hip flexor pinch' }],
        t1_ohp: [{ setNumber: 1, notes: 'felt completely exhausted and drained' }],
      });

      const snippets = extractPastTwoWeeksNotes([session]);
      const categories = snippets.map((s) => s.category);
      expect(categories).toContain('knee');
      expect(categories).toContain('lower_back');
      expect(categories).toContain('shoulder');
      expect(categories).toContain('hamstring');
      expect(categories).toContain('hip');
      expect(categories).toContain('cns_energy');
    });

    it('extracts notes from skipped exercises', () => {
      const session = createMockCompletedSession(
        'skipped_1',
        1,
        'Lower B',
        {},
        [
          {
            exerciseId: 't3_jefferson_curl',
            exerciseName: 'Jefferson Curl',
            reason: 'Lower back stiffness and disc discomfort',
          },
        ]
      );

      const snippets = extractPastTwoWeeksNotes([session]);
      expect(snippets.length).toBe(1);
      expect(snippets[0].category).toBe('lower_back');
      expect(snippets[0].exerciseName).toBe('Jefferson Curl');
    });
  });

  describe('analyzeBodyFeelingAndHistory', () => {
    it('diagnoses knee issues from today input and applies box squat regression and 3210 tempo', () => {
      const result = analyzeBodyFeelingAndHistory(
        'My left knee feels tender around the patella when bending',
        ['🦵 Knee Tender'],
        [],
        WORKOUT_PROGRAM.lower_a
      );

      expect(result.diagnosedSymptoms.some((s) => s.category === 'knee')).toBe(true);
      expect(result.injectedWarmups.some((w) => w.id === 'prehab_atg_drag')).toBe(true);
      expect(result.injectedWarmups.some((w) => w.id === 'prehab_patrick_step')).toBe(true);

      const regressionAdaptation = result.adaptations.find((a) => a.parameter === 'regression');
      expect(regressionAdaptation).toBeDefined();
      expect(regressionAdaptation?.proposedValue).toContain('Box Squat');

      const tempoAdaptation = result.adaptations.find((a) => a.parameter === 'tempo');
      expect(tempoAdaptation).toBeDefined();
      expect(tempoAdaptation?.proposedValue).toBe('3210');
    });

    it('diagnoses lower back stiffness and auto-swaps Jefferson Curl to McGill Big 3', () => {
      const result = analyzeBodyFeelingAndHistory(
        'Lower back feels stiff and fatigued today',
        ['🪵 Stiff Lower Back'],
        [],
        WORKOUT_PROGRAM.lower_b
      );

      expect(result.diagnosedSymptoms.some((s) => s.category === 'lower_back')).toBe(true);
      expect(result.injectedWarmups.some((w) => w.id === 'prehab_mcgill_big3')).toBe(true);

      const jeffersonAdaptation = result.adaptations.find(
        (a) => a.exerciseId === 't3_jefferson_curl' && a.parameter === 'regression'
      );
      expect(jeffersonAdaptation).toBeDefined();
      expect(jeffersonAdaptation?.proposedValue).toContain('McGill Big 3');
    });

    it('diagnoses shoulder impingement and swaps pressing movements to neutral grip regression', () => {
      const result = analyzeBodyFeelingAndHistory(
        'Right shoulder has a pinching sensation on overhead movements',
        ['🎯 Shoulder Pinch'],
        [],
        WORKOUT_PROGRAM.upper_a
      );

      expect(result.diagnosedSymptoms.some((s) => s.category === 'shoulder')).toBe(true);
      expect(result.injectedWarmups.some((w) => w.id === 'prehab_indian_clubs')).toBe(true);
      expect(result.injectedWarmups.some((w) => w.id === 'prehab_dead_hang')).toBe(true);

      const pressRegression = result.adaptations.find((a) => a.parameter === 'regression');
      expect(pressRegression).toBeDefined();
    });

    it('detects hamstring tightness and injects Elephant Walks', () => {
      const result = analyzeBodyFeelingAndHistory(
        'Hamstrings feel very tight and restricted',
        ['🤸 Tight Hamstrings'],
        [],
        WORKOUT_PROGRAM.lower_b
      );

      expect(result.diagnosedSymptoms.some((s) => s.category === 'hamstring')).toBe(true);
      expect(result.injectedWarmups.some((w) => w.id === 'prehab_elephant_walks')).toBe(true);
    });

    it('detects hip tightness and injects 90/90 dynamic hip flow', () => {
      const result = analyzeBodyFeelingAndHistory(
        'Hips and adductors feel tight from sitting all day',
        [],
        [],
        WORKOUT_PROGRAM.lower_a
      );

      expect(result.diagnosedSymptoms.some((s) => s.category === 'hip')).toBe(true);
      expect(result.injectedWarmups.some((w) => w.id === 'prehab_90_90_hip_flow')).toBe(true);
    });

    it('detects systemic fatigue and reduces T1 load by 10% for autoregulation', () => {
      const result = analyzeBodyFeelingAndHistory(
        'Got 4 hours of sleep and feel completely drained and exhausted',
        ['😴 Low Sleep & Fatigued'],
        [],
        WORKOUT_PROGRAM.lower_a
      );

      expect(result.diagnosedSymptoms.some((s) => s.category === 'cns_energy')).toBe(true);
      const t1WeightAdaptation = result.adaptations.find(
        (a) => a.parameter === 'weightLbs' && a.action === 'decrease_weight'
      );
      expect(t1WeightAdaptation).toBeDefined();
      expect(Number(t1WeightAdaptation?.proposedValue)).toBeLessThan(
        Number(t1WeightAdaptation?.currentValue)
      );
    });

    it('recognizes peak readiness and provides positive reinforcement', () => {
      const result = analyzeBodyFeelingAndHistory(
        'Felt amazing sleep, rested, full of energy and ready to crush it',
        ['⚡ High Energy & Fresh'],
        [],
        WORKOUT_PROGRAM.lower_a
      );

      expect(result.isPeakReadiness).toBe(true);
      expect(result.diagnosedSymptoms.some((s) => s.label.includes('Peak Neuromuscular Readiness'))).toBe(true);
      expect(result.adaptations.length).toBe(0); // No regressions needed
    });

    it('elevates severity to high when symptoms exist in both history and today input', () => {
      const pastSession = createMockCompletedSession('hist_knee', 4, 'Lower A', {
        t1_bb_squat: [{ setNumber: 1, notes: 'knee ache under patella' }],
      });

      const result = analyzeBodyFeelingAndHistory(
        'Knee hurts again today',
        ['🦵 Knee Tender'],
        [pastSession],
        WORKOUT_PROGRAM.lower_a
      );

      const kneeSymptom = result.diagnosedSymptoms.find((s) => s.category === 'knee');
      expect(kneeSymptom).toBeDefined();
      expect(kneeSymptom?.detectedFrom).toBe('both');
      expect(kneeSymptom?.severity).toBe('high');
      expect(result.pastTwoWeeksFindings.length).toBeGreaterThan(0);
    });
  });
});
