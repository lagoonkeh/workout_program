// tests/e2e/skipped_exercise_adjustments.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';
import { restTimerSingleton } from '../../src/timer/restTimerSingleton';

describe('Skipped Exercise Tracking & Future Workout Auto-Regulation (End-to-End)', { timeout: 15000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    restTimerSingleton.reset();
    storageManager.clear();
  });

  it('detects unperformed exercises and opens WorkoutCompletionModal when marking workout completed', () => {
    render(<App />);

    // Find the primary "Mark Workout as Completed" button
    const markCompleteBtn = screen.getByTestId('mark-workout-completed-btn');
    expect(markCompleteBtn).toBeInTheDocument();

    // Click "Mark Workout as Completed" before completing all sets
    fireEvent.click(markCompleteBtn);

    // Modal should be opened
    const modal = screen.getByTestId('workout-completion-modal');
    expect(modal).toBeInTheDocument();

    // Modal should inform athlete of skipped exercises
    expect(screen.getByText(/Session Wrap-Up & Future Adjustments/i)).toBeInTheDocument();
    expect(screen.getByTestId('skipped-exercises-alert')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-completion-adjustments-btn')).toBeInTheDocument();
    expect(screen.getByTestId('complete-without-adjustments-btn')).toBeInTheDocument();
  });

  it('allows athlete to resume workout from modal without applying adjustments', () => {
    render(<App />);

    const markCompleteBtn = screen.getByTestId('mark-workout-completed-btn');
    fireEvent.click(markCompleteBtn);

    expect(screen.getByTestId('workout-completion-modal')).toBeInTheDocument();

    // Click "Resume Workout" button
    const resumeBtn = screen.getByTestId('resume-workout-btn');
    fireEvent.click(resumeBtn);

    // Modal closes and athlete stays on Lower A
    expect(screen.queryByTestId('workout-completion-modal')).not.toBeInTheDocument();
    expect(screen.getByText(/Lower A:/i)).toBeInTheDocument();
  });

  it('applies future auto-regulations, annotates [NOT DONE], and updates subsequent sessions', async () => {
    render(<App />);

    // Complete the first exercise (Barbell Back Squat) by clicking its card completion button
    const completeSquatBtn = screen.getByRole('button', { name: /Mark entire exercise Barbell Back Squat as complete/i });
    fireEvent.click(completeSquatBtn);

    // Leave the remaining exercises incomplete (ATG Split Squat, Tibialis Wall Raises, etc.)
    const markCompleteBtn = screen.getByTestId('mark-workout-completed-btn');
    fireEvent.click(markCompleteBtn);

    // Verify modal is open
    expect(screen.getByTestId('workout-completion-modal')).toBeInTheDocument();

    // Verify ATG Split Squat and Tibialis are listed as skipped
    expect(screen.getAllByText(/ATG Split Squat/i).length).toBeGreaterThanOrEqual(1);

    // Click "Apply Adjustments & Complete"
    const applyBtn = screen.getByTestId('confirm-completion-adjustments-btn');
    fireEvent.click(applyBtn);

    // 1. Modal closes
    expect(screen.queryByTestId('workout-completion-modal')).not.toBeInTheDocument();

    // 2. Storage records skipped exercises history
    const skippedHistory = storageManager.getSkippedExercises();
    expect(skippedHistory.length).toBeGreaterThan(0);
    expect(skippedHistory.some((s) => s.exerciseId === 't2_atg_split_squat')).toBe(true);

    // 3. Storage records future program adaptations
    const adaptations = storageManager.getProgramAdaptations();
    expect(adaptations['t2_atg_split_squat']).toBeDefined();
    expect(adaptations['t2_atg_split_squat'].targetSets).toBe(2); // Reduced from 3 to 2 sets
    expect(adaptations['t2_atg_split_squat'].priorityBadge).toContain('High Priority');
    expect(adaptations['t2_atg_split_squat'].missedLastSession).toBe(true);

    // 4. App advances to Upper A session
    expect(screen.getAllByText(/Horizontal Push\/Pull/i).length).toBeGreaterThanOrEqual(1);

    // 5. Navigate back to Lower A to verify the priority banner and auto-regulated 2 sets render
    const lowerABtn = screen.getAllByRole('button', { name: /Lower A/i })[0];
    fireEvent.click(lowerABtn);

    // Verify priority banner is visible for ATG Split Squat
    const priorityBanners = screen.getAllByTestId('missed-exercise-priority-banner');
    expect(priorityBanners.length).toBeGreaterThanOrEqual(1);
    expect(priorityBanners[0]).toHaveTextContent(/High Priority/i);
    expect(priorityBanners[0]).toHaveTextContent(/2 Sets/i);
  });

  it('completes without adjustments when athlete selects "Complete Without Adjustments"', () => {
    render(<App />);

    const markCompleteBtn = screen.getByTestId('mark-workout-completed-btn');
    fireEvent.click(markCompleteBtn);

    const completeWithoutAdjBtn = screen.getByTestId('complete-without-adjustments-btn');
    fireEvent.click(completeWithoutAdjBtn);

    // Modal closes and advances to Upper A
    expect(screen.queryByTestId('workout-completion-modal')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Horizontal Push\/Pull/i).length).toBeGreaterThanOrEqual(1);

    // Skipped history was recorded
    const skippedHistory = storageManager.getSkippedExercises();
    expect(skippedHistory.length).toBeGreaterThan(0);

    // But programAdaptations was NOT populated with volume reductions
    const adaptations = storageManager.getProgramAdaptations();
    expect(Object.keys(adaptations).length).toBe(0);
  });
});
