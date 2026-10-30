// tests/domain/fitnessAssessment.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ATHLETE_PROFILE,
  calculateAthleteAge,
  evaluateRow2k,
  formatRowingTime,
  calculateRowingSplit,
  estimateVO2MaxFromCooper,
  evaluateCooperRun,
  evaluateDeadlift,
  evaluateSquat,
  evaluateBenchPress,
  evaluateOverheadPress,
  evaluatePullups,
  evaluatePushups,
  calculateMcGillRatios,
  evaluateDeadHang,
  loadQuarterlyAssessments,
  saveQuarterlyAssessment,
  deleteQuarterlyAssessment,
  STORAGE_KEY_ASSESSMENTS,
  DEFAULT_BASELINE_ASSESSMENT,
  QuarterlyAssessmentRecord,
} from '../../src/domain/fitnessAssessment';

describe('Fitness Assessment Domain Logic (DOB 10/10/1991, 5\'6", 168 lbs)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Athlete Demographic & Age Calculations', () => {
    it('verifies athlete profile constants', () => {
      expect(ATHLETE_PROFILE.dob).toBe('1991-10-10');
      expect(ATHLETE_PROFILE.heightInches).toBe(66);
      expect(ATHLETE_PROFILE.defaultWeightLbs).toBe(168);
      expect(ATHLETE_PROFILE.waistCircumferenceTargetInches).toBe(33);
    });

    it('calculates age correctly for October 2026 (exact 35th birthday)', () => {
      const refDate = new Date('2026-10-21');
      const age = calculateAthleteAge('1991-10-10', refDate);
      expect(age).toBe(35);
    });

    it('handles birthday not yet reached in the calendar year', () => {
      const beforeBday = new Date('2026-05-15');
      const age = calculateAthleteAge('1991-10-10', beforeBday);
      expect(age).toBe(34);
    });
  });

  describe('2. Cardiorespiratory & Rowing Standards', () => {
    it('evaluates 2,000m row time tiers', () => {
      expect(evaluateRow2k(380).tier).toBe('Elite'); // 6:20
      expect(evaluateRow2k(415).tier).toBe('Advanced'); // 6:55
      expect(evaluateRow2k(435).tier).toBe('Intermediate'); // 7:15
      expect(evaluateRow2k(470).tier).toBe('Novice'); // 7:50
      expect(evaluateRow2k(510).tier).toBe('Developing'); // 8:30
    });

    it('formats rowing time and calculates 500m split correctly', () => {
      expect(formatRowingTime(435)).toBe('7:15');
      expect(calculateRowingSplit(440)).toBe('1:50 / 500m');
    });

    it('estimates VO2max and evaluates Cooper 12-minute run', () => {
      const vo2 = estimateVO2MaxFromCooper(1.55);
      expect(vo2).toBeGreaterThan(40);
      expect(evaluateCooperRun(1.80).tier).toBe('Elite');
      expect(evaluateCooperRun(1.70).tier).toBe('Advanced');
      expect(evaluateCooperRun(1.55).tier).toBe('Intermediate');
      expect(evaluateCooperRun(1.35).tier).toBe('Novice');
      expect(evaluateCooperRun(1.10).tier).toBe('Developing');
    });
  });

  describe('3. Compound Strength Standards (At 168 lbs Bodyweight)', () => {
    it('evaluates deadlift relative strength ratios', () => {
      expect(evaluateDeadlift(425, 168).tier).toBe('Elite'); // 2.53x
      expect(evaluateDeadlift(350, 168).tier).toBe('Advanced'); // 2.08x
      expect(evaluateDeadlift(315, 168).tier).toBe('Intermediate'); // 1.88x
      expect(evaluateDeadlift(225, 168).tier).toBe('Novice'); // 1.34x
      expect(evaluateDeadlift(185, 168).tier).toBe('Developing');
    });

    it('evaluates squat relative strength ratios', () => {
      expect(evaluateSquat(340, 168).tier).toBe('Elite'); // 2.02x
      expect(evaluateSquat(280, 168).tier).toBe('Advanced'); // 1.67x
      expect(evaluateSquat(255, 168).tier).toBe('Intermediate'); // 1.52x
      expect(evaluateSquat(185, 168).tier).toBe('Novice'); // 1.10x
      expect(evaluateSquat(135, 168).tier).toBe('Developing');
    });

    it('evaluates bench press relative strength ratios', () => {
      expect(evaluateBenchPress(255, 168).tier).toBe('Elite'); // 1.52x
      expect(evaluateBenchPress(225, 168).tier).toBe('Advanced'); // 1.34x
      expect(evaluateBenchPress(195, 168).tier).toBe('Intermediate'); // 1.16x
      expect(evaluateBenchPress(145, 168).tier).toBe('Novice'); // 0.86x
      expect(evaluateBenchPress(115, 168).tier).toBe('Developing');
    });

    it('evaluates strict overhead press ratios', () => {
      expect(evaluateOverheadPress(170, 168).tier).toBe('Elite'); // 1.01x
      expect(evaluateOverheadPress(145, 168).tier).toBe('Advanced'); // 0.86x
      expect(evaluateOverheadPress(125, 168).tier).toBe('Intermediate'); // 0.74x
      expect(evaluateOverheadPress(95, 168).tier).toBe('Novice'); // 0.57x
      expect(evaluateOverheadPress(75, 168).tier).toBe('Developing');
    });
  });

  describe('4. Calisthenics & Relative Muscular Endurance', () => {
    it('evaluates strict dead-hang pull-ups', () => {
      expect(evaluatePullups(21).tier).toBe('Elite');
      expect(evaluatePullups(16).tier).toBe('Advanced');
      expect(evaluatePullups(12).tier).toBe('Intermediate');
      expect(evaluatePullups(7).tier).toBe('Novice');
      expect(evaluatePullups(3).tier).toBe('Developing');
    });

    it('evaluates push-ups to failure using ACSM 30–39 norms', () => {
      expect(evaluatePushups(45).tier).toBe('Elite'); // Superior
      expect(evaluatePushups(36).tier).toBe('Advanced'); // Excellent
      expect(evaluatePushups(28).tier).toBe('Intermediate'); // Good
      expect(evaluatePushups(18).tier).toBe('Novice'); // Average
      expect(evaluatePushups(8).tier).toBe('Developing');
    });
  });

  describe('5. Dr. Stuart McGill Core Balance & Endurance Ratios', () => {
    it('passes all McGill invariants when holds are balanced and ext >= 160s', () => {
      // Ext: 180s, Flex: 150s (ratio 0.83 < 1.0), Right: 90s, Left: 90s (ratio 0.50 < 0.75, sym 1.0)
      const result = calculateMcGillRatios(180, 150, 90, 90);
      expect(result.flexionToExtensionStatus).toBe('optimal');
      expect(result.sideBridgeToExtensionStatus).toBe('optimal');
      expect(result.sideBridgeSymmetryStatus).toBe('optimal');
      expect(result.isSpineProtected).toBe(true);
      expect(result.clinicalFeedback.length).toBe(0);
    });

    it('flags warning when flexion exceeds extension (flexion/extension >= 1.0)', () => {
      const result = calculateMcGillRatios(140, 160, 75, 75);
      expect(result.flexionToExtensionStatus).toBe('imbalanced');
      expect(result.isSpineProtected).toBe(false);
      expect(result.clinicalFeedback.some((f) => f.includes('exceeds 1.0'))).toBe(true);
    });

    it('flags warning when lateral asymmetry exceeds 5% (right/left outside 0.95-1.05)', () => {
      const result = calculateMcGillRatios(170, 140, 95, 70); // 95/70 = 1.36
      expect(result.sideBridgeSymmetryStatus).toBe('asymmetrical');
      expect(result.isSpineProtected).toBe(false);
      expect(result.clinicalFeedback.some((f) => f.includes('Lateral asymmetry detected'))).toBe(true);
    });

    it('flags warning when Biering-Sørensen is under 160 seconds', () => {
      const result = calculateMcGillRatios(120, 110, 60, 60);
      expect(result.isSpineProtected).toBe(false);
      expect(result.clinicalFeedback.some((f) => f.includes('below Dr. McGill\'s 160s'))).toBe(true);
    });
  });

  describe('6. Longevity Grip & Dead Hang', () => {
    it('evaluates dead hang against Peter Attia 2-minute benchmark', () => {
      expect(evaluateDeadHang(125).tier).toBe('Elite');
      expect(evaluateDeadHang(95).tier).toBe('Advanced');
      expect(evaluateDeadHang(65).tier).toBe('Intermediate');
      expect(evaluateDeadHang(35).tier).toBe('Novice');
      expect(evaluateDeadHang(15).tier).toBe('Developing');
    });
  });

  describe('7. Storage & Persistence', () => {
    it('verifies storage key and returns empty array when no storage exists', () => {
      expect(STORAGE_KEY_ASSESSMENTS).toBe('workout_quarterly_assessments_v1');
      expect(loadQuarterlyAssessments()).toEqual([]);
    });

    it('saves and loads quarterly assessments correctly', () => {
      saveQuarterlyAssessment(DEFAULT_BASELINE_ASSESSMENT);
      const loaded = loadQuarterlyAssessments();
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe(DEFAULT_BASELINE_ASSESSMENT.id);
      expect(loaded[0].quarterLabel).toBe('Q4 2026 (Baseline)');
    });

    it('updates an existing record by id', () => {
      saveQuarterlyAssessment(DEFAULT_BASELINE_ASSESSMENT);
      const updated: QuarterlyAssessmentRecord = {
        ...DEFAULT_BASELINE_ASSESSMENT,
        notes: 'Updated notes with higher deadlift',
        scores: {
          ...DEFAULT_BASELINE_ASSESSMENT.scores,
          deadlift1rmLbs: 335,
        },
      };
      saveQuarterlyAssessment(updated);
      const loaded = loadQuarterlyAssessments();
      expect(loaded.length).toBe(1);
      expect(loaded[0].scores.deadlift1rmLbs).toBe(335);
      expect(loaded[0].notes).toBe('Updated notes with higher deadlift');
    });

    it('deletes an assessment by id', () => {
      saveQuarterlyAssessment(DEFAULT_BASELINE_ASSESSMENT);
      const remaining = deleteQuarterlyAssessment(DEFAULT_BASELINE_ASSESSMENT.id);
      expect(remaining.length).toBe(0);
      expect(loadQuarterlyAssessments().length).toBe(0);
    });
  });
});
