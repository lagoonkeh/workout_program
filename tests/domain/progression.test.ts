import { describe, it, expect } from 'vitest';
import {
  findLastPerformance,
  suggestNextLoad,
  repRange,
  readSetTags,
  resizeSets,
  deloadStatus,
  deloadSets,
  loadCap,
  weekKey,
  type HistoryRecord,
} from '../../src/domain/progression';
import type { WorkoutExercise } from '../../src/domain/programData';
import type { SetLogRecord } from '../../src/components/ExerciseCard';

const ex = (o: Partial<WorkoutExercise> = {}): WorkoutExercise => ({
  id: 't1_bb_squat',
  name: 'Barbell Back Squat',
  tier: 'T1',
  targetSets: 5,
  targetReps: '3',
  isAmrapLastSet: false,
  tempo: '30X1',
  restSeconds: 180,
  equipment: 'barbell',
  muscleGroups: ['Quadriceps'],
  biomechanicalRationale: '',
  progressionRule: '',
  ...o,
});

const sets = (w: number, reps: number[], notes: string[] = []): SetLogRecord[] =>
  reps.map((r, i) => ({ setNumber: i + 1, targetReps: '3', weightLbs: w, repsAchieved: r, isCompleted: true, notes: notes[i] || '' }));

const rec = (id: string, date: string, logs: Record<string, unknown>, extra: Partial<HistoryRecord> = {}): HistoryRecord => ({
  id,
  date,
  completedAt: date,
  sessionId: 'lower_a',
  logs,
  ...extra,
});

describe('last time', () => {
  it('finds the most recent record with completed sets for the exercise', () => {
    const h = [
      rec('a', '2026-10-01T18:00:00', { t1_bb_squat: sets(175, [3, 3, 3, 3, 3]) }),
      rec('b', '2026-10-08T18:00:00', { t1_bb_squat: sets(185, [3, 3, 3, 3, 3]) }),
      rec('c', '2026-10-10T18:00:00', { other: sets(50, [10]) }),
    ];
    const last = findLastPerformance('t1_bb_squat', h)!;
    expect(last.recordId).toBe('b');
    expect(last.sets[0].weightLbs).toBe(185);
  });

  it('ignores unticked sets, deloads when asked, and records at/after the cutoff', () => {
    const h = [
      rec('a', '2026-10-01T18:00:00', { t1_bb_squat: sets(185, [3, 3]) }),
      rec('d', '2026-10-08T18:00:00', { t1_bb_squat: sets(155, [3, 3]) }, { deload: true }),
      rec('e', '2026-10-09T18:00:00', { t1_bb_squat: [{ ...sets(200, [0])[0], isCompleted: false }] }),
    ];
    expect(findLastPerformance('t1_bb_squat', h)!.recordId).toBe('d');
    expect(findLastPerformance('t1_bb_squat', h, { skipDeload: true })!.recordId).toBe('a');
    expect(findLastPerformance('t1_bb_squat', h, { before: new Date('2026-10-08T00:00:00').getTime() })!.recordId).toBe('a');
  });

  it('split left/right logs fall back to the whole exercise', () => {
    const h = [rec('a', '2026-10-01T18:00:00', { t2_atg_split_squat: sets(25, [8, 8]) })];
    expect(findLastPerformance('t2_atg_split_squat__side_left', h)!.recordId).toBe('a');
  });

  it('tolerates malformed history', () => {
    const h = [rec('x', 'not a date', { t1_bb_squat: sets(1, [1]) }), rec('y', '2026-10-01', { t1_bb_squat: { weight: 5 } })];
    expect(findLastPerformance('t1_bb_squat', h)).toBeNull();
  });
});

describe('rep targets and tags', () => {
  it('parses ranges, single targets and timed holds', () => {
    expect(repRange('8-10')).toEqual({ min: 8, max: 10 });
    expect(repRange('6–8 / leg')).toEqual({ min: 6, max: 8 });
    expect(repRange('3')).toEqual({ min: 3, max: 3 });
    expect(repRange('20 Effective Reps')).toEqual({ min: 20, max: 20 });
    expect(repRange('30s')).toBeNull();
    expect(repRange('45 sec hold')).toBeNull();
    expect(repRange('40m')).toBeNull();
    expect(repRange('10 reps (5s hold)')).toEqual({ min: 10, max: 10 });
    expect(repRange('10-12 (3s hold)')).toEqual({ min: 10, max: 12 });
    expect(repRange('40 feet / side')).toBeNull();
    expect(repRange('3 rounds')).toBeNull();
    expect(repRange('20-30s hold')).toBeNull();
  });
  it('reads RPE and the worst knee pain from notes', () => {
    expect(readSetTags('@RPE 8 · Knee Pain 2/10 · Pain 3/10')).toEqual({ rpe: 8, kneePain: 3, painNote: null });
    expect(readSetTags('')).toEqual({ rpe: 0, kneePain: 0, painNote: null });
  });
});

