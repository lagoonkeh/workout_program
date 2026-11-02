// tests/domain/sessionReset.test.ts
import { clearSessionMarks, sessionHasMarks } from '../../src/domain/sessionReset';

const session = {
  exercises: [{ id: 'squat' }, { id: 'lunge' }],
  dailyCoreFinisher: [{ id: 'plank' }],
  warmupSequence: [{ id: 'hip_drill' }],
};
const other = { exercises: [{ id: 'bench' }], warmupSequence: [{ id: 'hip_drill_two' }] };

const set = (done: boolean, w = 135) => ({
  setNumber: 1, targetReps: '5', weightLbs: w, repsAchieved: done ? 5 : 0, isCompleted: done,
  notes: done ? 'Workout Completed' : '', loggedAt: done ? '2026-11-01T10:00:00Z' : undefined,
});

const marks = {
  logs: {
    squat: [set(true, 225), set(true, 225)],
    lunge__side_left: [set(true, 40)],
    plank: [set(true, 0)],
    bench: [set(true, 185)],
  },
  warmups: { hip_drill: true, hip_drill_two: true },
  phases: { hip_drill_phase_0: true, squat_phase_1: true, hip_drill_two_phase_0: true },
};

describe('sessionReset', () => {
  it('unchecks every set, warmup and phase task in the finished session', () => {
    const out = clearSessionMarks(session, marks);
    expect(sessionHasMarks(session, out)).toBe(false);
    expect(out.logs.squat.every((s) => !s.isCompleted && s.repsAchieved === 0 && s.notes === '')).toBe(true);
    expect(out.logs.lunge__side_left[0].isCompleted).toBe(false);
    expect(out.logs.plank[0].isCompleted).toBe(false);
    expect(out.warmups.hip_drill).toBeUndefined();
    expect(out.phases.hip_drill_phase_0).toBeUndefined();
    expect(out.phases.squat_phase_1).toBeUndefined();
  });

  it('keeps the logged weights for next time', () => {
    const out = clearSessionMarks(session, marks);
    expect(out.logs.squat.map((s) => s.weightLbs)).toEqual([225, 225]);
  });

  it('leaves other sessions untouched, even with similar ids', () => {
    const out = clearSessionMarks(session, marks);
    expect(out.logs.bench[0].isCompleted).toBe(true);
    expect(out.warmups.hip_drill_two).toBe(true);
    expect(out.phases.hip_drill_two_phase_0).toBe(true);
    expect(sessionHasMarks(other, out)).toBe(true);
  });
});
