import { describe, it, expect } from 'vitest';
import {
  ALL_MOBILITY_PROTOCOLS,
  RANGE_OF_STRENGTH_FEATS,
  validateMobilityEntry,
  getMobilityBenchmarkStatus,
  calculateMobilityProgress,
  MobilityEntry,
} from '../../src/domain/mobility';
import { calculateMobilityTrajectory } from '../../src/domain/progressForecaster';

describe('Range of Strength (Lucas Hardie) Feats of Range Protocols', () => {
  it('defines 11 comprehensive science-backed mobility protocols in ALL_MOBILITY_PROTOCOLS', () => {
    expect(ALL_MOBILITY_PROTOCOLS).toHaveLength(11);
    const ids = ALL_MOBILITY_PROTOCOLS.map((p) => p.id);
    expect(ids).toContain('german-hang');
    expect(ids).toContain('head-to-toe');
    expect(ids).toContain('side-split');
    expect(ids).toContain('back-bridge');
    expect(ids).toContain('pancake-split');
    expect(ids).toContain('jefferson-curl');
  });

  it('correctly maps Range of Strength feats to Lucas Hardie attribution', () => {
    expect(RANGE_OF_STRENGTH_FEATS.length).toBeGreaterThanOrEqual(6);
    RANGE_OF_STRENGTH_FEATS.forEach((feat) => {
      expect(feat.creator).toContain('Lucas Hardie');
    });
  });

  it('validates entry measurements for the new Feats of Range', () => {
    expect(validateMobilityEntry({ testId: 'german-hang', value: 45, date: '2026-11-07' }).isValid).toBe(true);
    expect(validateMobilityEntry({ testId: 'head-to-toe', value: 1.5, date: '2026-11-07' }).isValid).toBe(true);
    expect(validateMobilityEntry({ testId: 'side-split', value: 3.0, date: '2026-11-07' }).isValid).toBe(true);
    expect(validateMobilityEntry({ testId: 'back-bridge', value: 30, date: '2026-11-07' }).isValid).toBe(true);
    expect(validateMobilityEntry({ testId: 'german-hang', value: -5, date: '2026-11-07' }).isValid).toBe(false);
  });

  it('evaluates benchmark tiers correctly for German Hang', () => {
    expect(getMobilityBenchmarkStatus('german-hang', 5).status).toBe('restricted');
    expect(getMobilityBenchmarkStatus('german-hang', 20).status).toBe('developing');
    expect(getMobilityBenchmarkStatus('german-hang', 45).status).toBe('proficient');
    expect(getMobilityBenchmarkStatus('german-hang', 65).status).toBe('optimal');
    expect(getMobilityBenchmarkStatus('german-hang', 60).isTargetMet).toBe(true);
  });

  it('evaluates benchmark tiers correctly for Head-to-Toe Fold', () => {
    expect(getMobilityBenchmarkStatus('head-to-toe', 8.0).status).toBe('severe_restriction');
    expect(getMobilityBenchmarkStatus('head-to-toe', 4.5).status).toBe('developing');
    expect(getMobilityBenchmarkStatus('head-to-toe', 1.0).status).toBe('proficient');
    expect(getMobilityBenchmarkStatus('head-to-toe', 0).status).toBe('optimal');
    expect(getMobilityBenchmarkStatus('head-to-toe', 0).isTargetMet).toBe(true);
  });

  it('evaluates benchmark tiers correctly for Side Split', () => {
    expect(getMobilityBenchmarkStatus('side-split', 14.0).status).toBe('severe_restriction');
    expect(getMobilityBenchmarkStatus('side-split', 6.0).status).toBe('developing');
    expect(getMobilityBenchmarkStatus('side-split', 2.0).status).toBe('proficient');
    expect(getMobilityBenchmarkStatus('side-split', 0).status).toBe('optimal');
    expect(getMobilityBenchmarkStatus('side-split', 0).isTargetMet).toBe(true);
  });

  it('evaluates benchmark tiers correctly for Back Bridge', () => {
    expect(getMobilityBenchmarkStatus('back-bridge', 8).status).toBe('restricted');
    expect(getMobilityBenchmarkStatus('back-bridge', 20).status).toBe('developing');
    expect(getMobilityBenchmarkStatus('back-bridge', 35).status).toBe('optimal');
    expect(getMobilityBenchmarkStatus('back-bridge', 30).isTargetMet).toBe(true);
  });

  it('calculates historical progress deltas for new Feats of Range', () => {
    const history: MobilityEntry[] = [
      { testId: 'german-hang', value: 20, date: '2026-10-01T00:00:00Z' },
      { testId: 'german-hang', value: 45, date: '2026-11-01T00:00:00Z' },
    ];
    const progress = calculateMobilityProgress(history, 'german-hang');
    expect(progress.status).toBe('improved');
    expect(progress.delta).toBe(25);
    expect(progress.isTargetMet).toBe(true); // target is 30s
  });

  it('projects progressive timelines for the new protocols in progressForecaster', () => {
    const hang = calculateMobilityTrajectory('german-hang', 20);
    expect(hang['1m']).toBeGreaterThan(20);
    expect(hang['1y']).toBeGreaterThanOrEqual(60);

    const headToToe = calculateMobilityTrajectory('head-to-toe', 5.0);
    expect(headToToe['1m']).toBeLessThan(5.0);
    expect(headToToe['1y']).toBe(0);

    const bridge = calculateMobilityTrajectory('back-bridge', 15);
    expect(bridge['1m']).toBeGreaterThan(15);
    expect(bridge['1y']).toBeGreaterThanOrEqual(30);
  });
});