describe('next load', () => {
  const last = (w: number, reps: number[], notes: string[] = []) => ({ recordId: 'r1', date: '2026-10-08', deload: false, sets: sets(w, reps, notes) });

  it('adds 10 lb to a barbell lower-body lift when every set hit the top of the range', () => {
    const s = suggestNextLoad(ex(), last(185, [3, 3, 3, 3, 3], ['@RPE 8']))!;
    expect(s).toMatchObject({ weightLbs: 195, change: 'increase', previousWeightLbs: 185, basisRecordId: 'r1' });
  });

  it('adds 5 lb to an upper-body barbell lift', () => {
    expect(suggestNextLoad(ex({ name: 'Barbell Bench Press' }), last(135, [3, 3, 3, 3, 3]))!.weightLbs).toBe(140);
  });

  it('moves a kettlebell to the next Bowflex 840 notch, and holds at the top notch', () => {
    const kb = ex({ equipment: 'kettlebell', name: 'Kettlebell Row', targetReps: '8-10', targetSets: 3 });
    expect(suggestNextLoad(kb, last(25, [10, 10, 10]))!.weightLbs).toBe(35);
    const top = suggestNextLoad(kb, last(40, [10, 10, 10]))!;
    expect(top).toMatchObject({ weightLbs: 40, change: 'hold' });
  });

  it('holds while reps are still climbing in the range', () => {
    const s = suggestNextLoad(ex({ targetReps: '8-10', targetSets: 3, name: 'Bench' }), last(135, [10, 9, 8]))!;
    expect(s).toMatchObject({ weightLbs: 135, change: 'hold' });
    expect(s.reason).toMatch(/10 reps/);
  });

  it('holds after an RPE 9.5+ grind even if every rep was made', () => {
    expect(suggestNextLoad(ex(), last(185, [3, 3, 3, 3, 3], ['', '', '', '', '@RPE 10']))!.change).toBe('hold');
  });

  it('holds when fewer sets than planned were done', () => {
    expect(suggestNextLoad(ex(), last(185, [3, 3, 3]))!.change).toBe('hold');
  });

  it('backs off after missing the bottom of the range on most sets', () => {
    const s = suggestNextLoad(ex(), last(200, [3, 2, 2, 1, 2]))!;
    expect(s.change).toBe('decrease');
    expect(s.weightLbs).toBe(180);
  });

  it('backs off for knee pain 4/10 or worse, whatever the reps', () => {
    const s = suggestNextLoad(ex(), last(185, [3, 3, 3, 3, 3], ['Knee Pain 4/10']))!;
    expect(s).toMatchObject({ change: 'decrease', weightLbs: 165 });
  });

  it('respects a load cap in the progression rule', () => {
    const jc = ex({ equipment: 'kettlebell', name: 'Jefferson Curl', targetReps: '8', targetSets: 2, progressionRule: 'Strictly capped at 8-12 lbs on the Bowflex kettlebell' });
    expect(loadCap(jc)).toBe(12);
    expect(suggestNextLoad(jc, last(12, [8, 8]))).toMatchObject({ weightLbs: 12, change: 'hold' });
  });

  it('deload: ~85% load, rounded to equipment', () => {
    expect(suggestNextLoad(ex(), last(185, [3, 3]), { deload: true })).toMatchObject({ weightLbs: 155, change: 'deload' });
    const kb = ex({ equipment: 'kettlebell', name: 'Kettlebell Row' });
    expect(suggestNextLoad(kb, last(35, [8]), { deload: true })!.weightLbs).toBe(25);
    expect(deloadSets(5)).toBe(3);
    expect(deloadSets(1)).toBe(1);
  });

  it('nothing to suggest for bodyweight work, timed holds, or no history', () => {
    expect(suggestNextLoad(ex({ equipment: 'bodyweight' }), last(0, [10]))).toBeNull();
    expect(suggestNextLoad(ex({ targetReps: '30s' }), last(25, [1]))).toBeNull();
    expect(suggestNextLoad(ex(), null)).toBeNull();
  });
});

