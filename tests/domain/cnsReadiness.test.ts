import { describe, it, expect, beforeEach } from 'vitest';
import {
  baselineOf,
  deleteCnsCheck,
  evaluateCns,
  loadCnsChecks,
  median,
  saveCnsCheck,
  type CnsCheck,
} from '../../src/domain/cnsReadiness';
import { increaseGate, gateReason } from '../../src/domain/trainingReadiness';
import type { HealthDay } from '../../src/domain/healthMetrics';

const check = (date: string, taps: number, reactionMs: number, extra: Partial<CnsCheck> = {}): CnsCheck => ({
  id: `cns_${date}`, date, timestamp: 0, taps, reactionMs, drive: 3, focus: 3, stress: 3, score: 90, tier: 'ready', ...extra,
});
// steady baseline: ~60 taps, ~250 ms
const HISTORY = [
  check('2026-11-01', 60, 250), check('2026-11-02', 61, 248), check('2026-11-03', 59, 252),
  check('2026-11-04', 60, 251), check('2026-11-05', 62, 249),
];
const TODAY = '2026-11-09';
const neutral = { drive: 3, focus: 3, stress: 3 };

describe('cnsReadiness', () => {
  beforeEach(() => localStorage.clear());

  it('takes the median of reaction trials', () => {
    expect(median([300, 210, 250, 900, 240])).toBe(250);
    expect(median([200, 300])).toBe(250);
    expect(median([])).toBeNull();
  });

  it('needs 3 earlier checks for a baseline and ignores today', () => {
    expect(baselineOf(HISTORY.slice(0, 2), TODAY, (c) => c.taps)).toBeNull();
    const b = baselineOf([...HISTORY, check(TODAY, 10, 900)], TODAY, (c) => c.taps)!;
    expect(b.n).toBe(5);
    expect(Math.round(b.mean)).toBe(60);
  });

  it('is Ready when tests match baseline and ratings are fine', () => {
    const ev = evaluateCns({ taps: 61, reactionMs: 250, ...neutral }, HISTORY, [], TODAY);
    expect(ev.tier).toBe('ready');
    expect(ev.score).toBe(100);
  });

  it('flags a clear drop in tap speed and slower reactions as Low', () => {
    const ev = evaluateCns({ taps: 50, reactionMs: 300, ...neutral }, HISTORY, [], TODAY);
    expect(ev.metrics.find((m) => m.key === 'taps')!.flag).toBe('poor');
    expect(ev.metrics.find((m) => m.key === 'reaction')!.flag).toBe('poor');
    expect(ev.tier).toBe('low');
  });

  it('does not flag a change within normal noise', () => {
    const ev = evaluateCns({ taps: 58, reactionMs: 256, ...neutral }, HISTORY, [], TODAY);
    expect(ev.metrics.find((m) => m.key === 'taps')!.flag).toBe('ok');
    expect(ev.metrics.find((m) => m.key === 'reaction')!.flag).toBe('ok');
  });

  it('does not score tap/reaction without a baseline, but self-ratings still count', () => {
    const ev = evaluateCns({ taps: 30, reactionMs: 500, drive: 1, focus: 1, stress: 5 }, [], [], TODAY);
    expect(ev.metrics.find((m) => m.key === 'taps')!.comparison).toBeNull();
    expect(ev.baselineChecks).toBe(0);
    expect(ev.tier).toBe('low');
  });

  it('uses Health Connect HRV and resting HR', () => {
    const days: HealthDay[] = [
      { date: '2026-11-02', hrvMs: 60, restingHr: 55 }, { date: '2026-11-03', hrvMs: 62, restingHr: 54 },
      { date: '2026-11-04', hrvMs: 58, restingHr: 56 }, { date: '2026-11-05', hrvMs: 61, restingHr: 55 },
      { date: TODAY, hrvMs: 40, restingHr: 64 },
    ];
    const ev = evaluateCns({ taps: 61, reactionMs: 250, ...neutral }, HISTORY, days, TODAY);
    expect(ev.metrics.find((m) => m.key === 'hrv')!.flag).toBe('poor');
    expect(ev.metrics.find((m) => m.key === 'rhr')!.flag).toBe('poor');
    expect(ev.tier).toBe('low');
  });

  it('saves one check per day and deletes it', () => {
    saveCnsCheck(check(TODAY, 60, 250));
    saveCnsCheck(check(TODAY, 55, 260));
    expect(loadCnsChecks()).toHaveLength(1);
    expect(loadCnsChecks()[0].taps).toBe(55);
    deleteCnsCheck(TODAY);
    expect(loadCnsChecks()).toHaveLength(0);
  });

  it('holds weight increases when today’s CNS check is Moderate or Low', () => {
    const now = new Date('2026-11-09T08:00:00');
    expect(increaseGate(now, [], [], [], [{ date: TODAY, tier: 'ready' }]).hold).toBe(false);
    const gate = increaseGate(now, [], [], [], [{ date: TODAY, tier: 'low' }]);
    expect(gate.hold).toBe(true);
    expect(gateReason(gate)).toMatch(/CNS check is Low/);
    expect(increaseGate(now, [], [], [], [{ date: '2026-11-08', tier: 'low' }]).hold).toBe(false);
  });
});
