import { describe, it, expect } from 'vitest';
import { readSetTags, suggestNextLoad, type LastPerformance } from '../../src/domain/progression';
import { increaseGate, gateReason } from '../../src/domain/trainingReadiness';
import { WORKOUT_PROGRAM } from '../../src/domain/programData';
import type { SetLogRecord } from '../../src/components/ExerciseCard';

const set = (n: number, w: number, reps: number, notes = ''): SetLogRecord => ({
  setNumber: n, targetReps: '3', weightLbs: w, repsAchieved: reps, isCompleted: true, notes,
});
const perf = (sets: SetLogRecord[]): LastPerformance => ({ recordId: 'r1', date: '2026-11-03', deload: false, sets });
const rdl = WORKOUT_PROGRAM.lower_b.exercises.find((e) => e.id === 't1_bb_rdl')!;
const bench = WORKOUT_PROGRAM.upper_a.exercises.find((e) => e.id === 't1_bb_bench_press')!;

describe('pain written in notes', () => {
  it('reads your RDL note as back pain, and ignores pain-free notes', () => {
    expect(readSetTags('I experienced lower back pain just above the left hip · @RPE 8 · Tight Hamstrings').painNote).toBe('lower back');
    expect(readSetTags('Shoulder hurts at the bottom').painNote).toBe('shoulder');
    expect(readSetTags('No back pain today · @RPE 7').painNote).toBeNull();
    expect(readSetTags('Knee Pain 2/10').painNote).toBeNull();
    expect(readSetTags('Tight Hamstrings').painNote).toBeNull();
  });

  it('holds the RDL at 165 instead of adding 10 lb after the back-pain note', () => {
    const last = perf([set(1, 165, 3, '@RPE 7'), set(2, 165, 3), set(3, 165, 3), set(4, 165, 3), set(5, 165, 5, 'I experienced lower back pain just above the left hip · @RPE 8')]);
    const s = suggestNextLoad(rdl, last)!;
    expect(s.change).toBe('hold');
    expect(s.weightLbs).toBe(165);
    expect(s.readinessHold).toBe(true);
    expect(s.reason).toMatch(/lower back pain/);
  });

  it('still adds weight when there was no pain', () => {
    const last = perf([1, 2, 3, 4, 5].map((n) => set(n, 165, 3, '@RPE 7')));
    expect(suggestNextLoad(rdl, last)!.weightLbs).toBe(175);
  });

  it('brings the bench down to 150 after missing reps at 165 (your Nov 3 session)', () => {
    const last = perf([set(1, 165, 2, '@RPE 9'), set(2, 165, 3), set(3, 165, 3), set(4, 165, 2, '@RPE 9'), set(5, 165, 2)]);
    const s = suggestNextLoad(bench, last)!;
    expect(s.change).toBe('decrease');
    expect(s.weightLbs).toBe(150);
  });
});

describe('recovery holds back increases', () => {
  const now = new Date(2026, 10, 7, 12, 0);
  const days = (sleep: number) => [{ date: '2026-11-07', sleepHours: sleep }];

  it('holds after a short night, a raised resting HR, a hard outside session or a cautious check-in', () => {
    expect(increaseGate(now, days(5), [], []).reasons).toEqual(['5.0 h of sleep last night']);
    expect(increaseGate(now, days(7.5), [], []).hold).toBe(false);
    const rhr = [60, 60, 61, 59, 60].map((r, i) => ({ date: `2026-11-0${i + 2}`, restingHr: r })).concat([{ date: '2026-11-07', restingHr: 67 }]);
    expect(increaseGate(now, rhr, [], []).reasons[0]).toMatch(/resting HR \+/);
    const bjj = { uuid: 'b', date: '2026-11-06', start: new Date(2026, 10, 6, 19).toISOString(), end: new Date(2026, 10, 6, 20, 30).toISOString(), minutes: 90, activity: 'martial_arts', title: 'BJJ', avgHr: 146 };
    expect(increaseGate(now, [], [bjj], []).reasons[0]).toMatch(/hard bjj/i);
    const walk = { ...bjj, uuid: 'w', activity: 'walking', title: '', minutes: 20, avgHr: 85 };
    expect(increaseGate(now, [], [walk], []).hold).toBe(false);
    expect(increaseGate(now, [], [], [{ date: '2026-11-07', statusTier: 'cautious' }]).reasons).toEqual(["today's check-in is Cautious"]);
  });

  it('turns an increase into a hold with the reason, but never blocks a decrease', () => {
    const reason = gateReason(increaseGate(now, days(5), [], []));
    const clean = perf([1, 2, 3, 4, 5].map((n) => set(n, 165, 3, '@RPE 7')));
    const held = suggestNextLoad(rdl, clean, { holdIncreasesReason: reason })!;
    expect(held).toMatchObject({ change: 'hold', weightLbs: 165, readinessHold: true });
    expect(held.reason).toBe('Held instead of adding weight: 5.0 h of sleep last night. Repeat 165 lb today');
    const missed = perf([set(1, 165, 2), set(2, 165, 2), set(3, 165, 3), set(4, 165, 2), set(5, 165, 1)]);
    expect(suggestNextLoad(bench, missed, { holdIncreasesReason: reason })!.change).toBe('decrease');
  });
});

describe('program loads match the Oct 21 baseline test', () => {
  it('starts bench, OHP and RDL at sustainable percentages and the RDL has no all-out set', () => {
    expect(bench.defaultWeightLbs).toBe(150); // ~77% of a 195 max
    expect(WORKOUT_PROGRAM.upper_b.exercises.find((e) => e.id === 't1_bb_ohp')!.defaultWeightLbs).toBe(95); // ~76% of 125
    expect(rdl.defaultWeightLbs).toBe(175);
    expect(rdl.isAmrapLastSet).toBe(false);
  });
});
