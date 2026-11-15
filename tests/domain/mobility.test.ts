import { describe, it, expect } from 'vitest';
import {
  MOBILITY_PROTOCOLS,
  MobilityTestId,
  MobilityEntry,
  validateMobilityEntry,
  calculateMobilityProgress,
  getMobilityBenchmarkStatus,
  generateSparklinePoints,
  calculateMobilitySummary,
  getAllMobilitySummaries,
} from '../../src/domain/mobility';

describe('Mobility & Flexibility Assessment Domain Module', () => {
  describe('Protocol Definitions Inventory', () => {
    it('defines exactly 7 standardized assessment protocols', () => {
      expect(MOBILITY_PROTOCOLS).toHaveLength(7);
    });

    it('contains all required assessment test IDs', () => {
      const testIds = MOBILITY_PROTOCOLS.map((p) => p.id);
      expect(testIds).toEqual([
        'elephant-walk',
        'knee-to-wall',
        'split-squat-elevation',
        'biering-sorensen',
        'dead-hang',
        'pancake-split',
        'jefferson-curl',
      ]);
    });

    it('specifies valid creator attribution for each assessment', () => {
      MOBILITY_PROTOCOLS.forEach((p) => {
        expect(p.creator).toBeTruthy();
      });
    });

    it('configures direction of improvement correctly for each assessment', () => {
      const directions = Object.fromEntries(
        MOBILITY_PROTOCOLS.map((p) => [p.id, p.improvementDirection])
      );
      // Higher is better for reach, dorsiflexion, spinal endurance, dead hang, and jefferson curl deficit
      expect(directions['elephant-walk']).toBe('higher');
      expect(directions['knee-to-wall']).toBe('higher');
      expect(directions['biering-sorensen']).toBe('higher');
      expect(directions['dead-hang']).toBe('higher');
      expect(directions['jefferson-curl']).toBe('higher');

      // LOWER elevation / distance is better for ATG split squat (0") and pancake split chest-to-floor (0")
      expect(directions['split-squat-elevation']).toBe('lower');
      expect(directions['pancake-split']).toBe('lower');
    });
  });

  describe('Entry Validation Logic (validateMobilityEntry)', () => {
    it('approves a valid Elephant Walk entry (level 1-5)', () => {
      const validEntry: MobilityEntry = {
        id: 'entry-1',
        testId: 'elephant-walk',
        date: '2026-10-13T08:00:00.000Z',
        value: 4,
        notes: 'Knuckles touching floor',
      };
      const result = validateMobilityEntry(validEntry);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects Elephant Walk levels outside 1-5 range', () => {
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: 0 }).isValid).toBe(false);
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: 6 }).isValid).toBe(false);
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: 2.5 }).isValid).toBe(false);
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: -1 }).isValid).toBe(false);
    });

    it('rejects negative values for any test', () => {
      const testIds: MobilityTestId[] = [
        'elephant-walk',
        'knee-to-wall',
        'split-squat-elevation',
        'biering-sorensen',
        'dead-hang',
        'pancake-split',
        'jefferson-curl',
      ];

      testIds.forEach((testId) => {
        const result = validateMobilityEntry({ testId, value: -5 });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/negative/i);
      });
    });

    it('rejects NaN or non-numeric values', () => {
      const result = validateMobilityEntry({ testId: 'knee-to-wall', value: NaN });
      expect(result.isValid).toBe(false);
    });

    it('rejects missing testId or missing date', () => {
      // @ts-expect-error Testing defensive check
      expect(validateMobilityEntry({ value: 5 }).isValid).toBe(false);
      expect(validateMobilityEntry({ testId: 'knee-to-wall', value: 5, date: '' }).isValid).toBe(
        false
      );
    });
  });

  describe('Mobility Progress & Delta Analytics (calculateMobilityProgress)', () => {
    it('handles single entry as baseline with zero delta', () => {
      const history: MobilityEntry[] = [
        {
          id: '1',
          testId: 'biering-sorensen',
          date: '2026-10-01T08:00:00.000Z',
          value: 90,
        },
      ];

      const progress = calculateMobilityProgress(history, 'biering-sorensen');
      expect(progress.baseline).toBe(90);
      expect(progress.latest).toBe(90);
      expect(progress.delta).toBe(0);
      expect(progress.status).toBe('baseline');
    });

    it('correctly calculates positive progress for higher-is-better tests (Knee-to-Wall)', () => {
      const history: MobilityEntry[] = [
        { id: '1', testId: 'knee-to-wall', date: '2026-10-01T08:00:00.000Z', value: 3.5 },
        { id: '2', testId: 'knee-to-wall', date: '2026-10-08T08:00:00.000Z', value: 4.2 },
        { id: '3', testId: 'knee-to-wall', date: '2026-10-15T08:00:00.000Z', value: 5.0 },
      ];

      const progress = calculateMobilityProgress(history, 'knee-to-wall');
      expect(progress.baseline).toBe(3.5);
      expect(progress.latest).toBe(5.0);
      expect(progress.delta).toBeCloseTo(1.5, 2);
      expect(progress.status).toBe('improved');
      expect(progress.isTargetMet).toBe(true); // 5.0" is benchmark
    });

    it('correctly inverts delta for lower-is-better tests (ATG Split Squat Elevation)', () => {
      // User progresses from 6" elevation down to 2" elevation
      const history: MobilityEntry[] = [
        { id: '1', testId: 'split-squat-elevation', date: '2026-10-01T08:00:00.000Z', value: 6.0 },
        { id: '2', testId: 'split-squat-elevation', date: '2026-10-08T08:00:00.000Z', value: 4.0 },
        { id: '3', testId: 'split-squat-elevation', date: '2026-10-15T08:00:00.000Z', value: 2.0 },
      ];

      const progress = calculateMobilityProgress(history, 'split-squat-elevation');
      expect(progress.baseline).toBe(6.0);
      expect(progress.latest).toBe(2.0);
      // Raw mathematical difference is -4.0, but status MUST be 'improved'!
      expect(progress.status).toBe('improved');
      expect(progress.delta).toBe(-4.0);
    });

    it('detects decline when hold time decreases (Biering-Sørensen)', () => {
      const history: MobilityEntry[] = [
        { id: '1', testId: 'biering-sorensen', date: '2026-10-01T08:00:00.000Z', value: 120 },
        { id: '2', testId: 'biering-sorensen', date: '2026-10-08T08:00:00.000Z', value: 90 },
      ];

      const progress = calculateMobilityProgress(history, 'biering-sorensen');
      expect(progress.delta).toBe(-30);
      expect(progress.status).toBe('declined');
    });

    it('stably sorts entries by date even if input array is out of chronological order', () => {
      const history: MobilityEntry[] = [
        { id: '3', testId: 'dead-hang', date: '2026-10-15T08:00:00.000Z', value: 75 },
        { id: '1', testId: 'dead-hang', date: '2026-10-01T08:00:00.000Z', value: 40 },
        { id: '2', testId: 'dead-hang', date: '2026-10-08T08:00:00.000Z', value: 60 },
      ];

      const progress = calculateMobilityProgress(history, 'dead-hang');
      expect(progress.baseline).toBe(40); // 2026-10-01
      expect(progress.latest).toBe(75);   // 2026-10-15
      expect(progress.delta).toBe(35);
      expect(progress.status).toBe('improved');
    });

    it('returns empty progress when history is empty', () => {
      const progress = calculateMobilityProgress([], 'elephant-walk');
      expect(progress.baseline).toBeNull();
      expect(progress.latest).toBeNull();
      expect(progress.delta).toBe(0);
      expect(progress.status).toBe('empty');
    });
  });

  describe('Benchmark Status Classification (getMobilityBenchmarkStatus)', () => {
    it('classifies Knee-to-Wall Dorsiflexion tiers correctly', () => {
      expect(getMobilityBenchmarkStatus('knee-to-wall', 1.5).status).toBe('severe_restriction');
      expect(getMobilityBenchmarkStatus('knee-to-wall', 3.0).status).toBe('moderate_restriction');
      expect(getMobilityBenchmarkStatus('knee-to-wall', 4.5).status).toBe('functional');
      expect(getMobilityBenchmarkStatus('knee-to-wall', 5.2).status).toBe('optimal');
      expect(getMobilityBenchmarkStatus('knee-to-wall', 5.2).isTargetMet).toBe(true);
    });

    it('classifies Biering-Sørensen Hold tiers correctly', () => {
      expect(getMobilityBenchmarkStatus('biering-sorensen', 45).status).toBe('suboptimal');
      expect(getMobilityBenchmarkStatus('biering-sorensen', 90).status).toBe('adequate');
      expect(getMobilityBenchmarkStatus('biering-sorensen', 135).status).toBe('optimal');
      expect(getMobilityBenchmarkStatus('biering-sorensen', 135).isTargetMet).toBe(true);
    });

    it('classifies ATG Split Squat Flat Ground Mastery (0" elevation) as optimal', () => {
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 12).status).toBe('regressed');
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 2).status).toBe('near_mastery');
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 0).status).toBe('optimal');
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 0).isTargetMet).toBe(true);
    });

    it('classifies Pancake Split benchmark tiers correctly', () => {
      expect(getMobilityBenchmarkStatus('pancake-split', 10).status).toBe('severe_restriction');
      expect(getMobilityBenchmarkStatus('pancake-split', 6).status).toBe('moderate_restriction');
      expect(getMobilityBenchmarkStatus('pancake-split', 2).status).toBe('near_mastery');
      expect(getMobilityBenchmarkStatus('pancake-split', 0).status).toBe('optimal');
      expect(getMobilityBenchmarkStatus('pancake-split', 0).isTargetMet).toBe(true);
    });

    it('classifies Loaded Jefferson Curl Deficit tiers correctly', () => {
      expect(getMobilityBenchmarkStatus('jefferson-curl', 0.5).status).toBe('baseline');
      expect(getMobilityBenchmarkStatus('jefferson-curl', 2.0).status).toBe('functional');
      expect(getMobilityBenchmarkStatus('jefferson-curl', 3.5).status).toBe('advanced');
      expect(getMobilityBenchmarkStatus('jefferson-curl', 4.5).status).toBe('optimal');
      expect(getMobilityBenchmarkStatus('jefferson-curl', 4.5).isTargetMet).toBe(true);
    });
  });

  describe('Zero-Dependency SVG Sparkline Generator (generateSparklinePoints)', () => {
    it('generates valid scaled SVG polyline coordinate points for multi-entry history', () => {
      const entries: MobilityEntry[] = [
        { id: '1', testId: 'dead-hang', date: '2026-10-01T08:00:00.000Z', value: 30 },
        { id: '2', testId: 'dead-hang', date: '2026-10-08T08:00:00.000Z', value: 45 },
        { id: '3', testId: 'dead-hang', date: '2026-10-15T08:00:00.000Z', value: 60 },
      ];

      const points = generateSparklinePoints(entries, 100, 40);
      expect(typeof points).toBe('string');
      const pointPairs = points.trim().split(' ');
      expect(pointPairs).toHaveLength(3);

      // Verify format "x,y"
      pointPairs.forEach((pair) => {
        const [x, y] = pair.split(',').map(Number);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(40);
        expect(isNaN(x)).toBe(false);
        expect(isNaN(y)).toBe(false);
      });
    });

    it('handles identical values without division-by-zero (NaN) errors', () => {
      const entries: MobilityEntry[] = [
        { id: '1', testId: 'elephant-walk', date: '2026-10-01T08:00:00.000Z', value: 3 },
        { id: '2', testId: 'elephant-walk', date: '2026-10-08T08:00:00.000Z', value: 3 },
        { id: '3', testId: 'elephant-walk', date: '2026-10-15T08:00:00.000Z', value: 3 },
      ];

      const points = generateSparklinePoints(entries, 100, 40);
      expect(points).not.toContain('NaN');
      expect(points).not.toContain('Infinity');
    });

    it('returns empty string or safe placeholder for empty entries', () => {
      const points = generateSparklinePoints([], 100, 40);
      expect(points).toBe('');
    });
  });

  describe('Mobility Summary Calculators (calculateMobilitySummary & getAllMobilitySummaries)', () => {
    it('returns untested status and null values when history is empty', () => {
      const summary = calculateMobilitySummary('elephant-walk', []);
      expect(summary.testId).toBe('elephant-walk');
      expect(summary.latestValue).toBeNull();
      expect(summary.personalBest).toBeNull();
      expect(summary.status).toBe('untested');
      expect(summary.history).toEqual([]);
    });

    it('calculates optimal status and personal best for higher-is-better protocols', () => {
      const history: MobilityEntry[] = [
        { id: '1', testId: 'knee-to-wall', date: '2026-10-01T08:00:00.000Z', value: 3.5 },
        { id: '2', testId: 'knee-to-wall', date: '2026-10-08T08:00:00.000Z', value: 5.5 },
        { id: '3', testId: 'knee-to-wall', date: '2026-10-15T08:00:00.000Z', value: 5.2 },
      ];

      const summary = calculateMobilitySummary('knee-to-wall', history);
      expect(summary.latestValue).toBe(5.2);
      expect(summary.personalBest).toBe(5.5);
      expect(summary.status).toBe('optimal');
      expect(summary.history).toHaveLength(3);
    });

    it('calculates personal best for lower-is-better protocols (minimum elevation)', () => {
      const history: MobilityEntry[] = [
        { id: '1', testId: 'split-squat-elevation', date: '2026-10-01T08:00:00.000Z', value: 6.0 },
        { id: '2', testId: 'split-squat-elevation', date: '2026-10-08T08:00:00.000Z', value: 2.0 },
        { id: '3', testId: 'split-squat-elevation', date: '2026-10-15T08:00:00.000Z', value: 0.0 },
      ];

      const summary = calculateMobilitySummary('split-squat-elevation', history);
      expect(summary.latestValue).toBe(0.0);
      expect(summary.personalBest).toBe(0.0);
      expect(summary.status).toBe('optimal');
    });

    it('calculates restricted status when latest value is severely restricted', () => {
      const history: MobilityEntry[] = [
        { id: '1', testId: 'dead-hang', date: '2026-10-01T08:00:00.000Z', value: 20 },
      ];

      const summary = calculateMobilitySummary('dead-hang', history);
      expect(summary.latestValue).toBe(20);
      expect(summary.status).toBe('restricted');
    });

    it('returns all 7 mobility summaries via getAllMobilitySummaries', () => {
      const summaries = getAllMobilitySummaries([]);
      expect(summaries).toHaveLength(7);
      const testIds = summaries.map((s) => s.testId);
      expect(testIds).toEqual([
        'elephant-walk',
        'knee-to-wall',
        'split-squat-elevation',
        'biering-sorensen',
        'dead-hang',
        'pancake-split',
        'jefferson-curl',
      ]);
      summaries.forEach((s) => {
        expect(s.status).toBe('untested');
      });
    });
  });
});
