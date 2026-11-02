// tests/e2e/workout_duration_tracking.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';
import { STORAGE_KEY_SESSION_START_TIMES } from '../../src/storage/appStorageKeys';

describe('Workout Duration & Timestamp Tracking', () => {
  beforeEach(() => {
    localStorage.clear();
    storageManager.clearCompletedWorkouts();
  });

  it('records first completed task timestamp in storage and saves startedAt, completedAt, and duration upon completion', async () => {
    render(<App />);

    // Initially no start times recorded
    expect(localStorage.getItem(STORAGE_KEY_SESSION_START_TIMES)).toBeNull();

    // Find and complete the first set on the first exercise
    const doneButtons = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
    expect(doneButtons.length).toBeGreaterThan(0);

    // Check off the first set (marks first task complete)
    fireEvent.click(doneButtons[0]);

    // Verify start time was recorded for 'lower_a'
    const storedTimesJson = localStorage.getItem(STORAGE_KEY_SESSION_START_TIMES);
    expect(storedTimesJson).not.toBeNull();
    const parsedTimes = JSON.parse(storedTimesJson!);
    expect(parsedTimes['lower_a']).toBeDefined();
    const recordedStartTime = parsedTimes['lower_a'];
    expect(new Date(recordedStartTime).getTime()).toBeGreaterThan(0);

    // Click "Mark Workout as Completed"
    const markCompletedBtn = screen.getByTestId('mark-workout-completed-btn');
    expect(markCompletedBtn).toBeInTheDocument();
    fireEvent.click(markCompletedBtn);

    // Confirm completion in modal
    const confirmBtn = screen.getByTestId('confirm-completion-adjustments-btn');
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

    // Verify completed workout session in storageManager
    const completedWorkouts = storageManager.getCompletedWorkouts();
    const sessionList = Object.values(completedWorkouts);
    expect(sessionList.length).toBeGreaterThan(0);

    const completedSession = sessionList[0];
    expect(completedSession.sessionId).toBe('lower_a');
    expect(completedSession.startedAt).toBe(recordedStartTime);
    expect(completedSession.completedAt).toBeDefined();
    expect(completedSession.totalDurationSeconds).toBeGreaterThanOrEqual(0);

    // Verify session start time was cleared from sessionStartTimes in localStorage
    const updatedTimes = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION_START_TIMES) || '{}');
    expect(updatedTimes['lower_a']).toBeUndefined();
  });
});
