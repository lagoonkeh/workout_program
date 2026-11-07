import { describe, it, expect } from 'vitest';
// @ts-expect-error plain JS serverless module
import { workoutsFromLifeDashboard, deletedWorkoutIds, mergeWorkouts, workoutToRow, rowToWorkout } from '../../api/_healthWorkouts.js';
import { interpretWorkout, withoutAppDuplicates, intensityOf, type HealthWorkout } from '../../src/domain/healthWorkouts';
import { calculateMuscleHeatmap } from '../../src/domain/muscleHeatmap';

const hrSamples = (startIso: string, minutes: number, bpm: number) =>
  Array.from({ length: minutes }, (_, i) => ({ bpm, time: new Date(Date.parse(startIso) + i * 60000).toISOString(), uuid: `hr#${i}` }));

const bjjPayload = {
  source: 'health_connect',
  timezone: 'America/Los_Angeles',
  exercise: [
    { type: '31', name: 'martial_arts', title: 'BJJ', start_time: '2026-11-07T02:00:00Z', end_time: '2026-11-07T03:30:00Z', duration_seconds: 5400, uuid: 'bjj-1', source: 'com.google.android.apps.fitness' },
  ],
  heart_rate: [...hrSamples('2026-11-07T02:00:00Z', 90, 146), { bpm: 60, time: '2026-11-07T05:00:00Z' }],
};

describe('Health Connect workouts: webhook parsing (api/_healthWorkouts.js)', () => {
  it('reads sessions with local date, minutes, activity, title and in-session heart rate', () => {
    const [w] = workoutsFromLifeDashboard(bjjPayload);
    expect(w).toMatchObject({ uuid: 'bjj-1', date: '2026-11-06', minutes: 90, activity: 'martial_arts', title: 'BJJ', avgHr: 146, maxHr: 146 });
  });

  it('keeps recorded sets but drops rests', () => {
    const [w] = workoutsFromLifeDashboard({
      source: 'health_connect',
      exercise: [{ type: '70', name: 'strength_training', start_time: '2026-11-05T18:00:00Z', end_time: '2026-11-05T18:40:00Z', uuid: 's1',
        segments: [{ type: '51', repetitions: 5 }, { type: '44' }, { type: '5', repetitions: 8 }] }],
    });
    expect(w.sets).toEqual([{ type: '51', reps: 5 }, { type: '5', reps: 8 }]);
  });

  it('ignores other payloads and reads exercise deletions', () => {
    expect(workoutsFromLifeDashboard({ source: 'screen_time' })).toEqual([]);
    expect(deletedWorkoutIds({ deleted_records: [{ type: 'exercise', uuid: 'x' }, { type: 'nutrition', uuid: 'y' }] })).toEqual(['x']);
  });

  it('merges by uuid, keeps earlier heart rate, removes deleted sessions, and round-trips the sheet row', () => {
    const [w] = workoutsFromLifeDashboard(bjjPayload);
    const later = { ...w, avgHr: null, maxHr: null, minutes: 92 };
    const merged = mergeWorkouts([w], [later], [], 'T');
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ minutes: 92, avgHr: 146 });
    expect(mergeWorkouts(merged, [], ['bjj-1'])).toEqual([]);
    const back = rowToWorkout(workoutToRow(merged[0]).map((v: unknown) => (v === '' ? '' : String(v))));
    expect(back).toMatchObject({ uuid: 'bjj-1', minutes: 92, avgHr: 146, activity: 'martial_arts', title: 'BJJ' });
  });
});

const bjj: HealthWorkout = {
  uuid: 'bjj-1', date: '2026-11-06', start: '2026-11-07T02:00:00Z', end: '2026-11-07T03:30:00Z', minutes: 90,
  activity: 'martial_arts', title: 'BJJ', avgHr: 146,
};

describe('Health Connect workouts: interpretation', () => {
  it('turns a hard 90-minute BJJ class into load on core, grip and back', () => {
    const it = interpretWorkout(bjj);
    expect(it.intensity).toBe('hard');
    expect(it.trained.slice(0, 2).sort()).toEqual(['biceps', 'core']);
    expect(it.trained).toContain('lats');
    expect(it.trained).not.toContain('chest');
    expect(it.sets.core).toBeCloseTo(1.5 * 9 * 1 * 1.25, 1);
    expect(it.summary).toContain('BJJ (Martial arts / BJJ) 90 min · hard (avg 146 bpm)');
  });

  it('uses recorded sets when the recording app wrote them', () => {
    const it = interpretWorkout({ ...bjj, uuid: 's', activity: 'strength_training', title: '', sets: [{ type: '51', reps: 5 }, { type: '51', reps: 5 }, { type: '5', reps: 8 }] });
    expect(it.fromRecordedSets).toBe(true);
    expect(it.sets).toMatchObject({ quads: 2, glutes: 2, chest: 1, triceps: 1 });
  });

  it('does not count a short walk as training a muscle', () => {
    const it = interpretWorkout({ ...bjj, activity: 'walking', title: '', minutes: 25, avgHr: 95 });
    expect(it.trained).toEqual([]);
  });

  it('bands intensity by average heart rate', () => {
    expect(intensityOf(null).band).toBe('unknown');
    expect(intensityOf(95).band).toBe('light');
    expect(intensityOf(120).band).toBe('moderate');
    expect(intensityOf(160).band).toBe('very hard');
  });

  it('skips a watch-recorded lift that is the same as a workout logged in the app', () => {
    const lift: HealthWorkout = { ...bjj, uuid: 'lift', activity: 'strength_training', start: '2026-11-05T18:00:00Z', end: '2026-11-05T19:00:00Z' };
    const appDone = [Date.parse('2026-11-05T19:05:00Z')];
    expect(withoutAppDuplicates([lift, bjj], appDone).map((w) => w.uuid)).toEqual(['bjj-1']);
    expect(withoutAppDuplicates([lift], [Date.parse('2026-11-03T19:05:00Z')])).toHaveLength(1);
  });
});

describe('muscle heatmap with outside workouts', () => {
  const now = new Date('2026-11-07T19:00:00Z');

  it('updates Last Trained and recovery from a BJJ class', () => {
    const before = calculateMuscleHeatmap([], {}, now);
    expect(before.core.lastTrainedDate).toBeNull();
    const after = calculateMuscleHeatmap([], {}, now, [bjj]);
    expect(after.core.lastTrainedDate).not.toBeNull();
    expect(after.core.hoursElapsed).toBe(15);
    expect(after.core.status).toBe('fatigued');
    expect(after.core.recentExercises).toContain('BJJ (Martial arts / BJJ) (Health Connect)');
    expect(after.core.setsLast7Days).toBeGreaterThan(0);
    expect(after.chest.lastTrainedDate).toBeNull();
  });

  it('ignores workouts in the future and duplicates of app workouts', () => {
    const future = { ...bjj, uuid: 'f', start: '2026-11-08T02:00:00Z', end: '2026-11-08T03:00:00Z' };
    expect(calculateMuscleHeatmap([], {}, now, [future]).core.lastTrainedDate).toBeNull();
  });
});
