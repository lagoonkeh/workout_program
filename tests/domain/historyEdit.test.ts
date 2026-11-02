// tests/domain/historyEdit.test.ts
import {
  applyWorkoutEdit,
  buildSheetRowsForWorkout,
  exerciseDisplayName,
  getWhen,
  parseWorkoutDate,
} from '../../src/domain/historyEdit';
import { SESSION_LOWER_A } from '../../src/domain/programData';

const ex = SESSION_LOWER_A.exercises[0];
const base = {
  id: 'r1',
  date: '2026-10-25T21:00:00.000Z',
  startedAt: '2026-10-25T20:00:00.000Z',
  completedAt: '2026-10-25T21:00:00.000Z',
  totalDurationSeconds: 3600,
  sessionId: 'lower_a',
  sessionTitle: SESSION_LOWER_A.title,
  logs: {
    [ex.id]: [
      { isCompleted: true, weightLbs: 200, repsAchieved: 5, notes: '' },
      { isCompleted: false, weightLbs: 200, repsAchieved: 0, notes: '[NOT DONE] Skipped' },
    ],
  },
  skippedExercises: [{ exerciseId: ex.id, exerciseName: ex.name }],
  adherencePercentage: 0,
};

describe('historyEdit', () => {
  it('names exercises from the program, including split sides and keys pulled from Sheets', () => {
    expect(exerciseDisplayName(ex.id)).toBe(ex.name);
    expect(exerciseDisplayName(`${ex.id}__side_left`)).toBe(`${ex.name} (Left Side)`);
    const sheetKey = ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    expect(exerciseDisplayName(sheetKey)).toBe(ex.name);
  });

  it('recalculates volume, adherence and skipped exercises after an edit', () => {
    const logs = { [ex.id]: [base.logs[ex.id][0], { isCompleted: true, weightLbs: 210, repsAchieved: 5, notes: '' }] };
    const out = applyWorkoutEdit(base as any, logs);
    expect(out.totalVolumeLbs).toBe(200 * 5 + 210 * 5);
    expect(out.adherencePercentage).toBe(100);
    expect(out.skippedExercises).toEqual([]);
    expect(out.date).toBe(base.date); // date untouched when not edited
  });

  it('drops exercises whose sets were all removed and renumbers sets', () => {
    const out = applyWorkoutEdit(base as any, { [ex.id]: [base.logs[ex.id][1]], other: [] });
    expect(Object.keys(out.logs)).toEqual([ex.id]);
    expect((out.logs as any)[ex.id][0].setNumber).toBe(1);
  });

  it('moves the workout to a new date, start time and duration', () => {
    const out = applyWorkoutEdit(base as any, base.logs, { date: '2026-10-20', time: '06:30', durationMin: 75 });
    const start = new Date(out.startedAt!);
    expect([start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()]).toEqual([2026, 10, 20, 6, 30]);
    expect(out.totalDurationSeconds).toBe(75 * 60);
    expect(new Date(out.completedAt!).getTime() - start.getTime()).toBe(75 * 60 * 1000);
    expect(getWhen(out)).toEqual({ date: '2026-10-20', time: '06:30', durationMin: 75 });
  });

  it('reads a bare Sheets date as that local day', () => {
    const d = parseWorkoutDate('2026-10-28');
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 28]);
  });

  it('builds Google Sheets rows for the logged sets only', () => {
    const { rows, session } = buildSheetRowsForWorkout(base as any);
    expect(session).toBe(SESSION_LOWER_A.title);
    expect(rows).toHaveLength(1); // set 2 wasn't done, so it isn't sent
    expect(rows[0]).toMatchObject({ exerciseName: ex.name, setNumber: 1, weight: 200, reps: 5 });
  });
});
