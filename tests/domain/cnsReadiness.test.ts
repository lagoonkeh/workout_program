import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCnsContext,
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

  describe('sleep, rest and activity', () => {
    const NOW = new Date('2026-11-09T08:00:00');
    const iso = (s: string) => new Date(s).toISOString();
    const nights = (h: number[]): HealthDay[] => h.map((hours, i) => ({ date: `2026-11-0${2 + i}`, sleepHours: hours, steps: 8000 }));

    it('flags short sleep and a big drop against your usual', () => {
      const ctxShort = buildCnsContext(NOW, [...nights([7.5, 7.5, 7.5, 7.5]), { date: TODAY, sleepHours: 4.5 }], [], []);
      const ev = evaluateCns({ taps: null, reactionMs: null, ...neutral }, [], [], TODAY, ctxShort);
      expect(ev.metrics.find((m) => m.key === 'sleep')!.flag).toBe('poor');
      const ctxDrop = buildCnsContext(NOW, [...nights([8.5, 8.5, 8.5]), { date: TODAY, sleepHours: 6.5 }], [], []);
      expect(evaluateCns({ taps: null, reactionMs: null, ...neutral }, [], [], TODAY, ctxDrop).metrics.find((m) => m.key === 'sleep')!.flag).toBe('watch');
    });

    it('lets a hand-entered sleep override Health Connect', () => {
      expect(buildCnsContext(NOW, [{ date: TODAY, sleepHours: 4 }], [], [], 8).sleepHours).toBe(8);
    });

    it('counts rest since the last session and days in a row', () => {
      const lifts = ['2026-11-06T18:00:00', '2026-11-07T18:00:00', '2026-11-08T18:00:00'].map((d) => ({ date: iso(d) }));
      const ctx = buildCnsContext(NOW, [], [], lifts);
      expect(ctx.restHours).toBe(14);
      expect(ctx.daysInARow).toBe(3);
      const rest = evaluateCns({ taps: null, reactionMs: null, ...neutral }, [], [], TODAY, ctx).metrics.find((m) => m.key === 'rest')!;
      expect(rest.flag).toBe('watch');

      const rested = buildCnsContext(NOW, [], [], [{ date: iso('2026-11-07T10:00:00') }]);
      expect(evaluateCns({ taps: null, reactionMs: null, ...neutral }, [], [], TODAY, rested).metrics.find((m) => m.key === 'rest')!.flag).toBe('good');
    });

    it('flags a hard outside workout last night and drops you to Moderate', () => {
      const bjj = { uuid: 'w1', date: '2026-11-08', start: iso('2026-11-08T19:00:00'), end: iso('2026-11-08T20:30:00'), minutes: 90, activity: 'martial_arts', avgHr: 152 };
      const ctx = buildCnsContext(NOW, [], [bjj], []);
      expect(ctx.outside48h[0]).toMatchObject({ minutes: 90, intensity: 'very hard' });
      const ev = evaluateCns({ taps: 61, reactionMs: 250, ...neutral }, HISTORY, [], TODAY, ctx);
      expect(ev.metrics.find((m) => m.key === 'activity')!.flag).toBe('poor');
      expect(ev.metrics.find((m) => m.key === 'rest')!.flag).toBe('watch'); // ~12 h after it ended
      expect(ev.tier).toBe('moderate');
    });

    it('notices an unusually big step day', () => {
      const days: HealthDay[] = [...nights([7, 7, 7, 7]), { date: '2026-11-08', steps: 22000 }];
      const ctx = buildCnsContext(NOW, days, [], []);
      expect(ctx.stepsYesterday).toBe(22000);
      expect(evaluateCns({ taps: null, reactionMs: null, ...neutral }, [], [], TODAY, ctx).metrics.find((m) => m.key === 'activity')!.flag).toBe('watch');
    });
  });
});
