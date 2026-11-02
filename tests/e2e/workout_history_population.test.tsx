// tests/e2e/workout_history_population.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';
import { STORAGE_KEY_LOGS } from '../../src/storage/appStorageKeys';
import { SESSION_LOWER_A } from '../../src/domain/programData';

describe('Workout History Population & Persistence Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    storageManager.clear();
  });

  it('automatically populates workout history when session reaches 100% completion', async () => {
    // Seed localStorage with all sets completed for Lower A (100% done)
    const fullLogs: Record<string, any[]> = {};
    SESSION_LOWER_A.exercises.forEach((ex) => {
      fullLogs[ex.id] = Array.from({ length: ex.targetSets }, (_, i) => ({
        isCompleted: true,
        repsAchieved: 5,
        weightLbs: 225,
        targetReps: '5',
        setNumber: i + 1,
        notes: 'Done',
      }));
    });
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(fullLogs));

    render(<App />);

    // Initially storageManager should auto-record the 100% completed workout
    await waitFor(() => {
      const history = storageManager.getCompletedWorkouts();
      const sessions = Object.values(history);
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].sessionId).toBe('lower_a');
      expect(sessions[0].adherencePercentage).toBe(100);
    });

    // Open Workout History Modal and verify it renders the completed session
    const openHistoryBtn = screen.getByTestId('open-workout-history-btn');
    fireEvent.click(openHistoryBtn);

    expect(screen.getByTestId('workout-history-modal')).toBeInTheDocument();
    expect(screen.getByTestId('history-session-card-lower_a')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-history-state')).not.toBeInTheDocument();
  });

  it('saves workout history and advances when clicking Complete & Save at 100% completion without resetting', async () => {
    // Seed with all sets completed
    const fullLogs: Record<string, any[]> = {};
    SESSION_LOWER_A.exercises.forEach((ex) => {
      fullLogs[ex.id] = Array.from({ length: ex.targetSets }, (_, i) => ({
        isCompleted: true,
        repsAchieved: 5,
        weightLbs: 225,
        targetReps: '5',
        setNumber: i + 1,
        notes: 'Done',
      }));
    });
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(fullLogs));

    render(<App />);

    const markCompleteBtn = screen.getByTestId('mark-workout-completed-btn');
    expect(markCompleteBtn).toHaveTextContent(/Complete & Save to History/i);

    // Clicking it should persist to history and advance to next session
    fireEvent.click(markCompleteBtn);

    const history = storageManager.getCompletedWorkouts();
    const sessions = Object.values(history);
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.some((s) => s.sessionId === 'lower_a')).toBe(true);

    // Should have advanced to upper_a
    expect(screen.getAllByText(/Upper A/i).length).toBeGreaterThan(0);
  });

  it('allows logging current active workout directly from empty history modal', async () => {
    render(<App />);

    // Complete set 1 on the first exercise
    const doneButtons = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
    fireEvent.click(doneButtons[0]);

    // Open history modal
    const openHistoryBtn = screen.getByTestId('open-workout-history-btn');
    fireEvent.click(openHistoryBtn);

    expect(screen.getByTestId('workout-history-modal')).toBeInTheDocument();

    // Find and click "Log Current Lower A to History" button
    const saveActiveBtn = screen.getByTestId('save-active-to-history-btn');
    expect(saveActiveBtn).toBeInTheDocument();
    fireEvent.click(saveActiveBtn);

    // History should now have populated the session
    const history = storageManager.getCompletedWorkouts();
    const sessions = Object.values(history);
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].sessionId).toBe('lower_a');

    // History modal should now show the session card
    expect(screen.getByTestId('history-session-card-lower_a')).toBeInTheDocument();
  });
});
