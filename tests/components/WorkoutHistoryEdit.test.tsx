// tests/components/WorkoutHistoryEdit.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkoutHistoryModal } from '../../src/components/WorkoutHistoryModal';
import { storageManager } from '../../src/storage/storageManager';
import { SESSION_LOWER_A } from '../../src/domain/programData';

const ex = SESSION_LOWER_A.exercises[0];

describe('Editing an old workout', () => {
  beforeEach(() => {
    storageManager.clearCompletedWorkouts();
    storageManager.saveCompletedWorkout({
      id: 'old_1',
      date: '2026-10-25T21:00:00.000Z',
      startedAt: '2026-10-25T20:00:00.000Z',
      completedAt: '2026-10-25T21:00:00.000Z',
      totalDurationSeconds: 3600,
      sessionId: 'lower_a',
      sessionTitle: SESSION_LOWER_A.title,
      totalVolumeLbs: 1000,
      logs: { [ex.id]: [{ isCompleted: true, weightLbs: 200, repsAchieved: 5, notes: '' }] },
    });
  });

  it('changes the date and sets, adds and removes sets, and recalculates the totals', () => {
    const onUpdated = vi.fn();
    render(<WorkoutHistoryModal isOpen onClose={vi.fn()} onSessionUpdated={onUpdated} />);
    fireEvent.click(screen.getByTestId('edit-logs-btn-lower_a'));

    // readable exercise name, not the raw id
    expect(screen.getAllByText(ex.name).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Workout date'), { target: { value: '2026-10-22' } });
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '07:15' } });
    fireEvent.change(screen.getByLabelText('Duration in minutes'), { target: { value: '50' } });

    // add two sets (copies the last set), then remove one
    fireEvent.click(screen.getByTestId(`add-set-btn-${ex.id}`));
    fireEvent.click(screen.getByTestId(`add-set-btn-${ex.id}`));
    fireEvent.change(screen.getByLabelText('Set 2 weight'), { target: { value: '220' } });
    fireEvent.click(screen.getByLabelText('Remove set 3'));

    // add a missed exercise
    const second = SESSION_LOWER_A.exercises[1];
    fireEvent.change(screen.getByTestId('add-exercise-select'), { target: { value: second.id } });
    fireEvent.change(screen.getAllByLabelText('Set 1 reps')[1], { target: { value: '8' } });

    fireEvent.click(screen.getByTestId('save-logs-bottom-btn-lower_a'));

    const saved = storageManager.getCompletedWorkouts()['old_1'] as any;
    expect(saved.logs[ex.id]).toHaveLength(2);
    expect(saved.logs[ex.id][1].weightLbs).toBe(220);
    expect(saved.logs[second.id][0].repsAchieved).toBe(8);
    const start = new Date(saved.startedAt);
    expect([start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()]).toEqual([10, 22, 7, 15]);
    expect(saved.totalDurationSeconds).toBe(3000);
    const secondWeight = second.defaultWeightLbs || second.defaultWeight || 0;
    expect(saved.totalVolumeLbs).toBe(200 * 5 + 220 * 5 + secondWeight * 8);
    expect(onUpdated).toHaveBeenCalled();
  });

  it('cancelling leaves the workout unchanged', () => {
    render(<WorkoutHistoryModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('edit-logs-btn-lower_a'));
    fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '999' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[0]);
    expect((storageManager.getCompletedWorkouts()['old_1'] as any).logs[ex.id][0].weightLbs).toBe(200);
  });
});