describe('resizeSets', () => {
  const base = sets(185, [3, 3, 3, 3, 3]).map((s) => ({ ...s, isCompleted: false, repsAchieved: 0 }));
  it('trims and extends, copying the last weight', () => {
    expect(resizeSets(base, 3, '3')).toHaveLength(3);
    const grown = resizeSets(base.slice(0, 3), 5, '3');
    expect(grown.map((s) => s.setNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(grown[4]).toMatchObject({ weightLbs: 185, isCompleted: false });
    expect(resizeSets(base, 5, '3')).toBe(base);
  });
});

describe('planned deloads', () => {
  // Monday 2026-11-09; weeks start on Mondays
  const now = new Date(2026, 10, 9, 9, 0);
  const workouts = (weekMondays: Date[], perWeek = 3, extra: Partial<HistoryRecord> = {}) =>
    weekMondays.flatMap((m, wi) =>
      Array.from({ length: perWeek }, (_, i) => rec(`w${wi}_${i}`, new Date(m.getFullYear(), m.getMonth(), m.getDate() + i, 18).toISOString(), {}, extra))
    );
  const mondaysBefore = (n: number) => Array.from({ length: n }, (_, i) => new Date(2026, 10, 9 - 7 * (i + 1)));

  it('the 5th week after 4 building weeks is a deload', () => {
    const s = deloadStatus(workouts(mondaysBefore(4)), now);
    expect(s).toMatchObject({ isDeloadWeek: true, blockWeek: 5, weeksUntilDeload: 0 });
  });

  it('counts down before that', () => {
    expect(deloadStatus(workouts(mondaysBefore(2)), now)).toMatchObject({ isDeloadWeek: false, blockWeek: 3, weeksUntilDeload: 2 });
    expect(deloadStatus([], now)).toMatchObject({ isDeloadWeek: false, blockWeek: 1 });
  });

  it('a week off resets the block (a vacation is a deload)', () => {
    const m = mondaysBefore(6);
    const h = workouts([m[0], m[1], m[3], m[4], m[5]]); // m[2] (3 weeks ago) had no training
    expect(deloadStatus(h, now)).toMatchObject({ isDeloadWeek: false, blockWeek: 3 });
  });

  it('a finished deload week resets the block', () => {
    const m = mondaysBefore(6);
    const h = [...workouts([m[0], m[1]]), ...workouts([m[2]], 3, { deload: true }), ...workouts([m[3], m[4], m[5]])];
    expect(deloadStatus(h, now).blockWeek).toBe(3);
  });

  it('a one-workout week neither builds nor breaks the block', () => {
    const m = mondaysBefore(5);
    const h = [...workouts([m[0], m[1], m[3], m[4]]), ...workouts([m[2]], 1)];
    expect(deloadStatus(h, now)).toMatchObject({ isDeloadWeek: true, blockWeek: 5 });
  });

  it('postponing skips this week only', () => {
    const h = workouts(mondaysBefore(4));
    const s = deloadStatus(h, now, { postponedWeekKey: weekKey(now) });
    expect(s).toMatchObject({ isDeloadWeek: false, postponed: true });
    const nextWeek = new Date(2026, 10, 16, 9);
    const h2 = [...h, ...workouts([new Date(2026, 10, 9)])];
    expect(deloadStatus(h2, nextWeek, { postponedWeekKey: weekKey(now) }).isDeloadWeek).toBe(true);
  });

  it('this week\'s own workouts never flip the status mid-week, and non-lifting sessions can be ignored', () => {
    const h = [...workouts(mondaysBefore(4)), rec('today', new Date(2026, 10, 9, 8).toISOString(), {})];
    expect(deloadStatus(h, now).isDeloadWeek).toBe(true);
    const runs = workouts(mondaysBefore(4)).map((r) => ({ ...r, sessionId: 'run_conditioning' }));
    expect(deloadStatus(runs, now, { isLifting: (id) => id !== 'run_conditioning' }).blockWeek).toBe(1);
  });
});
