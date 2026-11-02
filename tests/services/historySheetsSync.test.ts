// tests/services/historySheetsSync.test.ts
// Workouts must only reach (and come back from) Google Sheets as workouts that really happened.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  buildSyncPayload,
  importSheetWorkouts,
  pushWorkoutsToSheets,
  STORAGE_KEY_LAST_SCANNED_WORKOUT,
} from '../../src/services/sheetSyncService';
import { removeSheetCopiesOnce } from '../../src/services/historyRepair';
import { storageManager } from '../../src/storage/storageManager';
import { SESSION_LOWER_A, SESSION_UPPER_A } from '../../src/domain/programData';

const sq = SESSION_LOWER_A.exercises[0];
const bench = SESSION_UPPER_A.exercises[0];
const set = (done: boolean, weight = 185, reps = 3) => ({ setNumber: 1, targetReps: '3', weightLbs: weight, repsAchieved: done ? reps : 0, isCompleted: done, notes: '' });

describe('sync to Google Sheets', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('never turns live set logs into workout rows (they hold every session, mostly not done)', () => {
    const payload = buildSyncPayload('lower_a', {
      [sq.id]: [set(true), set(false)],
      [bench.id]: [set(false, 165)],
    });
    expect(payload.workoutLogs).toEqual([]);
  });

  it('writes a finished workout with its own date, only the sets that were done', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true }) }));
    vi.stubGlobal('fetch', fetchMock);
    const at = new Date(2026, 9, 20, 18, 30).toISOString();
    await pushWorkoutsToSheets([
      { id: 'w1', date: at, completedAt: at, sessionId: 'lower_a', sessionTitle: 'Lower A', logs: { [sq.id]: [set(true), { ...set(false), setNumber: 2 }] } } as any,
    ]);
    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    expect(body.replace).toEqual([{ date: '2026-10-20', session: 'Lower A' }]);
    expect(body.workoutLogs).toHaveLength(1);
    expect(body.workoutLogs[0]).toMatchObject({ date: '2026-10-20', session: 'Lower A', setNumber: 1, reps: 3 });
  });
});

describe('import from Google Sheets', () => {
  beforeEach(() => {
    localStorage.clear();
    storageManager.clear();
  });

  it('skips a workout this device already has for that session and day', () => {
    const at = new Date(2026, 9, 20, 18, 30).toISOString();
    storageManager.saveCompletedWorkout({ id: 'completed_lower_a_1', date: at, completedAt: at, sessionId: 'lower_a', logs: {} });
    const added = importSheetWorkouts([
      { date: '2026-10-20', sessionTitle: 'Lower A', sessionId: 'lower_a', logs: {} },
      { date: '2026-10-22', sessionTitle: 'Upper A', sessionId: 'upper_a', logs: {} },
    ]);
    expect(added).toBe(1);
    expect(Object.values(storageManager.getCompletedWorkouts())).toHaveLength(2);
  });

  it('keeps a sheet date on its own local day (not the day before)', () => {
    importSheetWorkouts([{ date: '2026-10-22', sessionTitle: 'Upper A', sessionId: 'upper_a', logs: {} }]);
    const w = Object.values(storageManager.getCompletedWorkouts())[0];
    const d = new Date(w.date);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 22]);
  });
});

describe('one-time history repair', () => {
  beforeEach(() => {
    localStorage.clear();
    storageManager.clear();
  });

  it('removes the copies that came from the sheet, once, and keeps workouts the app recorded', () => {
    const at = new Date(2026, 9, 20, 18, 30).toISOString();
    storageManager.saveCompletedWorkout({ id: 'completed_lower_a_1', date: at, sessionId: 'lower_a', logs: {} });
    storageManager.saveCompletedWorkout({ id: 'sheet_2026-11-01_upper_a', date: '2026-11-01', sessionId: 'upper_a', logs: {} });
    storageManager.saveCompletedWorkout({ id: 'sheet_2026-11-01_lower_b', date: '2026-11-01', sessionId: 'lower_b', logs: {} });
    localStorage.setItem(STORAGE_KEY_LAST_SCANNED_WORKOUT, '{"lastWorkout":{"sessionId":"lower_b","date":"2026-11-01"}}');

    expect(removeSheetCopiesOnce()).toBe(2);
    expect(Object.keys(storageManager.getCompletedWorkouts())).toEqual(['completed_lower_a_1']);
    expect(localStorage.getItem(STORAGE_KEY_LAST_SCANNED_WORKOUT)).toBeNull();

    // later imports (from the repaired sheet) are kept
    storageManager.saveCompletedWorkout({ id: 'sheet_2026-11-05_upper_a', date: '2026-11-05', sessionId: 'upper_a', logs: {} });
    expect(removeSheetCopiesOnce()).toBe(0);
    expect(Object.keys(storageManager.getCompletedWorkouts())).toHaveLength(2);
  });
});
