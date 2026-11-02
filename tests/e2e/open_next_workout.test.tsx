// tests/e2e/open_next_workout.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';
import { STORAGE_KEY_SESSION, STORAGE_KEY_SESSION_START_TIMES } from '../../src/storage/appStorageKeys';
import { STORAGE_KEY_LAST_SCANNED_WORKOUT } from '../../src/services/sheetSyncService';
import { lastFinishedRotationWorkout, nextInRotation, sessionToOpen } from '../../src/domain/nextSession';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const finish = (sessionId: string, at: string) =>
  storageManager.saveCompletedWorkout({ id: `w_${sessionId}_${at}`, date: at, completedAt: at, sessionId, logs: {} });
const openedSession = () => {
  render(<App />);
  const id = localStorage.getItem(STORAGE_KEY_SESSION);
  cleanup();
  return id;
};

describe('rotation logic', () => {
  const known = (id: string) => ['lower_a', 'upper_a', 'lower_b', 'upper_b', 'run_conditioning'].includes(id);

  it('cycles Lower A → Upper A → Lower B → Upper B → Lower A', () => {
    expect(['lower_a', 'upper_a', 'lower_b', 'upper_b'].map(nextInRotation)).toEqual(['upper_a', 'lower_b', 'upper_b', 'lower_a']);
  });

  it('ignores recovery sessions and picks the latest rotation workout from any source', () => {
    const last = lastFinishedRotationWorkout([
      { sessionId: 'lower_a', date: hoursAgo(72) },
      { sessionId: 'run_conditioning', date: hoursAgo(1) },
      { sessionId: 'upper_a', date: '2000-01-01' },
    ]);
    expect(last?.sessionId).toBe('lower_a');
  });

  it('resumes a recently started workout, but not one abandoned days ago', () => {
    const finished = [{ sessionId: 'lower_a', date: hoursAgo(30) }];
    expect(sessionToOpen({ finished, startTimes: { lower_b: hoursAgo(1) }, isKnownSession: known })).toBe('lower_b');
    expect(sessionToOpen({ finished, startTimes: { lower_b: hoursAgo(50) }, isKnownSession: known })).toBe('upper_a');
    expect(sessionToOpen({ finished: [], startTimes: {}, isKnownSession: known })).toBeNull();
  });
});

describe('refreshing the app', () => {
  beforeEach(() => {
    localStorage.clear();
    storageManager.clear();
  });

  it('opens the workout after the last one finished, even if another was left open', () => {
    finish('lower_a', hoursAgo(50));
    finish('upper_a', hoursAgo(26));
    storageManager.saveImmediate({ activeSessionId: 'lower_a' });
    localStorage.setItem(STORAGE_KEY_SESSION, 'lower_a');
    expect(openedSession()).toBe('lower_b');
  });

  it('picks up a newer workout recorded in Google Sheets (another device)', () => {
    // this device has already done the one-time history repair, so the cached sheet result is trusted
    localStorage.setItem('workout_history_local_repair_v1', 'done');
    finish('upper_a', hoursAgo(50));
    localStorage.setItem(
      STORAGE_KEY_LAST_SCANNED_WORKOUT,
      JSON.stringify({ lastWorkout: { sessionId: 'lower_b', date: hoursAgo(5) }, suggestedNextSession: { id: 'upper_b' } })
    );
    expect(openedSession()).toBe('upper_b');
  });

  it('stays on a workout that is in progress', () => {
    finish('lower_a', hoursAgo(26));
    localStorage.setItem(STORAGE_KEY_SESSION_START_TIMES, JSON.stringify({ lower_b: hoursAgo(0.5) }));
    expect(openedSession()).toBe('lower_b');
  });

  it('keeps the last open session when there is no history yet', () => {
    storageManager.saveImmediate({ activeSessionId: 'upper_b' });
    expect(openedSession()).toBe('upper_b');
  });
});
