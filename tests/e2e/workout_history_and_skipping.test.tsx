// tests/e2e/workout_history_and_skipping.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';

describe('Workout History & Exercise Skipping End-to-End Workflows', () => {
  beforeEach(() => {
    localStorage.clear();
    storageManager.clear();
    storageManager.clearCompletedWorkouts();
    storageManager.saveProgramAdaptations({});
    vi.clearAllMocks();
  });

  it('allows athlete to mark an exercise as skipped with a typed reason directly from the exercise card', async () => {
    render(<App />);

    // Locate ATG Split Squat exercise card
    const atgCard = document.getElementById('exercise-card-t2_atg_split_squat');
    expect(atgCard).toBeInTheDocument();

    // Click "Skip Exercise" button on card
    const skipBtn = screen.getByTestId('skip-exercise-btn-t2_atg_split_squat');
    expect(skipBtn).toBeInTheDocument();
    fireEvent.click(skipBtn);

    // Skip modal opens
    const modal = screen.getByTestId('skip-exercise-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('ATG Split Squat')).toBeInTheDocument();

    // Type a specific free-text reason
    const reasonInput = screen.getByTestId('skip-reason-input');
    fireEvent.change(reasonInput, {
      target: { value: 'Patellar tendon pinching on deep split' },
    });

    // Confirm skip
    const confirmBtn = screen.getByTestId('confirm-skip-exercise-btn');
    fireEvent.click(confirmBtn);

    // Modal closes
    expect(screen.queryByTestId('skip-exercise-modal')).not.toBeInTheDocument();

    // The card is now collapsed with a Skipped badge
    const skippedBadge = screen.getByTestId('collapsed-skipped-badge');
    expect(skippedBadge).toBeInTheDocument();
    expect(skippedBadge).toHaveTextContent('Skipped: Patellar tendon pinching on deep split');

    // The skip button now reflects Skipped state
    const updatedSkipBtn = screen.getByTestId('skip-exercise-btn-t2_atg_split_squat');
    expect(updatedSkipBtn).toHaveTextContent('Skipped');
  });

  it('allows athlete to unskip an exercise and restore sets', async () => {
    render(<App />);

    // Skip Tibialis Wall Raise
    const skipBtn = screen.getByTestId('skip-exercise-btn-t3_tibialis_wall_raise');
    fireEvent.click(skipBtn);

    // Select "Ran out of time" preset chip
    const timeChip = screen.getByTestId('skip-preset-time');
    fireEvent.click(timeChip);

    const confirmBtn = screen.getByTestId('confirm-skip-exercise-btn');
    fireEvent.click(confirmBtn);

    // Card shows Skipped
    expect(screen.getByTestId('collapsed-skipped-badge')).toHaveTextContent('Skipped: Ran out of time');

    // Open modal again to unskip
    const editSkipBtn = screen.getByTestId('skip-exercise-btn-t3_tibialis_wall_raise');
    fireEvent.click(editSkipBtn);

    // Click "Unskip & Restore Sets"
    const unskipBtn = screen.getByTestId('unskip-exercise-btn');
    fireEvent.click(unskipBtn);

    // Card returns to active unskipped state
    expect(screen.queryByTestId('collapsed-skipped-badge')).not.toBeInTheDocument();
  });

  it('records completed workouts with skipped reasons into history, and allows editing out / deleting past sessions', async () => {
    render(<App />);

    // Skip Single-Leg Patrick Step-Downs with an equipment reason
    const skipStepDownBtn = screen.getByTestId('skip-exercise-btn-t3_patrick_step_down');
    fireEvent.click(skipStepDownBtn);

    const equipChip = screen.getByTestId('skip-preset-equipment');
    fireEvent.click(equipChip);

    const confirmSkipBtn = screen.getByTestId('confirm-skip-exercise-btn');
    fireEvent.click(confirmSkipBtn);

    // Mark active session completed (triggers WorkoutCompletionModal since step downs skipped)
    const completeSessionBtn = screen.getByTestId('mark-workout-completed-btn');
    fireEvent.click(completeSessionBtn);

    expect(screen.getByTestId('workout-completion-modal')).toBeInTheDocument();

    // Complete session with adjustments
    const applyBtn = screen.getByTestId('confirm-completion-adjustments-btn');
    fireEvent.click(applyBtn);

    // Completed workout session is now persisted in history
    const completedHistory = storageManager.getCompletedWorkouts();
    const sessionKeys = Object.keys(completedHistory);
    expect(sessionKeys.length).toBeGreaterThan(0);

    const recorded = completedHistory[sessionKeys[0]];
    expect(recorded.sessionId).toBe('lower_a');
    expect(recorded.skippedExercises?.some((s) => s.exerciseId === 't3_patrick_step_down')).toBe(true);

    // Open Workout History Modal from Header
    const historyBtn = screen.getByTestId('open-workout-history-btn');
    fireEvent.click(historyBtn);

    expect(screen.getByTestId('workout-history-modal')).toBeInTheDocument();
    expect(screen.getByText('Workout History & Log Editor')).toBeInTheDocument();
    expect(screen.getByTestId('history-session-card-lower_a')).toBeInTheDocument();

    // Verify skipped tag displays the typed/selected reason
    const skippedTag = screen.getByTestId('history-skipped-tag-t3_patrick_step_down');
    expect(skippedTag).toBeInTheDocument();
    expect(skippedTag).toHaveTextContent('Equipment occupied/unavailable');

    // Athlete "Edits Out / Deletes" this past session
    const deleteBtn = screen.getByTestId('delete-workout-btn-lower_a');
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId('confirm-delete-dialog')).toBeInTheDocument();

    // Confirm deletion
    const confirmDeleteBtn = screen.getByTestId('confirm-delete-workout-btn-lower_a');
    fireEvent.click(confirmDeleteBtn);

    // Session is deleted from history
    expect(screen.queryByTestId('history-session-card-lower_a')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-history-state')).toBeInTheDocument();
    expect(Object.keys(storageManager.getCompletedWorkouts()).length).toBe(0);
  });
});
