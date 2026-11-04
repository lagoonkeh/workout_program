// tests/domain/progressForecaster.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateStrengthTrajectory,
  calculateMobilityTrajectory,
  generateProgramProjections,
  TIME_HORIZONS,
} from '../../src/domain/progressForecaster';
import { SetLogRecord } from '../../src/components/ExerciseCard';
import { MobilityEntry } from '../../src/domain/mobility';

describe('progressForecaster Domain Engine', () => {
  describe('TIME_HORIZONS', () => {
    it('defines 1m, 3m, 6m, and 1y horizons', () => {
      const ids = TIME_HORIZONS.map((h) => h.id);
      expect(ids).toEqual(['1m', '3m', '6m', '1y']);
      expect(TIME_HORIZONS.find((h) => h.id === '1m')?.weeks).toBe(4);
      expect(TIME_HORIZONS.find((h) => h.id === '3m')?.weeks).toBe(12);
      expect(TIME_HORIZONS.find((h) => h.id === '6m')?.weeks).toBe(26);
      expect(TIME_HORIZONS.find((h) => h.id === '1y')?.weeks).toBe(52);
    });
  });

  describe('calculateStrengthTrajectory', () => {
    it('calculates realistic progressive overload trajectory for lower body compounds', () => {
      const baseline = 185;
      const trajectory = calculateStrengthTrajectory(baseline, 'T1', true, false);

      expect(trajectory['1m']).toBeGreaterThan(baseline);
      expect(trajectory['3m']).toBeGreaterThan(trajectory['1m']);
      expect(trajectory['6m']).toBeGreaterThan(trajectory['3m']);
      expect(trajectory['1y']).toBeGreaterThan(trajectory['6m']);

      // 1-month gain should be ~20 lbs for lower body (4 weeks * 5 lbs/wk)
      expect(trajectory['1m'] - baseline).toBe(20);
    });

    it('calculates conservative upper body progression rate', () => {
      const baseline = 135;
      const trajectory = calculateStrengthTrajectory(baseline, 'T1', false, false);

      expect(trajectory['1m']).toBe(145); // 4 weeks * 2.5 lbs/wk = +10 lbs
      expect(trajectory['3m']).toBeGreaterThan(trajectory['1m']);
      expect(trajectory['1y']).toBeGreaterThan(trajectory['6m']);
    });

    it('applies joint-sparing conservative rate when tendinitis warning is active', () => {
      const baseline = 185;
      const standard = calculateStrengthTrajectory(baseline, 'T1', true, false);
      const jointSafe = calculateStrengthTrajectory(baseline, 'T1', true, true);

      expect(jointSafe['1m']).toBeLessThan(standard['1m']);
      expect(jointSafe['1y']).toBeLessThan(standard['1y']);
      expect(jointSafe['1m']).toBeGreaterThan(baseline);
    });
  });

  describe('calculateMobilityTrajectory', () => {
    it('models knee-to-wall ankle dorsiflexion progressing toward 5.0" benchmark', () => {
      const baseline = 3.2;
      const trajectory = calculateMobilityTrajectory('knee-to-wall', baseline);

      expect(trajectory['1m']).toBeGreaterThan(baseline);
      expect(trajectory['3m']).toBeGreaterThan(trajectory['1m']);
      expect(trajectory['6m']).toBeGreaterThan(trajectory['3m']);
      expect(trajectory['1y']).toBeGreaterThanOrEqual(5.0);
    });

    it('models elephant walk progression toward level 5 (palms flat)', () => {
      const baseline = 2.0; // Mid-shin
      const trajectory = calculateMobilityTrajectory('elephant-walk', baseline);

      expect(trajectory['1m']).toBeGreaterThanOrEqual(baseline);
      expect(trajectory['6m']).toBeGreaterThan(trajectory['1m']);
      expect(trajectory['1y']).toBe(5.0);
    });

    it('models split squat elevation decreasing toward flat ground (0")', () => {
      const baseline = 6.0; // 6 inch front-foot elevation
      const trajectory = calculateMobilityTrajectory('split-squat-elevation', baseline);

      expect(trajectory['1m']).toBeLessThan(baseline);
      expect(trajectory['3m']).toBeLessThan(trajectory['1m']);
      expect(trajectory['1y']).toBe(0);
    });

    it('models isometric endurance for back extensor and dead hang', () => {
      const sorenson = calculateMobilityTrajectory('biering-sorensen', 60);
      expect(sorenson['1m']).toBe(78);
      expect(sorenson['1y']).toBeGreaterThanOrEqual(180);

      const deadHang = calculateMobilityTrajectory('dead-hang', 30);
      expect(deadHang['1m']).toBe(42);
      expect(deadHang['1y']).toBeGreaterThanOrEqual(110);
    });
  });

  describe('generateProgramProjections', () => {
    it('synthesizes lifts and mobility projections across the full program', () => {
      const logs: Record<string, SetLogRecord[]> = {
        t1_bb_squat: [
          { setNumber: 1, targetReps: '3', weightLbs: 205, repsAchieved: 3, isCompleted: true, notes: '' },
        ],
      };
      const mobility: MobilityEntry[] = [
        { testId: 'knee-to-wall', value: 3.5, unit: 'inches', date: new Date().toISOString() },
      ];

      const report = generateProgramProjections(logs, undefined, mobility, '3m');

      expect(report.activeHorizon).toBe('3m');
      expect(report.lifts.length).toBeGreaterThanOrEqual(4);
      expect(report.mobility.length).toBeGreaterThanOrEqual(5);

      const squat = report.lifts.find((l) => l.exerciseId === 't1_bb_squat');
      expect(squat).toBeDefined();
      expect(squat?.currentWeightLbs).toBe(205); // uses highest completed weight from logs
      expect(squat?.projectedWeightLbs['3m']).toBeGreaterThan(205);

      const kneeToWall = report.mobility.find((m) => m.testId === 'knee-to-wall');
      expect(kneeToWall).toBeDefined();
      expect(kneeToWall?.currentValue).toBe(3.5);
      expect(kneeToWall?.projectedValues['1y']).toBeGreaterThanOrEqual(5.0);
    });

    it('leverages completedWorkouts history over months of training when active session logs are empty', () => {
      const emptyActiveLogs: Record<string, SetLogRecord[]> = {};
      const completedHistory = [
        {
          logs: {
            t1_bb_squat: [
              { isCompleted: true, weightLbs: 235, repsAchieved: 3, notes: 'Month 2 PR' },
            ],
          },
        },
      ];

      const report = generateProgramProjections(emptyActiveLogs, undefined, [], '3m', {}, completedHistory);
      const squat = report.lifts.find((l) => l.exerciseId === 't1_bb_squat');
      expect(squat).toBeDefined();
      expect(squat?.currentWeightLbs).toBe(235);
      expect(squat?.projectedWeightLbs['3m']).toBeGreaterThan(235);
    });
  });
});
