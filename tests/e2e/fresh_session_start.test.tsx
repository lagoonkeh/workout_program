// tests/e2e/fresh_session_start.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';
import { STORAGE_KEY_LOGS, STORAGE_KEY_WARMUPS, STORAGE_KEY_PHASE_TASKS } from '../../src/storage/appStorageKeys';
import { SESSION_LOWER_A } from '../../src/domain/programData';

const fullLogs = () => {
  const logs: Record<string, any[]> = {};
  SESSION_LOWER_A.exercises.forEach((ex) => {
    logs[ex.id] = Array.from({ length: ex.targetSets }, (_, i) => ({
      isCompleted: true, repsAchieved: 5, weightLbs: 225, targetReps: '5', setNumber: i + 1, notes: 'Workout Completed',
    }));
  });
  return logs;
};

const finishedAt = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

const seed = (daysAgo: number) => {
  const drill = SESSION_LOWER_A.warmupSequence[0].id;
  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(fullLogs()));
  localStorage.setItem(STORAGE_KEY_WARMUPS, JSON.stringify({ [drill]: true }));
  localStorage.setItem(STORAGE_KEY_PHASE_TASKS, JSON.stringify({ [`${drill}_phase_0`]: true }));
  const at = finishedAt(daysAgo);
  storageManager.saveCompletedWorkout({
    id: 'completed_lower_a_seed', date: at, startedAt: at, completedAt: at, totalDurationSeconds: 3600,
    sessionId: 'lower_a', sessionTitle: 'Lower A', logs: fullLogs(), adherencePercentage: 100,
    completedExercisesCount: SESSION_LOWER_A.exercises.length, totalExercisesCount: SESSION_LOWER_A.exercises.length,
    totalVolumeLbs: 0, skippedExercises: [],
  } as any);
  return drill;
};

describe('Each workout starts unmarked', () => {
  beforeEach(() => {
    localStorage.clear();
    storageManager.clear();
  });

  it('clears check-offs from a session finished on an earlier day, keeping weights', async () => {
    const drill = seed(2);
    render(<App />);
    await waitFor(() => {
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEY_LOGS) || '{}');
      const first = logs[SESSION_LOWER_A.exercises[0].id];
      expect(first.every((s: any) => !s.isCompleted && s.repsAchieved === 0)).toBe(true);
      expect(first.every((s: any) => s.weightLbs === 225)).toBe(true);
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_WARMUPS) || '{}')[drill]).toBeUndefined();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_PHASE_TASKS) || '{}')[`${drill}_phase_0`]).toBeUndefined();
    // the leftover 100% must not be logged again as a new workout
    expect(Object.values(storageManager.getCompletedWorkouts())).toHaveLength(1);
  });

  it("keeps today's finished workout marked so it can still be reviewed", async () => {
    seed(0);
    render(<App />);
    await new Promise((r) => setTimeout(r, 400));
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY_LOGS) || '{}');
    expect(logs[SESSION_LOWER_A.exercises[0].id].every((s: any) => s.isCompleted)).toBe(true);
  });
});
