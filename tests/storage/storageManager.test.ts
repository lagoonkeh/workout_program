// tests/storage/storageManager.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StorageManager } from '../../src/storage/storageManager';

describe('StorageManager Persistence Engine', () => {
  let manager: StorageManager;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    manager = new StorageManager('test_storage_key');
  });

  afterEach(() => {
    manager.flush();
    vi.useRealTimers();
  });

  it('loads valid default schema v1 when localStorage is completely empty', () => {
    const data = manager.load();
    expect(data.version).toBe(1);
    expect(data.activeSessionId).toBe('lower_a');
    expect(data.mobilityHistory).toEqual([]);
    expect(data.currentLogs).toEqual({});
    expect(data.completedWorkouts).toEqual({});
    expect(data.settings.soundEnabled).toBe(true);
    expect(data.settings.defaultTimerPreset).toBe(90);
  });

  it('debounces successive save calls by 300ms', () => {
    manager.save({ activeSessionId: 'upper_a' });
    expect(localStorage.getItem('test_storage_key')).toBeNull(); // not yet flushed

    // Advance 200ms
    vi.advanceTimersByTime(200);
    expect(localStorage.getItem('test_storage_key')).toBeNull();

    // Make another change at 200ms (resets 300ms debounce)
    manager.save({ activeSessionId: 'lower_b' });
    vi.advanceTimersByTime(200);
    expect(localStorage.getItem('test_storage_key')).toBeNull();

    // Advance remaining 100ms (total 300ms from last call)
    vi.advanceTimersByTime(100);
    const stored = JSON.parse(localStorage.getItem('test_storage_key') || '{}');
    expect(stored.activeSessionId).toBe('lower_b');
  });

  it('saveImmediate bypasses debounce and persists synchronously', () => {
    manager.saveImmediate({ activeSessionId: 'upper_b' });
    const stored = JSON.parse(localStorage.getItem('test_storage_key') || '{}');
    expect(stored.activeSessionId).toBe('upper_b');
  });

  it('flushes pending debounced state when flush() is invoked', () => {
    manager.save({ activeSessionId: 'upper_a' });
    expect(localStorage.getItem('test_storage_key')).toBeNull();
    manager.flush();
    const stored = JSON.parse(localStorage.getItem('test_storage_key') || '{}');
    expect(stored.activeSessionId).toBe('upper_a');
  });

  it('recovers gracefully without throwing when corrupt non-JSON is in localStorage', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('corrupt_key', '{not a valid json syntax!!!');
    const corruptManager = new StorageManager('corrupt_key');
    const data = corruptManager.load();
    expect(data.version).toBe(1);
    expect(data.activeSessionId).toBe('lower_a');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('sanitizes malformed objects and replaces corrupted fields with defaults', () => {
    const malformed = {
      version: 99,
      activeSessionId: 12345, // invalid
      mobilityHistory: 'not an array', // invalid
      settings: null,
    };
    localStorage.setItem('malformed_key', JSON.stringify(malformed));
    const malformedManager = new StorageManager('malformed_key');
    const data = malformedManager.load();
    expect(data.version).toBe(1);
    expect(data.activeSessionId).toBe('lower_a');
    expect(Array.isArray(data.mobilityHistory)).toBe(true);
    expect(data.settings.soundEnabled).toBe(true);
  });

  it('persists and deletes mobility entries cleanly', () => {
    const entry = {
      testId: 'knee-to-wall' as const,
      value: 4.5,
      date: '2026-10-13T08:00:00.000Z',
      side: 'left' as const,
    };
    const saved = manager.addMobilityEntry(entry);
    expect(saved.mobilityHistory).toHaveLength(1);
    expect(saved.mobilityHistory[0].value).toBe(4.5);
    expect(saved.mobilityHistory[0].id).toBeDefined();

    const entryId = saved.mobilityHistory[0].id!;
    const afterDelete = manager.deleteMobilityEntry(entryId);
    expect(afterDelete.mobilityHistory).toHaveLength(0);
  });

  it('rejects invalid mobility entry insertion with an error', () => {
    expect(() => {
      manager.addMobilityEntry({
        testId: 'elephant-walk' as const,
        value: 10, // Invalid: elephant walk must be 1-5
      });
    }).toThrow(/Invalid mobility entry/);
  });

  it('exports and imports valid JSON backup data', () => {
    manager.saveImmediate({ activeSessionId: 'upper_b' });
    const jsonStr = manager.exportJSON();
    expect(jsonStr).toContain('upper_b');

    const newManager = new StorageManager('import_test_key');
    const result = newManager.importJSON(jsonStr);
    expect(result.success).toBe(true);
    expect(newManager.load().activeSessionId).toBe('upper_b');
  });

  it('rejects malformed JSON strings during import without destroying existing state', () => {
    manager.saveImmediate({ activeSessionId: 'lower_b' });
    const result = manager.importJSON('{ invalid json syntax');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/JSON Parse error/);
    expect(manager.load().activeSessionId).toBe('lower_b'); // untouched
  });

  it('notifies subscribers on state updates', () => {
    const subscriber = vi.fn();
    const unsubscribe = manager.subscribe(subscriber);

    manager.saveImmediate({ activeSessionId: 'upper_a' });
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ activeSessionId: 'upper_a' }));

    unsubscribe();
    manager.saveImmediate({ activeSessionId: 'upper_b' });
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('updates workout log entries correctly', () => {
    const res = manager.updateWorkoutLog('t1_bb_squat', {
      completed: true,
      weight: 225,
      reps: 3,
      notes: 'Strong RPE 8',
    });
    expect(res.currentLogs['t1_bb_squat']).toEqual({
      completed: true,
      weight: 225,
      reps: 3,
      notes: 'Strong RPE 8',
    });
  });

  it('persists, updates, and deletes completed workout sessions (History & Log Editor CRUD)', () => {
    const session = {
      id: 'session_test_lower_a',
      date: '2026-10-25T14:00:00.000Z',
      sessionId: 'lower_a' as const,
      sessionTitle: 'Lower A: Squat Focus',
      adherencePercentage: 100,
      totalVolumeLbs: 15200,
      logs: {
        t1_bb_squat: { completed: true, weight: 225, reps: 5, notes: 'Felt great' },
      },
    };

    // Save session
    manager.saveCompletedWorkout(session);
    const workouts = manager.getCompletedWorkouts();
    expect(workouts['session_test_lower_a']).toBeDefined();
    expect(workouts['session_test_lower_a'].totalVolumeLbs).toBe(15200);

    // Update session
    manager.updateCompletedWorkout('session_test_lower_a', {
      totalVolumeLbs: 16000,
      notes: 'Adjusted after review',
    });
    const updated = manager.getCompletedWorkouts()['session_test_lower_a'];
    expect(updated.totalVolumeLbs).toBe(16000);
    expect(updated.notes).toBe('Adjusted after review');

    // Delete session ("edit out workout")
    manager.deleteCompletedWorkout('session_test_lower_a');
    expect(manager.getCompletedWorkouts()['session_test_lower_a']).toBeUndefined();
  });

  it('clears storage state cleanly', () => {
    manager.saveImmediate({ activeSessionId: 'lower_b' });
    manager.clear();
    expect(manager.load().activeSessionId).toBe('lower_a');
  });
});
