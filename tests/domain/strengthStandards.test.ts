// tests/domain/strengthStandards.test.ts
import { describe, it, expect } from 'vitest';
import {
  ATHLETE_GROUPS,
  PERCENTILE_ANCHORS,
  percentileThresholds,
  ordinal,
  MUSCLE_LIFT_WEIGHTS,
  MUSCLES,
  SOURCES,
  buildStrengthProfile,
  colorForScore,
  computeLiftResults,
  cooperBenchPercentile,
  epley1RM,
  liftPercentile,
  tierFromScore,
  NO_DATA_COLOR,
  type LiftId,
} from '../../src/domain/strengthStandards';
import { DEFAULT_BASELINE_ASSESSMENT, type QuarterlyAssessmentRecord } from '../../src/domain/fitnessAssessment';
import type { CompletedWorkoutSession } from '../../src/storage/storageManager';

const NOW = new Date('2026-10-30T12:00:00Z');

describe('domain/strengthStandards', () => {
  describe('epley1RM', () => {
    it('returns the weight for a single and applies w × (1 + r/30) otherwise', () => {
      expect(epley1RM(300, 1)).toBe(300);
      expect(epley1RM(225, 5)).toBeCloseTo(262.5, 5);
      expect(epley1RM(0, 5)).toBe(0);
      expect(epley1RM(100, 0)).toBe(0);
    });
  });

  describe('liftPercentile', () => {
    it('hits the Strength Level anchors exactly (5/20/50/80/95th)', () => {
      (['squat', 'deadlift', 'bench', 'ohp', 'pullups'] as LiftId[]).forEach((lift) => {
        const t = percentileThresholds(lift);
        PERCENTILE_ANCHORS.forEach((pct, i) => expect(liftPercentile(lift, t[i])).toBe(pct));
        expect(liftPercentile(lift, t[4] * 1.15)).toBe(99);
        expect(liftPercentile(lift, t[4] * 3)).toBe(99);
        expect(liftPercentile(lift, 0)).toBe(1);
      });
    });

    it('uses the 170 lb Strength Level row scaled to bodyweight', () => {
      expect(percentileThresholds('bench')[2]).toBeCloseTo(208 / 170, 6);
      expect(percentileThresholds('pullups')).toEqual([0.5, 7, 13, 21, 29]);
    });

    it('interpolates between anchors and is monotonic', () => {
      // 255 lb squat at 168 lb sits between Novice (213 @170) and Intermediate (282 @170)
      const sq = liftPercentile('squat', 255 / 168);
      expect(sq).toBeGreaterThan(20);
      expect(sq).toBeLessThan(50);
      let last = 0;
      for (let r = 0.1; r < 3.5; r += 0.05) {
        const p = liftPercentile('deadlift', r);
        expect(p).toBeGreaterThanOrEqual(last);
        last = p;
      }
    });

    it('maps percentiles to Strength Level levels', () => {
      expect(tierFromScore(4)).toBe('Beginner');
      expect(tierFromScore(20)).toBe('Novice');
      expect(tierFromScore(49)).toBe('Novice');
      expect(tierFromScore(50)).toBe('Intermediate');
      expect(tierFromScore(80)).toBe('Advanced');
      expect(tierFromScore(95)).toBe('Elite');
    });

    it('formats ordinals', () => {
      expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 43, 99].map(ordinal)).toEqual([
        '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '43rd', '99th',
      ]);
    });
  });

  describe('cooperBenchPercentile', () => {
    it('reads the 30–39 band for a 35-year-old', () => {
      expect(cooperBenchPercentile(0.98, 35)).toBe(60);
      expect(cooperBenchPercentile(1.12, 35)).toBe(80);
      expect(cooperBenchPercentile(195 / 168, 35)).toBe(83);
    });
    it('clamps to the 5th and 95th percentile', () => {
      expect(cooperBenchPercentile(0.3, 35)).toBe(5);
      expect(cooperBenchPercentile(2.5, 35)).toBe(95);
    });
    it('uses a younger, stronger band for a 25-year-old', () => {
      expect(cooperBenchPercentile(1.12, 25)).toBeLessThan(cooperBenchPercentile(1.12, 35));
    });
  });

  describe('computeLiftResults', () => {
    it('uses tested 1RMs and bodyweight from the assessment', () => {
      const r = computeLiftResults(DEFAULT_BASELINE_ASSESSMENT, [], NOW);
      expect(r.bodyweightLbs).toBe(168);
      expect(r.lifts.squat?.best).toBe(255);
      expect(r.lifts.squat?.value).toBeCloseTo(255 / 168, 5);
      expect(r.lifts.squat?.origin).toBe('tested');
      expect(r.lifts.pullups?.value).toBe(12);
    });

    it('replaces a tested 1RM with a higher Epley estimate from a recent logged set', () => {
      const session: CompletedWorkoutSession = {
        sessionId: 'lower_a',
        date: '2026-10-28T18:00:00Z',
        logs: {
          t1_bb_squat: [
            { setNumber: 1, targetReps: '5', weightLbs: 245, repsAchieved: 5, isCompleted: true, notes: '' },
            { setNumber: 2, targetReps: '5', weightLbs: 500, repsAchieved: 5, isCompleted: false, notes: '' },
          ],
        },
      };
      const r = computeLiftResults(DEFAULT_BASELINE_ASSESSMENT, [session], NOW);
      expect(r.lifts.squat?.best).toBe(Math.round(245 * (1 + 5 / 30)));
      expect(r.lifts.squat?.origin).toBe('estimated');
      expect(r.lifts.squat?.originDetail).toMatch(/245 × 5/);
    });

    it('ignores sets above 10 reps, sets older than 180 days, and RDLs', () => {
      const sessions: CompletedWorkoutSession[] = [
        { sessionId: 'x', date: '2026-10-20T00:00:00Z', logs: { t1_bench_press: { completed: true, weight: 185, reps: 15, notes: '' } } },
        { sessionId: 'x', date: '2025-12-01T00:00:00Z', logs: { t1_ohp: { completed: true, weight: 150, reps: 3, notes: '' } } },
        { sessionId: 'x', date: '2026-10-20T00:00:00Z', logs: { t1_bb_rdl: { completed: true, weight: 405, reps: 5, notes: '' } } },
      ];
      const r = computeLiftResults(null, sessions, NOW);
      expect(r.lifts.bench).toBeUndefined();
      expect(r.lifts.ohp).toBeUndefined();
      expect(r.lifts.deadlift).toBeUndefined();
      expect(r.bodyweightLbs).toBe(168);
    });

    it('reads single-entry logs and strips unilateral suffixes', () => {
      const r = computeLiftResults(null, [
        { sessionId: 'x', date: '2026-10-29T00:00:00Z', logs: { t1_deadlift: { completed: true, weight: 315, reps: 3, notes: '' } } },
      ], NOW);
      expect(r.lifts.deadlift?.best).toBe(347);
    });
  });

  describe('buildStrengthProfile', () => {
    const inputs = computeLiftResults(DEFAULT_BASELINE_ASSESSMENT, [], NOW);

    it('rates every muscle except calves in general mode', () => {
      const p = buildStrengthProfile(inputs, 'general');
      MUSCLES.forEach((m) => {
        if (m.id === 'calves') expect(p.muscles.calves.score).toBeNull();
        else expect(p.muscles[m.id].score).not.toBeNull();
      });
      expect(p.muscles.quads.score).toBe(liftPercentile('squat', 255 / 168));
      expect(p.muscles.quads.tier).toBe('Novice');
      expect(p.overall).not.toBeNull();
    });

    it('blends weighted lifts for multi-lift muscles', () => {
      const p = buildStrengthProfile(inputs, 'general');
      const ohp = liftPercentile('ohp', 125 / 168);
      const bench = liftPercentile('bench', 195 / 168);
      expect(p.muscles.shoulders.score).toBe(Math.round(0.65 * ohp + 0.35 * bench));
    });

    it('expresses lifts as a % of the athlete group mean', () => {
      const p = buildStrengthProfile(inputs, 'basketball');
      expect(p.lifts.squat.score).toBe(Math.round(((255 / 168) / 1.67) * 100));
      expect(p.lifts.bench.score).toBe(Math.round(((195 / 168) / 1.12) * 100));
      expect(p.muscles.quads.score).toBe(p.lifts.squat.score);
      // no published basketball deadlift / OHP / pull-up data
      expect(p.lifts.deadlift.score).toBeNull();
      expect(p.muscles.hamstrings.score).toBeNull();
      expect(p.muscles.biceps.score).toBeNull();
      // glutes fall back to the squat alone, renormalised
      expect(p.muscles.glutes.score).toBe(p.lifts.squat.score);
      expect(p.muscles.glutes.missingLifts).toEqual(['deadlift']);
    });

    it('flags muscles well below the overall average', () => {
      const weakBench: QuarterlyAssessmentRecord = {
        ...DEFAULT_BASELINE_ASSESSMENT,
        scores: { ...DEFAULT_BASELINE_ASSESSMENT.scores, bench1rmLbs: 110 },
      };
      const p = buildStrengthProfile(computeLiftResults(weakBench, [], NOW), 'general');
      expect(p.laggards).toContain('chest');
      expect(p.laggards).not.toContain('quads');
    });

    it('returns no scores when nothing is logged or tested', () => {
      const p = buildStrengthProfile(computeLiftResults(null, [], NOW), 'general');
      expect(p.overall).toBeNull();
      expect(colorForScore(p.muscles.chest.score, 'general')).toBe(NO_DATA_COLOR);
    });
  });

  describe('reference data integrity', () => {
    it('every muscle weight set sums to 1 (or is empty)', () => {
      Object.values(MUSCLE_LIFT_WEIGHTS).forEach((w) => {
        const sum = Object.values(w).reduce((a, b) => a + (b as number), 0);
        if (Object.keys(w).length) expect(sum).toBeCloseTo(1, 5);
      });
    });

    it('every athlete value is plausible and cites a known source', () => {
      ATHLETE_GROUPS.forEach((g) => {
        Object.values(g.lifts).forEach((ref) => {
          expect(ref!.value).toBeGreaterThan(0.8);
          expect(ref!.value).toBeLessThan(3.5);
          expect(SOURCES[ref!.source]).toBeDefined();
        });
      });
    });

    it('derived ratios match the published absolute numbers', () => {
      const get = (id: string, lift: LiftId) => ATHLETE_GROUPS.find((g) => g.id === id)!.lifts[lift]!.value;
      expect(get('basketball', 'squat')).toBeCloseTo(152.2 / 91.3, 2);
      expect(get('basketball', 'bench')).toBeCloseTo(102.7 / 91.3, 2);
      expect(get('football', 'squat')).toBeCloseTo(166.5 / 85.9, 2);
      expect(get('football', 'bench')).toBeCloseTo(156.9 / 112.4, 2);
    });

    it('colour scales map the athlete bands', () => {
      expect(colorForScore(120, 'football')).toBe('#10b981');
      expect(colorForScore(60, 'football')).toBe('#f43f5e');
      expect(colorForScore(85, 'football')).toBe('#06b6d4');
    });
  });
});
