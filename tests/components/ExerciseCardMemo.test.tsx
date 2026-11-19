// tests/components/ExerciseCardMemo.test.tsx
// ExerciseCard is wrapped in React.memo with a custom comparator. Every prop that changes what the card
// shows must make it re-render; this guards against props being left out of that comparator.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExerciseCard, SetLogRecord } from '../../src/components/ExerciseCard';
import { WorkoutExercise } from '../../src/domain/programData';

const exercise: WorkoutExercise = {
  id: 't2_kb_split_squat',
  name: 'Kettlebell Split Squat',
  tier: 'T2',
  targetSets: 3,
  targetReps: '8',
  isAmrapLastSet: false,
  tempo: '3010',
  restSeconds: 90,
  equipment: 'kettlebell',
  defaultWeight: 30,
  defaultWeightLbs: 30,
  muscleGroups: ['Quadriceps', 'Glutes'],
  biomechanicalRationale: 'Unilateral leg strength.',
  progressionRule: 'Add 5 lbs when all reps are hit.',
};

const logs: SetLogRecord[] = [1, 2, 3].map((n) => ({
  setNumber: n, targetReps: '8', weightLbs: 30, repsAchieved: 8, isCompleted: false, notes: '',
}));

describe('ExerciseCard memoization', () => {
  it('re-renders when only isSideSplitActive changes', () => {
    const handlers = {
      onUpdateSetLog: vi.fn(),
      onOpenCueCard: vi.fn(),
      onQuickStartRest: vi.fn(),
      onQuickStartTempo: vi.fn(),
      onToggleSplitSides: vi.fn(),
    };
    const { rerender } = render(
      <ExerciseCard exercise={exercise} logs={logs} defaultCollapsed={false} isSideSplitActive={false} {...handlers} />
    );
    expect(screen.getByTestId('split-sides-btn')).not.toHaveTextContent('Active');

    rerender(<ExerciseCard exercise={exercise} logs={logs} defaultCollapsed={false} isSideSplitActive {...handlers} />);
    expect(screen.getByTestId('split-sides-btn')).toHaveTextContent('Split L/R (Active)');
  });

  it('uses the latest onOpenCueCard handler after it changes', () => {
    const first = vi.fn();
    const second = vi.fn();
    const base = { onUpdateSetLog: vi.fn(), onQuickStartRest: vi.fn(), onQuickStartTempo: vi.fn() };
    const { rerender } = render(
      <ExerciseCard exercise={exercise} logs={logs} defaultCollapsed={false} onOpenCueCard={first} {...base} />
    );
    rerender(<ExerciseCard exercise={exercise} logs={logs} defaultCollapsed={false} onOpenCueCard={second} {...base} />);
    const cueButtons = screen.getAllByRole('button', { name: /cue/i });
    cueButtons[0].click();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });
});

describe('areExerciseCardPropsEqual', () => {
  it('treats identical props as equal and any changed prop as different', async () => {
    const { areExerciseCardPropsEqual } = await import('../../src/components/ExerciseCard');
    const props = {
      exercise, logs, onUpdateSetLog: vi.fn(), onOpenCueCard: vi.fn(), onQuickStartRest: vi.fn(), onQuickStartTempo: vi.fn(),
    };
    expect(areExerciseCardPropsEqual(props, { ...props })).toBe(true);
    expect(areExerciseCardPropsEqual(props, { ...props, onQuickStartRest: vi.fn() })).toBe(false);
    expect(areExerciseCardPropsEqual(props, { ...props, isSideSplitActive: true })).toBe(false);
  });
});
