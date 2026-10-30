/**
 * tests/storage/adversarial_m3_challenger2.test.tsx
 *
 * Adversarial Stress Test Suite for Milestone 3:
 * - LocalStorage Persistence & Schema Fuzzing (src/storage/storageManager.ts)
 * - Mobility Assessment Input Boundaries & Math (src/domain/mobility.ts)
 * - Zero-Dependency SVG Sparkline Chart Geometric Invariants (src/components/SparklineChart.tsx)
 * - JSON Export & Import Round-Trip Fidelity & Fuzzing
 *
 * Authored by: Empirical Challenger 2 (critic/specialist)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  StorageManager,
  DEFAULT_STORAGE_DATA,
} from '../../src/storage/storageManager';
import {
  MobilityEntry,
  MobilityTestId,
  validateMobilityEntry,
  calculateMobilityProgress,
  getMobilityBenchmarkStatus,
  generateSparklinePoints,
  PROTOCOL_KNEE_TO_WALL,
  PROTOCOL_SPLIT_SQUAT_ELEVATION,
  PROTOCOL_DEAD_HANG,
} from '../../src/domain/mobility';
import { SparklineChart } from '../../src/components/SparklineChart';

describe('Adversarial Stress Suite — Milestone 3 (Challenger 2)', () => {
  // =========================================================================
  // SECTION 1: LOCALSTORAGE CORRUPTION & SCHEMA FUZZING
  // =========================================================================
  describe('1. LocalStorage Corruption & Schema Fuzzing', () => {
    let manager: StorageManager;
    const TEST_KEY = 'adversarial_storage_fuzz_key';

    beforeEach(() => {
      localStorage.clear();
      vi.useFakeTimers();
      manager = new StorageManager(TEST_KEY);
    });

    afterEach(() => {
      manager.flush();
      localStorage.clear();
      vi.useRealTimers();
    });

    it('recovers cleanly from truncated, malformed, and non-JSON string payloads', () => {
      const corruptPayloads = [
        '{"bad json": true,',
        '{unquoted_key: 123}',
        'undefined',
        'null',
        '',
        '   ',
        '<<<XML NOT JSON>>>',
        '{"version": 1, "activeSessionId": ',
        '[1, 2, 3, {"incomplete":',
        '{"escaped": "\\"bad\\',
      ];

      corruptPayloads.forEach((payload, index) => {
        const key = `${TEST_KEY}_corrupt_${index}`;
        localStorage.setItem(key, payload);

        const testManager = new StorageManager(key);
        const data = testManager.load();

        expect(data).toBeDefined();
        expect(data.version).toBe(1);
        expect(data.activeSessionId).toBe('lower_a');
        expect(Array.isArray(data.mobilityHistory)).toBe(true);
        expect(typeof data.currentLogs).toBe('object');
        expect(typeof data.completedWorkouts).toBe('object');
        expect(data.settings.soundEnabled).toBe(true);
      });
    });

    it('survives JSON root primitives (numbers, booleans, arrays, strings) and falls back to defaults', () => {
      const primitives = [
        12345,
        true,
        false,
        'just a plain string',
        ['an', 'array', 'of', 'strings'],
        null,
      ];

      primitives.forEach((val, index) => {
        const key = `${TEST_KEY}_prim_${index}`;
        localStorage.setItem(key, JSON.stringify(val));

        const testManager = new StorageManager(key);
        const data = testManager.load();

        expect(data.version).toBe(1);
        expect(data.activeSessionId).toBe(DEFAULT_STORAGE_DATA.activeSessionId);
        expect(data.mobilityHistory).toEqual([]);
        expect(data.settings.preferredUnit).toBe('lbs');
      });
    });

    it('sanitizes objects with outdated, missing, or rogue version numbers', () => {
      const versionFuzz = [
        { version: 0 },
        { version: 2 },
        { version: 9999 },
        { version: -1 },
        { version: '1' },
        { version: null },
        { version: undefined },
        { version: NaN },
      ];

      versionFuzz.forEach((obj, idx) => {
        const key = `${TEST_KEY}_ver_${idx}`;
        localStorage.setItem(key, JSON.stringify(obj));

        const testManager = new StorageManager(key);
        const data = testManager.load();

        expect(data.version).toBe(1);
        expect(data.activeSessionId).toBe('lower_a');
      });
    });

    it('filters out corrupted, malformed, and invalid entries in mobilityHistory', () => {
      const taintedHistory = [
        null,
        undefined,
        42,
        'not an object',
        {},
        { testId: 'fake-test', value: 10, date: '2026-10-01' }, // invalid testId
        { testId: 'knee-to-wall', value: -5, date: '2026-10-01' }, // negative value
        { testId: 'elephant-walk', value: 6, date: '2026-10-01' }, // > 5 level
        { testId: 'elephant-walk', value: 2.5, date: '2026-10-01' }, // non-integer level
        { testId: 'dead-hang', value: NaN, date: '2026-10-01' }, // NaN
        { testId: 'biering-sorensen', value: 100, date: '' }, // empty date string
        // VALID ENTRY:
        { id: 'valid_1', testId: 'knee-to-wall', value: 4.5, date: '2026-10-13T08:00:00Z' },
      ];

      const key = `${TEST_KEY}_tainted_history`;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          activeSessionId: 'upper_a',
          mobilityHistory: taintedHistory,
        })
      );

      const testManager = new StorageManager(key);
      const data = testManager.load();

      expect(data.mobilityHistory).toHaveLength(1);
      expect(data.mobilityHistory[0].id).toBe('valid_1');
      expect(data.mobilityHistory[0].value).toBe(4.5);
    });

    it('sanitizes rogue settings payloads (invalid types, unknown units, NaN presets)', () => {
      const key = `${TEST_KEY}_bad_settings`;
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          settings: {
            soundEnabled: 'yes', // should be boolean
            defaultTimerPreset: 'infinity', // should be number
            preferredUnit: 'stone', // should be 'lbs' or 'kg'
          },
        })
      );

      const testManager = new StorageManager(key);
      const data = testManager.load();

      expect(data.settings.soundEnabled).toBe(true); // defaulted
      expect(data.settings.defaultTimerPreset).toBe(90); // defaulted
      expect(data.settings.preferredUnit).toBe('lbs'); // defaulted from unrecognized 'stone'
    });

    it('handles cross-tab storage sync events with corrupt or null payloads safely', () => {
      const listenerSpy = vi.fn();
      manager.subscribe(listenerSpy);

      // Fire storage event with corrupted JSON payload
      const corruptEvent = new StorageEvent('storage', {
        key: TEST_KEY,
        newValue: '{{{bad json',
      });
      window.dispatchEvent(corruptEvent);

      // Listener should not crash and should not be invoked with garbage
      expect(listenerSpy).not.toHaveBeenCalled();

      // Fire valid cross-tab event
      const validEvent = new StorageEvent('storage', {
        key: TEST_KEY,
        newValue: JSON.stringify({
          version: 1,
          activeSessionId: 'lower_b',
          currentLogs: {},
          completedWorkouts: {},
          mobilityHistory: [],
          settings: DEFAULT_STORAGE_DATA.settings,
        }),
      });
      window.dispatchEvent(validEvent);

      expect(listenerSpy).toHaveBeenCalledTimes(1);
      expect(manager.load().activeSessionId).toBe('lower_b');
    });

    it('handles QuotaExceededError during writeToLocalStorage and marks quotaExceeded flag', () => {
      const origSetItem = localStorage.setItem;
      let callCount = 0;

      // Mock QuotaExceededError
      localStorage.setItem = vi.fn().mockImplementation(() => {
        callCount++;
        const err = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        Object.defineProperty(err, 'code', { value: 22 });
        throw err;
      });

      expect(manager.isQuotaExceeded()).toBe(false);

      // Attempt saveImmediate
      manager.saveImmediate({ activeSessionId: 'upper_b' });

      expect(callCount).toBeGreaterThanOrEqual(1);
      expect(manager.isQuotaExceeded()).toBe(true);
      // In-memory cache should still reflect the requested update
      expect(manager.load().activeSessionId).toBe('upper_b');

      localStorage.setItem = origSetItem;
    });
  });

  // =========================================================================
  // SECTION 2: MOBILITY INPUT BOUNDARY & PROTOCOL FUZZING
  // =========================================================================
  describe('2. Mobility Input Boundary & Protocol Fuzzing', () => {
    describe('validateMobilityEntry Boundary Matrix', () => {
      const allTestIds: MobilityTestId[] = [
        'elephant-walk',
        'knee-to-wall',
        'split-squat-elevation',
        'biering-sorensen',
        'dead-hang',
      ];

      it('rejects negative values for every single protocol', () => {
        const negatives = [-0.001, -0.1, -1, -45, -999];
        allTestIds.forEach((testId) => {
          negatives.forEach((val) => {
            const res = validateMobilityEntry({ testId, value: val });
            expect(res.isValid, `${testId} accepted negative value ${val}`).toBe(false);
            expect(res.error).toMatch(/negative/i);
          });
        });
      });

      it('rejects non-numeric values, NaN, and Infinities across all protocols', () => {
        allTestIds.forEach((testId) => {
          [NaN, Infinity, -Infinity].forEach((val) => {
            const res = validateMobilityEntry({ testId, value: val });
            expect(res.isValid, `${testId} accepted non-finite value ${val}`).toBe(false);
            expect(res.error).toMatch(/valid.*number|finite/i);
          });
          // @ts-expect-error test string value
          expect(validateMobilityEntry({ testId, value: 'five' }).isValid).toBe(false);
          // @ts-expect-error test null value
          expect(validateMobilityEntry({ testId, value: null }).isValid).toBe(false);
          // @ts-expect-error test undefined value
          expect(validateMobilityEntry({ testId, value: undefined }).isValid).toBe(false);
        });
      });

      it('strictly enforces integer range [1, 5] for Elephant Walk (hamstring reach)', () => {
        // Valid exact integer levels
        [1, 2, 3, 4, 5].forEach((lvl) => {
          const res = validateMobilityEntry({ testId: 'elephant-walk', value: lvl });
          expect(res.isValid, `Elephant walk rejected valid level ${lvl}`).toBe(true);
        });

        // Invalid non-integer or out-of-range positive levels
        [0, 6, 10, 1.5, 2.99, 4.001, 0.5].forEach((badLvl) => {
          const res = validateMobilityEntry({ testId: 'elephant-walk', value: badLvl });
          expect(res.isValid, `Elephant walk accepted invalid level ${badLvl}`).toBe(false);
          expect(res.error).toMatch(/integer between 1 and 5/i);
        });

        // Negative values are rejected by negative check
        [-1, -5].forEach((negLvl) => {
          const res = validateMobilityEntry({ testId: 'elephant-walk', value: negLvl });
          expect(res.isValid, `Elephant walk accepted negative level ${negLvl}`).toBe(false);
          expect(res.error).toMatch(/(integer between 1 and 5|negative)/i);
        });
      });

      it('accepts zero (0) for Knee-to-Wall, Split Squat, Sorensen, and Dead Hang', () => {
        const zeroAllowed: MobilityTestId[] = [
          'knee-to-wall',
          'split-squat-elevation',
          'biering-sorensen',
          'dead-hang',
        ];

        zeroAllowed.forEach((testId) => {
          const res = validateMobilityEntry({ testId, value: 0 });
          expect(res.isValid, `${testId} rejected valid boundary 0`).toBe(true);
        });
      });

      it('accepts fine fractional decimal measurements for Knee-to-Wall and Split Squat', () => {
        const decimals = [0.25, 0.5, 1.125, 3.75, 4.5, 5.25, 18.0];
        decimals.forEach((val) => {
          expect(validateMobilityEntry({ testId: 'knee-to-wall', value: val }).isValid).toBe(true);
          expect(
            validateMobilityEntry({ testId: 'split-squat-elevation', value: val }).isValid
          ).toBe(true);
        });
      });

      it('accepts extreme positive values (e.g. 600s Sorensen, 300s Dead Hang, 24" Split Squat)', () => {
        expect(validateMobilityEntry({ testId: 'biering-sorensen', value: 600 }).isValid).toBe(true);
        expect(validateMobilityEntry({ testId: 'dead-hang', value: 300 }).isValid).toBe(true);
        expect(validateMobilityEntry({ testId: 'split-squat-elevation', value: 24 }).isValid).toBe(true);
        expect(validateMobilityEntry({ testId: 'knee-to-wall', value: 15 }).isValid).toBe(true);
      });

      it('rejects empty date string', () => {
        expect(
          validateMobilityEntry({ testId: 'dead-hang', value: 45, date: '' }).isValid
        ).toBe(false);
      });
    });

    describe('calculateMobilityProgress & Analytics Stress', () => {
      it('correctly handles zero-change identical values across consecutive tests', () => {
        const history: MobilityEntry[] = [
          { testId: 'knee-to-wall', date: '2026-10-01T08:00:00Z', value: 4.0 },
          { testId: 'knee-to-wall', date: '2026-10-08T08:00:00Z', value: 4.0 },
          { testId: 'knee-to-wall', date: '2026-10-15T08:00:00Z', value: 4.0 },
        ];

        const res = calculateMobilityProgress(history, 'knee-to-wall');
        expect(res.baseline).toBe(4.0);
        expect(res.latest).toBe(4.0);
        expect(res.delta).toBe(0);
        expect(res.status).toBe('unchanged');
        expect(res.isTargetMet).toBe(false); // 5.0 is target
      });

      it('accurately tracks Split Squat Elevation from severe 18" regression to 0" mastery', () => {
        const history: MobilityEntry[] = [
          { testId: 'split-squat-elevation', date: '2026-09-01T08:00:00Z', value: 18.0 },
          { testId: 'split-squat-elevation', date: '2026-09-15T08:00:00Z', value: 12.0 },
          { testId: 'split-squat-elevation', date: '2026-10-01T08:00:00Z', value: 6.0 },
          { testId: 'split-squat-elevation', date: '2026-10-10T08:00:00Z', value: 2.0 },
          { testId: 'split-squat-elevation', date: '2026-10-20T08:00:00Z', value: 0.0 },
        ];

        const res = calculateMobilityProgress(history, 'split-squat-elevation');
        expect(res.baseline).toBe(18.0);
        expect(res.latest).toBe(0.0);
        expect(res.delta).toBe(-18.0);
        expect(res.status).toBe('improved');
        expect(res.isTargetMet).toBe(true);
      });

      it('detects acute regression / decline in split squat elevation (higher elevation required)', () => {
        const history: MobilityEntry[] = [
          { testId: 'split-squat-elevation', date: '2026-10-01T08:00:00Z', value: 2.0 },
          { testId: 'split-squat-elevation', date: '2026-10-15T08:00:00Z', value: 6.0 },
        ];

        const res = calculateMobilityProgress(history, 'split-squat-elevation');
        expect(res.delta).toBe(4.0);
        expect(res.status).toBe('declined');
        expect(res.isTargetMet).toBe(false);
      });
    });

    describe('getMobilityBenchmarkStatus Threshold Transitions', () => {
      it('evaluates exact float boundary steps for Knee-to-Wall', () => {
        expect(getMobilityBenchmarkStatus('knee-to-wall', 0).status).toBe('severe_restriction');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 1.999).status).toBe('severe_restriction');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 2.0).status).toBe('moderate_restriction');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 3.999).status).toBe('moderate_restriction');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 4.0).status).toBe('functional');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 4.999).status).toBe('functional');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 5.0).status).toBe('optimal');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 5.0).isTargetMet).toBe(true);
      });

      it('evaluates exact boundaries for Biering-Sorensen (60s, 120s)', () => {
        expect(getMobilityBenchmarkStatus('biering-sorensen', 0).status).toBe('suboptimal');
        expect(getMobilityBenchmarkStatus('biering-sorensen', 59).status).toBe('suboptimal');
        expect(getMobilityBenchmarkStatus('biering-sorensen', 60).status).toBe('adequate');
        expect(getMobilityBenchmarkStatus('biering-sorensen', 119).status).toBe('adequate');
        expect(getMobilityBenchmarkStatus('biering-sorensen', 120).status).toBe('optimal');
        expect(getMobilityBenchmarkStatus('biering-sorensen', 120).isTargetMet).toBe(true);
      });

      it('evaluates exact boundaries for Dead Hang (30s, 60s)', () => {
        expect(getMobilityBenchmarkStatus('dead-hang', 0).status).toBe('restricted');
        expect(getMobilityBenchmarkStatus('dead-hang', 29.9).status).toBe('restricted');
        expect(getMobilityBenchmarkStatus('dead-hang', 30.0).status).toBe('baseline');
        expect(getMobilityBenchmarkStatus('dead-hang', 59.9).status).toBe('baseline');
        expect(getMobilityBenchmarkStatus('dead-hang', 60.0).status).toBe('optimal');
        expect(getMobilityBenchmarkStatus('dead-hang', 60.0).isTargetMet).toBe(true);
      });
    });
  });

  // =========================================================================
  // SECTION 3: SPARKLINE CHART GEOMETRIC INVARIANTS & COORDINATE MATH
  // =========================================================================
  describe('3. Sparkline Chart Geometric Invariants & SVG Coordinate Math', () => {
    it('renders clean placeholder state without SVG when history is 0 points', () => {
      const { container } = render(
        <SparklineChart entries={[]} protocol={PROTOCOL_KNEE_TO_WALL} />
      );

      expect(screen.getByText(/No assessment history logged yet/i)).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeNull();
      expect(generateSparklinePoints([], 300, 100)).toBe('');
    });

    it('renders single-entry indicator line and centered marker without NaN for 1 point', () => {
      const singleEntry: MobilityEntry[] = [
        { id: 'mob_1', testId: 'knee-to-wall', date: '2026-10-13T08:00:00Z', value: 4.5 },
      ];

      const { container } = render(
        <SparklineChart entries={singleEntry} protocol={PROTOCOL_KNEE_TO_WALL} width={340} height={120} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();

      // Check circles
      const circle = container.querySelector('circle');
      expect(circle).toBeInTheDocument();
      const cx = parseFloat(circle?.getAttribute('cx') || '');
      const cy = parseFloat(circle?.getAttribute('cy') || '');
      expect(Number.isNaN(cx)).toBe(false);
      expect(Number.isNaN(cy)).toBe(false);
      expect(cx).toBe(170); // (width - padLeft - padRight) / 2 + padLeft = (340 - 32)/2 + 16 = 170

      // In single entry mode, polyline should NOT exist, but indicator line should
      expect(container.querySelector('polyline')).toBeNull();
      const dashedLine = container.querySelector('line[stroke-dasharray="2 2"]');
      expect(dashedLine).toBeInTheDocument();
      expect(dashedLine?.getAttribute('y1')).not.toContain('NaN');
      expect(dashedLine?.getAttribute('y2')).not.toContain('NaN');
    });

    it('maintains strict mathematical invariants over 100 pseudo-random data points', () => {
      const entries: MobilityEntry[] = [];
      const baseDate = new Date('2026-01-01T00:00:00Z').getTime();

      for (let i = 0; i < 100; i++) {
        entries.push({
          id: `entry_${i}`,
          testId: 'dead-hang',
          date: new Date(baseDate + i * 86400000).toISOString(),
          value: 30 + Math.sin(i / 5) * 20 + (i * 0.4), // 10 to 90s
        });
      }

      const width = 400;
      const height = 150;
      const { container } = render(
        <SparklineChart entries={entries} protocol={PROTOCOL_DEAD_HANG} width={width} height={height} />
      );

      const polyline = container.querySelector('polyline');
      expect(polyline).toBeInTheDocument();
      const pointsAttr = polyline?.getAttribute('points') || '';
      expect(pointsAttr).not.toContain('NaN');
      expect(pointsAttr).not.toContain('undefined');
      expect(pointsAttr).not.toContain('Infinity');

      const coordinatePairs = pointsAttr.trim().split(' ');
      expect(coordinatePairs).toHaveLength(100);

      let prevX = -1;
      coordinatePairs.forEach((pair, idx) => {
        const [xStr, yStr] = pair.split(',');
        const x = parseFloat(xStr);
        const y = parseFloat(yStr);

        // INVARIANT 1: Finite Numbers
        expect(Number.isNaN(x), `Point ${idx} X is NaN`).toBe(false);
        expect(Number.isNaN(y), `Point ${idx} Y is NaN`).toBe(false);

        // INVARIANT 2: Monotonic increasing X
        expect(x).toBeGreaterThan(prevX);
        prevX = x;

        // INVARIANT 3: Y bounded within padding [padTop=16, height - padBottom=128]
        expect(y).toBeGreaterThanOrEqual(15);
        expect(y).toBeLessThanOrEqual(height);
      });
    });

    it('survives flatline when all entries and benchmark have identical zero or positive values', () => {
      // 5 entries all with value 0
      const zeroEntries: MobilityEntry[] = Array.from({ length: 5 }, (_, i) => ({
        id: `z_${i}`,
        testId: 'split-squat-elevation',
        date: `2026-10-0${i + 1}T08:00:00Z`,
        value: 0,
      }));

      const { container } = render(
        <SparklineChart
          entries={zeroEntries}
          protocol={PROTOCOL_SPLIT_SQUAT_ELEVATION}
          width={340}
          height={120}
        />
      );

      const polyline = container.querySelector('polyline');
      expect(polyline).toBeInTheDocument();
      const points = polyline?.getAttribute('points') || '';

      expect(points).not.toContain('NaN');
      expect(points).not.toContain('Infinity');

      // Check area path does not contain NaN
      const path = container.querySelector('path[fill^="url(#sparkline-gradient"]');
      expect(path).toBeInTheDocument();
      expect(path?.getAttribute('d')).not.toContain('NaN');
    });

    it('strictly preserves polarity inversion in SVG coordinates for lower-is-better (Split Squat Elevation)', () => {
      // For split-squat-elevation:
      // High elevation (12") is bad/regressed -> should be LOWER visually -> HIGHER SVG Y coordinate
      // Low elevation (0") is optimal mastery -> should be HIGHER visually -> LOWER SVG Y coordinate
      const entries: MobilityEntry[] = [
        { id: '1', testId: 'split-squat-elevation', date: '2026-10-01T08:00:00Z', value: 12.0 },
        { id: '2', testId: 'split-squat-elevation', date: '2026-10-15T08:00:00Z', value: 0.0 },
      ];

      const { container } = render(
        <SparklineChart
          entries={entries}
          protocol={PROTOCOL_SPLIT_SQUAT_ELEVATION}
          width={340}
          height={120}
        />
      );

      const polyline = container.querySelector('polyline');
      const pointsStr = polyline?.getAttribute('points') || '';
      const [pt1, pt2] = pointsStr.split(' ');
      const y1 = parseFloat(pt1.split(',')[1]); // for value 12.0
      const y2 = parseFloat(pt2.split(',')[1]); // for value 0.0

      // INVARIANT: Y for 0.0 MUST be strictly less than Y for 12.0 (higher on screen)
      expect(y2).toBeLessThan(y1);
    });

    it('strictly preserves standard polarity in SVG coordinates for higher-is-better (Knee-to-Wall)', () => {
      // For knee-to-wall:
      // Low distance (2.0") is restricted -> LOWER visually -> HIGHER SVG Y coordinate
      // High distance (5.0") is optimal -> HIGHER visually -> LOWER SVG Y coordinate
      const entries: MobilityEntry[] = [
        { id: '1', testId: 'knee-to-wall', date: '2026-10-01T08:00:00Z', value: 2.0 },
        { id: '2', testId: 'knee-to-wall', date: '2026-10-15T08:00:00Z', value: 5.0 },
      ];

      const { container } = render(
        <SparklineChart
          entries={entries}
          protocol={PROTOCOL_KNEE_TO_WALL}
          width={340}
          height={120}
        />
      );

      const polyline = container.querySelector('polyline');
      const pointsStr = polyline?.getAttribute('points') || '';
      const [pt1, pt2] = pointsStr.split(' ');
      const y1 = parseFloat(pt1.split(',')[1]); // for value 2.0
      const y2 = parseFloat(pt2.split(',')[1]); // for value 5.0

      // INVARIANT: Y for 5.0 MUST be strictly less than Y for 2.0 (higher on screen)
      expect(y2).toBeLessThan(y1);
    });

    it('renders accessible interactive point markers with tooltips without error', () => {
      const entries: MobilityEntry[] = [
        {
          id: 'point_a',
          testId: 'knee-to-wall',
          date: '2026-10-01T08:00:00Z',
          value: 4.5,
          side: 'left',
          notes: 'No knee pinching',
        },
      ];

      const { container } = render(
        <SparklineChart entries={entries} protocol={PROTOCOL_KNEE_TO_WALL} />
      );

      const circle = container.querySelector('circle');
      expect(circle).toBeInTheDocument();
      expect(circle?.getAttribute('role')).toBe('button');
      expect(circle?.getAttribute('aria-label')).toContain('4.5');

      // Trigger hover
      fireEvent.mouseEnter(circle!);
      expect(screen.getByText(/No knee pinching/i)).toBeInTheDocument();

      // Trigger leave
      fireEvent.mouseLeave(circle!);
      expect(screen.queryByText(/No knee pinching/i)).toBeNull();
    });
  });

  // =========================================================================
  // SECTION 4: JSON BACKUP & STATE MIGRATION ROUND-TRIP FUZZING
  // =========================================================================
  describe('4. JSON Backup & State Migration Round-Trip Fuzzing', () => {
    let sourceManager: StorageManager;
    let targetManager: StorageManager;

    beforeEach(() => {
      localStorage.clear();
      sourceManager = new StorageManager('export_source_key');
      targetManager = new StorageManager('import_target_key');
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('preserves 100% of state fidelity through export and import round-trip', () => {
      // 1. Populate rich source state
      sourceManager.saveImmediate({
        activeSessionId: 'lower_b',
        currentLogs: {
          t1_bb_rdl: {
            completed: true,
            weight: 275,
            reps: 5,
            notes: 'Felt strong, zero lumbar flexion',
          },
          t2_kb_good_morning: {
            completed: true,
            weight: 40,
            reps: 10,
            notes: 'Max KB load used',
          },
        },
        completedWorkouts: {
          session_101: {
            date: '2026-10-12T10:00:00.000Z',
            sessionId: 'lower_a',
            logs: {
              t1_bb_squat: {
                completed: true,
                weight: 225,
                reps: 3,
                notes: 'Box squat regression with tripod rooting',
              },
            },
            totalDurationSeconds: 2840,
            rating: 5,
          },
        },
        settings: {
          soundEnabled: false,
          defaultTimerPreset: 180,
          preferredUnit: 'kg',
        },
      });

      // Add mobility entries across 5 protocols
      sourceManager.addMobilityEntry({
        testId: 'elephant-walk',
        value: 4,
        date: '2026-10-10T08:00:00.000Z',
        notes: 'Knuckles touching',
      });
      sourceManager.addMobilityEntry({
        testId: 'knee-to-wall',
        value: 4.75,
        date: '2026-10-11T08:00:00.000Z',
        side: 'left',
      });
      sourceManager.addMobilityEntry({
        testId: 'split-squat-elevation',
        value: 2.0,
        date: '2026-10-12T08:00:00.000Z',
      });
      sourceManager.addMobilityEntry({
        testId: 'biering-sorensen',
        value: 135,
        date: '2026-10-13T08:00:00.000Z',
      });
      sourceManager.addMobilityEntry({
        testId: 'dead-hang',
        value: 70,
        date: '2026-10-13T08:30:00.000Z',
      });

      // 2. Export JSON
      const exportedJson = sourceManager.exportJSON();
      expect(typeof exportedJson).toBe('string');
      expect(exportedJson.length).toBeGreaterThan(200);

      // Verify valid parse
      const parsedExport = JSON.parse(exportedJson);
      expect(parsedExport.activeSessionId).toBe('lower_b');

      // 3. Import JSON into clean target
      const result = targetManager.importJSON(exportedJson);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const importedData = targetManager.load();

      // 4. Assert round-trip fidelity
      expect(importedData.version).toBe(1);
      expect(importedData.activeSessionId).toBe('lower_b');
      expect(importedData.settings.soundEnabled).toBe(false);
      expect(importedData.settings.defaultTimerPreset).toBe(180);
      expect(importedData.settings.preferredUnit).toBe('kg');

      // Check current logs
      expect(importedData.currentLogs['t1_bb_rdl']).toEqual({
        completed: true,
        weight: 275,
        reps: 5,
        notes: 'Felt strong, zero lumbar flexion',
      });
      expect(importedData.currentLogs['t2_kb_good_morning']).toEqual({
        completed: true,
        weight: 40,
        reps: 10,
        notes: 'Max KB load used',
      });

      // Check completed workouts
      expect(importedData.completedWorkouts['session_101'].sessionId).toBe('lower_a');
      expect(importedData.completedWorkouts['session_101'].totalDurationSeconds).toBe(2840);

      // Check mobility history
      expect(importedData.mobilityHistory).toHaveLength(5);
      const testIds = importedData.mobilityHistory.map((e) => e.testId);
      expect(testIds).toContain('elephant-walk');
      expect(testIds).toContain('knee-to-wall');
      expect(testIds).toContain('split-squat-elevation');
      expect(testIds).toContain('biering-sorensen');
      expect(testIds).toContain('dead-hang');
    });

    it('rejects corrupt syntax, non-objects, and primitives without altering state', () => {
      // Set known initial state
      targetManager.saveImmediate({ activeSessionId: 'upper_a' });

      const invalidImports = [
        '{bad json syntax',
        'null',
        '12345',
        '"just a string"',
        'true',
        '',
        'undefined',
      ];

      invalidImports.forEach((badJson) => {
        const res = targetManager.importJSON(badJson);
        expect(res.success).toBe(false);
        expect(res.error).toBeDefined();
        // Target state must remain unaltered
        expect(targetManager.load().activeSessionId).toBe('upper_a');
      });
    });

    it('sanitizes and purges corrupt mobility items during import', () => {
      const taintedImport = JSON.stringify({
        version: 1,
        activeSessionId: 'upper_b',
        mobilityHistory: [
          { testId: 'fake-protocol', value: 100 }, // bad testId -> purge
          { testId: 'elephant-walk', value: 99 }, // bad level -> purge
          { id: 'good_mob', testId: 'dead-hang', value: 65, date: '2026-10-13T09:00:00Z' }, // valid
        ],
      });

      const res = targetManager.importJSON(taintedImport);
      expect(res.success).toBe(true);

      const data = targetManager.load();
      expect(data.activeSessionId).toBe('upper_b');
      expect(data.mobilityHistory).toHaveLength(1);
      expect(data.mobilityHistory[0].id).toBe('good_mob');
      expect(data.mobilityHistory[0].value).toBe(65);
    });
  });
});
