// tests/components/WorkoutHistoryModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkoutHistoryModal } from '../../src/components/WorkoutHistoryModal';
import { storageManager, CompletedWorkoutSession } from '../../src/storage/storageManager';

describe('WorkoutHistoryModal Component', () => {
  beforeEach(() => {
    storageManager.clearCompletedWorkouts();
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <WorkoutHistoryModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders empty history state when no completed workouts exist', () => {
    render(<WorkoutHistoryModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('workout-history-modal')).toBeInTheDocument();
    expect(screen.getByTestId('empty-history-state')).toHaveTextContent('No Completed Workouts Yet');
  });

  it('renders completed sessions list with adherence, tonnage, and skipped exercises', () => {
    const mockSession1: CompletedWorkoutSession = {
      id: 'session_lower_a_1',
      date: '2026-10-25T14:30:00.000Z',
      sessionId: 'lower_a',
      sessionTitle: 'Lower A: Squat Focus',
      adherencePercentage: 100,
      totalVolumeLbs: 14500,
      completedExercisesCount: 6,
      totalExercisesCount: 6,
      logs: {
        t1_bb_squat: [
          { isCompleted: true, weightLbs: 225, repsAchieved: 5, notes: 'Felt strong' },
        ],
      },
      skippedExercises: [],
    };

    const mockSession2: CompletedWorkoutSession = {
      id: 'session_upper_a_1',
      date: '2026-10-26T14:30:00.000Z',
      sessionId: 'upper_a',
      sessionTitle: 'Upper A: Bench Focus',
      adherencePercentage: 80,
      totalVolumeLbs: 11200,
      completedExercisesCount: 4,
      totalExercisesCount: 5,
      logs: {
        t1_bb_bench: [
          { isCompleted: true, weightLbs: 185, repsAchieved: 5, notes: '' },
        ],
        t3_face_pull: [
          { isCompleted: false, weightLbs: 0, repsAchieved: 0, notes: '[NOT DONE] Skipped: Ran out of time' },
        ],
      },
      skippedExercises: [
        { exerciseId: 't3_face_pull', exerciseName: 'Face Pull', reason: 'Ran out of time', targetSets: 3, skippedSets: 3 },
      ],
    };

    storageManager.saveCompletedWorkout(mockSession1);
    storageManager.saveCompletedWorkout(mockSession2);

    render(<WorkoutHistoryModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Lower A: Squat Focus')).toBeInTheDocument();
    expect(screen.getByText('Upper A: Bench Focus')).toBeInTheDocument();
    expect(screen.getByText('100% Adherence')).toBeInTheDocument();
    expect(screen.getByText('80% Adherence')).toBeInTheDocument();
    expect(screen.getByText('14,500 lbs')).toBeInTheDocument();
    expect(screen.getByText('11,200 lbs')).toBeInTheDocument();

    // Skipped exercise tag
    expect(screen.getByTestId('history-skipped-tag-t3_face_pull')).toHaveTextContent('Face Pull — "Ran out of time"');
  });

  it('filters sessions using category pills', () => {
    storageManager.saveCompletedWorkout({
      id: 's_lower_a',
      date: '2026-10-25T14:00:00.000Z',
      sessionId: 'lower_a',
      sessionTitle: 'Lower A',
      logs: {},
    });
    storageManager.saveCompletedWorkout({
      id: 's_upper_a',
      date: '2026-10-26T14:00:00.000Z',
      sessionId: 'upper_a',
      sessionTitle: 'Upper A',
      logs: {},
    });

    render(<WorkoutHistoryModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('history-session-card-lower_a')).toBeInTheDocument();
    expect(screen.getByTestId('history-session-card-upper_a')).toBeInTheDocument();

    // Filter to Lower A only
    fireEvent.click(screen.getByTestId('filter-history-lower_a'));
    expect(screen.getByTestId('history-session-card-lower_a')).toBeInTheDocument();
    expect(screen.queryByTestId('history-session-card-upper_a')).not.toBeInTheDocument();

    // Back to All
    fireEvent.click(screen.getByTestId('filter-history-all'));
    expect(screen.getByTestId('history-session-card-lower_a')).toBeInTheDocument();
    expect(screen.getByTestId('history-session-card-upper_a')).toBeInTheDocument();
  });

  it('allows athlete to edit out / delete a workout session with confirmation', () => {
    const handleUpdated = vi.fn();
    storageManager.saveCompletedWorkout({
      id: 'session_delete_me',
      date: '2026-10-25T14:00:00.000Z',
      sessionId: 'lower_a',
      sessionTitle: 'Accidental Duplicate Session',
      logs: {},
    });

    render(
      <WorkoutHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        onSessionUpdated={handleUpdated}
      />
    );

    expect(screen.getByText('Accidental Duplicate Session')).toBeInTheDocument();

    // Click delete trash button
    const deleteBtn = screen.getByTestId('delete-workout-btn-lower_a');
    fireEvent.click(deleteBtn);

    // Confirmation dialog appears
    expect(screen.getByTestId('confirm-delete-dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Out Workout Session?')).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByTestId('confirm-delete-workout-btn-lower_a');
    fireEvent.click(confirmBtn);

    // Session deleted from list & storage
    expect(screen.queryByText('Accidental Duplicate Session')).not.toBeInTheDocument();
    expect(storageManager.getCompletedWorkouts()['session_delete_me']).toBeUndefined();
    expect(handleUpdated).toHaveBeenCalled();
  });

  it('allows athlete to enter Edit Logs mode, update reps/weight, and save changes', () => {
    const handleUpdated = vi.fn();
    storageManager.saveCompletedWorkout({
      id: 'session_edit_logs',
      date: '2026-10-25T14:00:00.000Z',
      sessionId: 'lower_a',
      sessionTitle: 'Lower A: Leg Day',
      logs: {
        t1_bb_squat: [
          { isCompleted: true, weightLbs: 205, repsAchieved: 5, notes: 'Light set' },
        ],
      },
    });

    render(
      <WorkoutHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        onSessionUpdated={handleUpdated}
      />
    );

    // Click Edit Logs
    const editLogsBtn = screen.getByTestId('edit-logs-btn-lower_a');
    fireEvent.click(editLogsBtn);

    expect(screen.getByText('Editing Mode Active:')).toBeInTheDocument();

    // Modify weight input
    const weightInput = screen.getByLabelText('Set 1 weight');
    fireEvent.change(weightInput, { target: { value: '225' } });

    // Modify reps input
    const repsInput = screen.getByLabelText('Set 1 reps');
    fireEvent.change(repsInput, { target: { value: '6' } });

    // Save changes
    const saveBtn = screen.getByTestId('save-logs-btn-lower_a');
    fireEvent.click(saveBtn);

    // Storage is updated
    const saved = storageManager.getCompletedWorkouts()['session_edit_logs'];
    expect(saved.logs.t1_bb_squat[0].weightLbs).toBe(225);
    expect(saved.logs.t1_bb_squat[0].repsAchieved).toBe(6);
    expect(handleUpdated).toHaveBeenCalled();
  });

  it('allows clearing all workout history with confirmation', () => {
    storageManager.saveCompletedWorkout({
      id: 's1',
      date: '2026-10-25T14:00:00.000Z',
      sessionId: 'lower_a',
      sessionTitle: 'Session 1',
      logs: {},
    });

    render(<WorkoutHistoryModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Session 1')).toBeInTheDocument();

    // Click Clear History
    const clearBtn = screen.getByTestId('clear-all-history-btn');
    fireEvent.click(clearBtn);

    expect(screen.getByTestId('confirm-clear-dialog')).toBeInTheDocument();

    // Confirm clear all
    const confirmClearBtn = screen.getByTestId('confirm-clear-all-btn');
    fireEvent.click(confirmClearBtn);

    expect(screen.getByTestId('empty-history-state')).toBeInTheDocument();
    expect(Object.keys(storageManager.getCompletedWorkouts()).length).toBe(0);
  });

  it('renders start time, completed time, duration, and Google Calendar export link', () => {
    storageManager.saveCompletedWorkout({
      id: 'session_timed_1',
      date: '2026-11-01T15:00:00.000Z',
      startedAt: '2026-11-01T14:15:00.000Z',
      completedAt: '2026-11-01T15:00:00.000Z',
      totalDurationSeconds: 2700, // 45 minutes
      sessionId: 'lower_a',
      sessionTitle: 'Lower A: Squat Focus',
      adherencePercentage: 100,
      totalVolumeLbs: 12500,
      logs: {},
    });

    render(<WorkoutHistoryModal isOpen={true} onClose={vi.fn()} />);

    // Duration should be formatted as 45m
    expect(screen.getByText('(45m)')).toBeInTheDocument();

    // Google Calendar export link should be present with correct target and URL
    const calLink = screen.getByTestId('add-to-calendar-lower_a');
    expect(calLink).toBeInTheDocument();
    expect(calLink).toHaveAttribute('target', '_blank');
    expect(calLink.getAttribute('href')).toContain('calendar.google.com/calendar/render?action=TEMPLATE');
    expect(calLink.getAttribute('href')).toContain('Lower%20A%3A%20Squat%20Focus');
  });
});
