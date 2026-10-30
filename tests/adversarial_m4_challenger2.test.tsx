/**
 * tests/adversarial_m4_challenger2.test.tsx
 *
 * Tier 5 Hardening & Adversarial Verification Suite (Challenger 2)
 * Milestone 4 Final Milestone: E2E Test Suite & Hardening
 *
 * Dimension 1: Barbell Plate Loading Invariant Verification
 *   - Verifies all 52 achievable weights from 45 to 300 lbs in 5 lb increments
 *   - Proves exact subset-sum match (0 remaining error, isExact = true)
 *   - Independent Oracle comparison proving minimal plate count optimality
 *   - Tests greedy failure traps (165, 170, 175, 180 lbs)
 *
 * Dimension 2: Inverted Polarity Mobility & SVG Stress Verification
 *   - Ben Patrick Split Squat Elevation (lower is better, 0 inches target)
 *   - Verifies Y-coordinate geometry inversion (lower values map to top of SVG)
 *   - Boundary clipping tests (y=0, target benchmark line, label placement, area polygon)
 *   - Extreme dataset stress (identical, oscillating, floating-point, regressed)
 *
 * Dimension 3: Storage Fault Recovery Under Extreme Corruption
 *   - Fuzzes storage with nested corrupt JSON, missing versions, undefined arrays, root primitives
 *   - Full <App /> boot stress test under multi-key localStorage corruption
 *   - Confirms user can switch sessions, log sets, and start new workouts without crashes
 *
 * Authored by: Empirical Challenger 2 (critic/specialist)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';
import {
  calculatePlates,
  DEFAULT_PLATE_INVENTORY,
  PlateCalculationResult,
} from '../src/domain/plateCalculator';
import {
  PROTOCOL_SPLIT_SQUAT_ELEVATION,
  calculateMobilityProgress,
  getMobilityBenchmarkStatus,
  MobilityEntry,
} from '../src/domain/mobility';
import { SparklineChart } from '../src/components/SparklineChart';
import {
  StorageManager,
  storageManager,
  DEFAULT_STORAGE_DATA,
} from '../src/storage/storageManager';

describe('Tier 5 Hardening — Adversarial Stress Suite (Challenger 2)', () => {
  // =========================================================================
  // DIMENSION 1: PLATE LOADING INVARIANT VERIFICATION (45–300 LBS IN 5 LB STEPS)
  // =========================================================================
  describe('Dimension 1: Plate Loading Mathematical Invariants & Optimality', () => {
    // Independent Oracle: Exhaustive powerset solver over available side plates
    const availableSidePlates = [45, 35, 25, 10, 5, 5, 2.5];

    function solveOracleOptimal(targetWeight: number, barWeight = 45): {
      isAchievable: boolean;
      minimalPlateCount: number;
      bestSubset: number[];
    } {
      const desiredSide = (targetWeight - barWeight) / 2;
      if (desiredSide === 0) {
        return { isAchievable: true, minimalPlateCount: 0, bestSubset: [] };
      }
      if (desiredSide < 0) {
        return { isAchievable: false, minimalPlateCount: 0, bestSubset: [] };
      }

      const n = availableSidePlates.length;
      let minCount = Infinity;
      let bestSubset: number[] = [];

      for (let mask = 0; mask < (1 << n); mask++) {
        let sum = 0;
        const subset: number[] = [];
        for (let i = 0; i < n; i++) {
          if (mask & (1 << i)) {
            sum += availableSidePlates[i];
            subset.push(availableSidePlates[i]);
          }
        }
        if (Math.abs(sum - desiredSide) < 1e-6) {
          if (subset.length < minCount) {
            minCount = subset.length;
            bestSubset = subset;
          }
        }
      }

      return {
        isAchievable: minCount !== Infinity,
        minimalPlateCount: minCount === Infinity ? 0 : minCount,
        bestSubset,
      };
    }

    // Generate the exact 52 target weights from 45 to 300 lbs in 5 lb increments
    const targetWeights52: number[] = [];
    for (let w = 45; w <= 300; w += 5) {
      targetWeights52.push(w);
    }

    it('verifies exactly 52 target weights exist from 45 to 300 lbs in 5 lb increments', () => {
      expect(targetWeights52.length).toBe(52);
      expect(targetWeights52[0]).toBe(45);
      expect(targetWeights52[51]).toBe(300);
    });

    it('verifies all 52 weights achieve exact match with 0 remainder and match Oracle minimal plate count', () => {
      targetWeights52.forEach((targetWeight) => {
        const result: PlateCalculationResult = calculatePlates(targetWeight, DEFAULT_PLATE_INVENTORY, 45);
        const oracle = solveOracleOptimal(targetWeight, 45);

        // 1. Exactness invariants
        expect(oracle.isAchievable).toBe(true);
        expect(result.isExact).toBe(true);
        expect(result.achievableWeight).toBe(targetWeight);
        expect(result.remainder).toBe(0);

        // 2. Mathematical sleeve symmetry invariants
        const sideSum = result.platesPerSide.reduce((acc, p) => acc + p, 0);
        expect(result.weightPerSide).toBe(sideSum);
        expect(45 + 2 * sideSum).toBe(targetWeight);
        expect(result.totalPlatesUsed).toBe(result.platesPerSide.length * 2);

        // 3. True minimal plate count optimality (resolves greedy failure)
        expect(result.platesPerSide.length).toBe(oracle.minimalPlateCount);

        // 4. Physical descending loading invariant (heaviest closest to collar)
        for (let i = 0; i < result.platesPerSide.length - 1; i++) {
          expect(result.platesPerSide[i]).toBeGreaterThanOrEqual(result.platesPerSide[i + 1]);
        }

        // 5. Inventory constraint verification
        const counts: Record<number, number> = {};
        for (const p of result.platesPerSide) {
          counts[p] = (counts[p] || 0) + 1;
        }
        expect(counts[45] || 0).toBeLessThanOrEqual(1);
        expect(counts[35] || 0).toBeLessThanOrEqual(1);
        expect(counts[25] || 0).toBeLessThanOrEqual(1);
        expect(counts[10] || 0).toBeLessThanOrEqual(1);
        expect(counts[5] || 0).toBeLessThanOrEqual(2);
        expect(counts[2.5] || 0).toBeLessThanOrEqual(1);
      });
    });

    it('proves non-greedy optimality on classic change-making trap weights (165, 170, 175, 180 lbs)', () => {
      // At 165 lbs: side = 60 lbs.
      // Greedy selection takes 45 + 10 + 5 = 60 lbs (3 plates per side = 6 total).
      // Optimal subset is 35 + 25 = 60 lbs (2 plates per side = 4 total).
      const r165 = calculatePlates(165);
      expect(r165.isExact).toBe(true);
      expect(r165.platesPerSide).toEqual([35, 25]);
      expect(r165.platesPerSide.length).toBe(2);

      // At 170 lbs: side = 62.5 lbs.
      // Greedy with 45 fails or uses 45+10+5+2.5 = 62.5 (4 plates).
      // Optimal is 35 + 25 + 2.5 = 62.5 (3 plates).
      const r170 = calculatePlates(170);
      expect(r170.isExact).toBe(true);
      expect(r170.platesPerSide).toEqual([35, 25, 2.5]);
      expect(r170.platesPerSide.length).toBe(3);

      // At 175 lbs: side = 65 lbs.
      // Greedy takes 45 + 10 + 5 + 5 = 65 (4 plates).
      // Optimal is 35 + 25 + 5 = 65 (3 plates).
      const r175 = calculatePlates(175);
      expect(r175.isExact).toBe(true);
      expect(r175.platesPerSide).toEqual([35, 25, 5]);
      expect(r175.platesPerSide.length).toBe(3);

      // At 180 lbs: side = 67.5 lbs.
      // Greedy takes 45 + 10 + 5 + 5 + 2.5 = 67.5 (5 plates).
      // Optimal is 35 + 25 + 5 + 2.5 = 67.5 (4 plates).
      const r180 = calculatePlates(180);
      expect(r180.isExact).toBe(true);
      expect(r180.platesPerSide).toEqual([35, 25, 5, 2.5]);
      expect(r180.platesPerSide.length).toBe(4);
    });

    it('verifies boundary limits at 45 lbs (empty bar) and 300 lbs (full rack inventory)', () => {
      const emptyBar = calculatePlates(45);
      expect(emptyBar.isExact).toBe(true);
      expect(emptyBar.platesPerSide).toEqual([]);
      expect(emptyBar.achievableWeight).toBe(45);
      expect(emptyBar.totalPlatesUsed).toBe(0);
      expect(emptyBar.message).toBe('Empty bar (45 lbs).');

      const maxLoad = calculatePlates(300);
      expect(maxLoad.isExact).toBe(true);
      expect(maxLoad.platesPerSide).toEqual([45, 35, 25, 10, 5, 5, 2.5]);
      expect(maxLoad.achievableWeight).toBe(300);
      expect(maxLoad.totalPlatesUsed).toBe(14);
      expect(maxLoad.remainder).toBe(0);
    });
  });

  // =========================================================================
  // DIMENSION 2: INVERTED POLARITY MOBILITY & SVG STRESS
  // =========================================================================
  describe('Dimension 2: Inverted Polarity Mobility & SVG Geometric Integrity', () => {
    it('verifies Ben Patrick Split Squat Elevation inverted polarity domain logic', () => {
      expect(PROTOCOL_SPLIT_SQUAT_ELEVATION.improvementDirection).toBe('lower');
      expect(PROTOCOL_SPLIT_SQUAT_ELEVATION.direction).toBe('lower_is_better');
      expect(PROTOCOL_SPLIT_SQUAT_ELEVATION.benchmarkNumeric).toBe(0);

      // Progress calculation: decreasing elevation is IMPROVEMENT
      const improvingHistory: MobilityEntry[] = [
        { testId: 'split-squat-elevation', date: '2026-01-01', value: 12 },
        { testId: 'split-squat-elevation', date: '2026-02-01', value: 6 },
        { testId: 'split-squat-elevation', date: '2026-03-01', value: 2 },
        { testId: 'split-squat-elevation', date: '2026-04-01', value: 0 },
      ];
      const resImproved = calculateMobilityProgress(improvingHistory, 'split-squat-elevation');
      expect(resImproved.status).toBe('improved');
      expect(resImproved.delta).toBe(-12);
      expect(resImproved.isTargetMet).toBe(true);

      // Regressing elevation: increasing elevation is DECLINE
      const regressingHistory: MobilityEntry[] = [
        { testId: 'split-squat-elevation', date: '2026-01-01', value: 2 },
        { testId: 'split-squat-elevation', date: '2026-02-01', value: 8 },
      ];
      const resDeclined = calculateMobilityProgress(regressingHistory, 'split-squat-elevation');
      expect(resDeclined.status).toBe('declined');
      expect(resDeclined.delta).toBe(6);
      expect(resDeclined.isTargetMet).toBe(false);

      // Benchmark classification
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 0).isTargetMet).toBe(true);
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 0).status).toBe('optimal');
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 2).isTargetMet).toBe(false);
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 2).status).toBe('near_mastery');
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 12).status).toBe('regressed');
    });

    it('verifies SVG Sparkline coordinate mapping inverts Y correctly without clipping', () => {
      // In SVG: y=0 is top, y=height is bottom.
      // For split-squat-elevation (lower is better):
      // value=0 (mastery) MUST map to top (smallest Y coordinate).
      // value=18 (bench height) MUST map to bottom (largest Y coordinate).
      const entries: MobilityEntry[] = [
        { id: 'e1', testId: 'split-squat-elevation', date: '2026-01-01', value: 18 },
        { id: 'e2', testId: 'split-squat-elevation', date: '2026-02-01', value: 12 },
        { id: 'e3', testId: 'split-squat-elevation', date: '2026-03-01', value: 6 },
        { id: 'e4', testId: 'split-squat-elevation', date: '2026-04-01', value: 2 },
        { id: 'e5', testId: 'split-squat-elevation', date: '2026-05-01', value: 0 },
      ];

      const { container } = render(
        <SparklineChart
          entries={entries}
          protocol={PROTOCOL_SPLIT_SQUAT_ELEVATION}
          width={340}
          height={120}
        />
      );

      // Extract polyline points
      const polyline = container.querySelector('polyline');
      expect(polyline).not.toBeNull();
      const pointsAttr = polyline!.getAttribute('points')!;
      expect(pointsAttr).toBeTruthy();
      expect(pointsAttr).not.toContain('NaN');

      const coordPairs = pointsAttr.split(' ').map((p) => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });
      expect(coordPairs.length).toBe(5);

      // Verify X coordinates are strictly monotonically increasing across time
      for (let i = 0; i < coordPairs.length - 1; i++) {
        expect(coordPairs[i + 1].x).toBeGreaterThan(coordPairs[i].x);
      }

      // Verify Y coordinates are strictly decreasing (moving up towards y=padTop as value approaches 0)
      for (let i = 0; i < coordPairs.length - 1; i++) {
        expect(coordPairs[i + 1].y).toBeLessThan(coordPairs[i].y);
      }

      // Verify zero clipping: all points within SVG boundaries [0, 340] x [0, 120]
      coordPairs.forEach(({ x, y }) => {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(340);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(120);
      });

      // Verify target benchmark line (y for benchmark 0 must be near padTop = 16)
      const benchmarkGuide = container.querySelector('.benchmark-guide');
      expect(benchmarkGuide).not.toBeNull();
      const line = benchmarkGuide!.querySelector('line');
      const text = benchmarkGuide!.querySelector('text');
      expect(line).not.toBeNull();
      expect(text).not.toBeNull();

      const y1 = Number(line!.getAttribute('y1'));
      expect(y1).toBeCloseTo(16, 0); // near padTop
      const textY = Number(text!.getAttribute('y'));
      // Text label must not clip above 0: when y1 is near top (16), textY is placed below (16+12 = 28)
      expect(textY).toBeGreaterThanOrEqual(10);
      expect(textY).toBeLessThan(120);

      // Verify area gradient path is valid and closed
      const areaPath = container.querySelector('path');
      expect(areaPath).not.toBeNull();
      const dAttr = areaPath!.getAttribute('d')!;
      expect(dAttr).toContain('M ');
      expect(dAttr).toContain(' Z');
      expect(dAttr).not.toContain('NaN');
    });

    it('renders robustly without NaN or clipping under extreme adversarial mobility datasets', () => {
      const stressDatasets: { name: string; entries: MobilityEntry[] }[] = [
        {
          name: 'All identical zeros (flat mastery line)',
          entries: [
            { id: 'z1', testId: 'split-squat-elevation', date: '2026-01-01', value: 0 },
            { id: 'z2', testId: 'split-squat-elevation', date: '2026-01-02', value: 0 },
            { id: 'z3', testId: 'split-squat-elevation', date: '2026-01-03', value: 0 },
          ],
        },
        {
          name: 'Extreme oscillating regression & recovery',
          entries: [
            { id: 'o1', testId: 'split-squat-elevation', date: '2026-01-01', value: 18 },
            { id: 'o2', testId: 'split-squat-elevation', date: '2026-01-02', value: 0 },
            { id: 'o3', testId: 'split-squat-elevation', date: '2026-01-03', value: 18 },
            { id: 'o4', testId: 'split-squat-elevation', date: '2026-01-04', value: 0 },
          ],
        },
        {
          name: 'High-precision micro-fractions (0.125 inch steps)',
          entries: [
            { id: 'm1', testId: 'split-squat-elevation', date: '2026-01-01', value: 2.125 },
            { id: 'm2', testId: 'split-squat-elevation', date: '2026-01-02', value: 1.875 },
            { id: 'm3', testId: 'split-squat-elevation', date: '2026-01-03', value: 0.5 },
            { id: 'm4', testId: 'split-squat-elevation', date: '2026-01-04', value: 0.125 },
          ],
        },
        {
          name: 'Severe acute regression beyond standard tiers (36 inches)',
          entries: [
            { id: 'x1', testId: 'split-squat-elevation', date: '2026-01-01', value: 36 },
            { id: 'x2', testId: 'split-squat-elevation', date: '2026-01-02', value: 24 },
            { id: 'x3', testId: 'split-squat-elevation', date: '2026-01-03', value: 18 },
          ],
        },
      ];

      stressDatasets.forEach(({ entries }) => {
        const { container } = render(
          <SparklineChart
            entries={entries}
            protocol={PROTOCOL_SPLIT_SQUAT_ELEVATION}
            width={340}
            height={120}
          />
        );

        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();

        const polyline = container.querySelector('polyline');
        expect(polyline).not.toBeNull();
        const points = polyline!.getAttribute('points')!;
        expect(points).not.toContain('NaN');
        expect(points).not.toContain('Infinity');

        const circles = container.querySelectorAll('circle');
        expect(circles.length).toBe(entries.length);
        circles.forEach((circle) => {
          const cy = Number(circle.getAttribute('cy'));
          expect(Number.isFinite(cy)).toBe(true);
          expect(cy).toBeGreaterThanOrEqual(0);
          expect(cy).toBeLessThanOrEqual(120);
        });
      });
    });
  });

  // =========================================================================
  // DIMENSION 3: STORAGE FAULT RECOVERY UNDER EXTREME CORRUPTION
  // =========================================================================
  describe('Dimension 3: Storage Fault Recovery Under Extreme Corruption', () => {
    beforeEach(() => {
      localStorage.clear();
      storageManager.clear();
    });

    afterEach(() => {
      localStorage.clear();
      storageManager.clear();
    });

    it('StorageManager defensively sanitizes corrupt payloads and repairs storage', () => {
      const corruptVariants = [
        // Truncated / malformed JSON
        '{ "version": 1, "completedWorkouts": { "lower_a":',
        // Type mismatches (version is string, arrays are objects)
        JSON.stringify({
          version: 'one',
          activeSessionId: 12345,
          completedWorkouts: 'not-an-object',
          currentLogs: null,
          mobilityHistory: 'not-an-array',
          settings: 'corrupt',
        }),
        // Missing versions and undefined values
        JSON.stringify({
          activeSessionId: undefined,
          settings: { soundEnabled: 'yes', defaultTimerPreset: 'fast' },
        }),
        // Array at root
        JSON.stringify([1, 2, 3, { hack: true }]),
        // Non-object primitive values
        'null',
        '"just a string"',
        'true',
        '1234567',
      ];

      corruptVariants.forEach((payload, idx) => {
        const key = `fuzz_storage_key_${idx}`;
        localStorage.setItem(key, payload);

        const sm = new StorageManager(key);
        const data = sm.load();

        // Must recover to fully valid AppStorageData v1
        expect(data).toBeDefined();
        expect(data.version).toBe(1);
        expect(typeof data.activeSessionId).toBe('string');
        expect(typeof data.completedWorkouts).toBe('object');
        expect(typeof data.currentLogs).toBe('object');
        expect(Array.isArray(data.mobilityHistory)).toBe(true);
        expect(typeof data.settings.soundEnabled).toBe('boolean');
        expect(typeof data.settings.defaultTimerPreset).toBe('number');
      });
    });

    it('App cold boots under simultaneous multi-key LocalStorage corruption and allows new session to start', async () => {
      // Corrupt ALL 4 application storage keys simultaneously
      localStorage.setItem('workout_app_state_v1', '{"version": 1, "activeSessionId": {BAD_NESTING: TRUE');
      localStorage.setItem('workout_app_set_logs_v1', '<<<MALFORMED_XML_NOT_JSON>>>');
      localStorage.setItem('workout_app_active_session_v1', 'corrupted_session_does_not_exist_999');
      localStorage.setItem('workout_app_view_mode_v1', 'undefined_phantom_view');

      // Boot App — must not crash or throw uncaught exception
      render(<App />);

      // Verify UI renders fallback default session (Lower A) safely
      expect(
        screen.getAllByText(/Quad & Knee Bulletproofing Focus/i).length
      ).toBeGreaterThanOrEqual(1);

      // Verify Session Navigation is rendered and interactive
      const sessionNav = screen.getByRole('navigation', { name: /Workout Sessions/i });
      expect(sessionNav).toBeInTheDocument();

      // Switch to a new session (Upper A)
      const upperABtn = screen.getByRole('button', { name: /Upper A/i });
      fireEvent.click(upperABtn);

      // Verify Upper A loads smoothly
      expect(
        (await screen.findAllByText(/Horizontal Push\/Pull & Shoulder Health/i)).length
      ).toBeGreaterThanOrEqual(1);

      // Log a set in the newly switched session to prove storage persistence works cleanly
      const weightInputs = screen.getAllByLabelText(/Set 1 Weight/i);
      expect(weightInputs.length).toBeGreaterThan(0);
      fireEvent.change(weightInputs[0], { target: { value: '135' } });

      const set1DoneBtn = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];
      fireEvent.click(set1DoneBtn);

      // Verify button transitioned to incomplete
      expect(screen.getAllByRole('button', { name: /Mark set 1 as incomplete/i })[0]).toBeInTheDocument();

      // Switch back to Lower A — verify state isolation remains stable
      const lowerABtn = screen.getByRole('button', { name: /Lower A/i });
      fireEvent.click(lowerABtn);
      expect(
        (await screen.findAllByText(/Quad & Knee Bulletproofing Focus/i)).length
      ).toBeGreaterThanOrEqual(1);

      // Switch back to Upper A — verify our logged set persisted
      fireEvent.click(upperABtn);
      const reloadedWeights = screen.getAllByLabelText(/Set 1 Weight/i);
      expect((reloadedWeights[0] as HTMLInputElement).value).toBe('135');
    }, 15000);

    it('verifies Mobility Tracker handles corrupted entries inside mobilityHistory without throwing', () => {
      // Craft an array containing malformed / invalid mobility items
      const corruptMobilityList = [
        null,
        undefined,
        {},
        { testId: 'invalid-test', value: 10 },
        { testId: 'split-squat-elevation', value: NaN },
        { testId: 'split-squat-elevation', value: 'ten' },
        { testId: 'split-squat-elevation', value: -5 }, // negative not allowed
        { testId: 'elephant-walk', value: 8 }, // max 5
        // Exactly one valid entry
        { testId: 'split-squat-elevation', value: 2, date: '2026-03-01T00:00:00.000Z' },
      ];

      const sanitized = storageManager.sanitize({
        version: 1,
        activeSessionId: 'lower_a',
        completedWorkouts: {},
        currentLogs: {},
        mobilityHistory: corruptMobilityList,
        settings: DEFAULT_STORAGE_DATA.settings,
      });

      // Sanitizer must filter out invalid items and keep only the single valid one
      expect(sanitized.mobilityHistory.length).toBe(1);
      expect(sanitized.mobilityHistory[0].value).toBe(2);
      expect(sanitized.mobilityHistory[0].testId).toBe('split-squat-elevation');
    });
  });
});
